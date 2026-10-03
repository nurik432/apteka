import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

// Клиент ККМ (фискального принтера): JSON по HTTP на http://<host>:<port>/api/...
// Настройки хранятся рядом с базой (файл не попадает в git), как .jwt-secret и .last-backup.
const SETTINGS_FILE = path.join(__dirname, '../../database/.kkm.json');

const REQUEST_TIMEOUT_MS = 20000;
const PROBE_TIMEOUT_MS = 400;
const PROBE_BATCH = 64;
const DISCOVERY_COOLDOWN_MS = 30000;
const FFD_VERSION = 'VER_1';

let lastDiscovery = 0;

const TAX_TYPE = 'SIMPLIFIED1';
const VAT_CODE = 'STANDARD';

export interface KkmSettings {
  host: string;
  port: number;
  vatPercent: number;
}

const DEFAULT_SETTINGS: KkmSettings = { host: '', port: 8002, vatPercent: 7 };

export function getKkmSettings(): KkmSettings {
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    // файла нет — ККМ ещё не настраивали
    return { ...DEFAULT_SETTINGS };
  }
}

/** Проверяет и сохраняет настройки; возвращает текст ошибки либо null */
export function saveKkmSettings(input: { host?: unknown; port?: unknown; vatPercent?: unknown }): string | null {
  const host = typeof input.host === 'string' ? input.host.trim() : '';
  const port = Number(input.port);
  const vatPercent = Number(input.vatPercent);

  if (host && !/^[a-zA-Z0-9.-]+$/.test(host)) return 'Укажите IP-адрес ККМ без http:// и порта';
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'Порт должен быть числом от 1 до 65535';
  if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) return 'НДС должен быть от 0 до 100 %';

  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ host, port, vatPercent }, null, 2));
  return null;
}

export interface KkmResult {
  /** SUCCESS либо код ошибки: значение rc из ответа ККМ, UNAVAILABLE, NOT_CONFIGURED, HTTP_<код> */
  status: string;
  /** Ответ ККМ как есть (для журнала) */
  raw: string;
}

const statusMessages: Record<string, string> = {
  SUCCESS: 'Выполнено',
  UNAVAILABLE: 'ККМ недоступна. Проверьте, что принтер включён и подключён к сети',
  NOT_CONFIGURED: 'Не указан адрес ККМ. Задайте его в разделе «Настройки»',
  SHIFT_MUST_BE_OPEN: 'Смена закрыта. Откройте смену',
  INVALID_DOC: 'ККМ отклонила документ',
};

export function kkmMessage(status: string): string {
  return statusMessages[status] || `Ответ ККМ: ${status}`;
}

async function send(host: string, port: number, endpoint: string, body: unknown): Promise<KkmResult> {
  let res: globalThis.Response;
  let raw: string;
  try {
    res = await fetch(`http://${host}:${port}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    raw = await res.text();
  } catch (error: any) {
    return { status: 'UNAVAILABLE', raw: String(error?.cause?.message || error?.message || error) };
  }

  let status = '';
  try {
    const json = JSON.parse(raw);
    if (json && typeof json.rc === 'string') status = json.rc;
  } catch {
    // ответ не JSON — разбираем как текст ниже
  }
  if (!status && raw.includes('SHIFT_MUST_BE_OPEN')) status = 'SHIFT_MUST_BE_OPEN';
  if (!status) status = res.ok ? 'SUCCESS' : `HTTP_${res.status}`;

  return { status, raw: raw.slice(0, 2000) };
}

/** Открыт ли порт: только TCP-соединение, ККМ ничего не печатает */
function probe(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const finish = (open: boolean) => { socket.destroy(); resolve(open); };
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/**
 * Ищет ККМ в своих подсетях /24. Адрес принтера выдаёт DHCP, и при перезапуске раздачи
 * он меняется — без поиска кассир каждый раз правил бы адрес в настройках руками.
 */
export async function discover(port: number): Promise<string | null> {
  const subnets = new Set<string>();
  const own = new Set<string>();
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      // 169.254.x — адрес, который Windows присваивает сама, когда DHCP не ответил: искать там нечего
      if (address.address.startsWith('169.254.')) continue;
      own.add(address.address);
      subnets.add(address.address.split('.').slice(0, 3).join('.'));
    }
  }

  for (const subnet of subnets) {
    const hosts = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`).filter(h => !own.has(h));
    // пачками, чтобы не открывать разом сотни сокетов
    for (let i = 0; i < hosts.length; i += PROBE_BATCH) {
      const batch = hosts.slice(i, i + PROBE_BATCH);
      const results = await Promise.all(batch.map(async host => (await probe(host, port)) ? host : null));
      const found = results.find(host => host !== null);
      if (found) return found;
    }
  }
  return null;
}

async function post(endpoint: string, body: unknown): Promise<KkmResult> {
  const settings = getKkmSettings();
  if (!settings.host) return { status: 'NOT_CONFIGURED', raw: '' };

  const result = await send(settings.host, settings.port, endpoint, body);
  if (result.status !== 'UNAVAILABLE') return result;

  // До ККМ не достучались. Возможно, сменился адрес — ищем её и запоминаем новый.
  // Поиск небыстрый, поэтому не чаще раза в DISCOVERY_COOLDOWN_MS.
  if (Date.now() - lastDiscovery < DISCOVERY_COOLDOWN_MS) return result;
  lastDiscovery = Date.now();

  const found = await discover(settings.port);
  // Тот же адрес — значит ККМ на месте, а не ответила по другой причине: повторять запрос нельзя,
  // чек мог уже напечататься. Повторяем только когда адрес действительно другой.
  if (!found || found === settings.host) return result;

  saveKkmSettings({ ...settings, host: found });
  console.log(`ККМ найдена по новому адресу: ${found}`);
  return send(found, settings.port, endpoint, body);
}

export function openShift(cashier: string): Promise<KkmResult> {
  return post('openShift', {
    formCode: 'OPEN_SHIFT',
    ffdVersion: FFD_VERSION,
    shouldPrintSlip: true,
    cashier,
    kktVersion: '1',
  });
}

export function closeShift(cashier: string): Promise<KkmResult> {
  return post('closeShift', {
    formCode: 'CLOSE_SHIFT',
    ffdVersion: FFD_VERSION,
    shouldPrintSlip: true,
    cashier,
    kktVersion: '1',
  });
}

export function printXReport(): Promise<KkmResult> {
  return post('getXReport', {
    formCode: 'GET_X_REPORT',
    ffdVersion: FFD_VERSION,
    shouldPrintSlip: true,
  });
}

interface ReceiptSale {
  totalAmount: number;
  finalAmount: number;
  items: {
    customName: string | null;
    quantity: number;
    total: number;
    product: { name: string } | null;
  }[];
}

/**
 * Собирает чек для ККМ. Суммы — в дирамах (целые числа).
 * Скидки (на позицию и на весь чек) у ККМ отдельным полем не передаются, поэтому они
 * уходят в цену: цена позиции = её сумма после всех скидок / количество.
 * Если сумма не делится на количество нацело, позиция печатается двумя строками
 * (часть штук на 1 дирам дороже), чтобы итог чека совпал с оплатой до дирама.
 */
export function buildReceipt(sale: ReceiptSale, vatPercent: number) {
  const items = sale.items.filter(item => item.quantity > 0);

  // Доля, оставшаяся после скидки на весь чек; распределяем её по позициям пропорционально
  const factor = sale.totalAmount > 0 ? sale.finalAmount / sale.totalAmount : 1;
  const sums = items.map(item => Math.round(item.total * factor * 100));

  // Остаток от округления долей относим на самую крупную позицию
  const rest = Math.round(sale.finalAmount * 100) - sums.reduce((a, b) => a + b, 0);
  if (rest !== 0 && sums.length > 0) sums[sums.indexOf(Math.max(...sums))] += rest;

  const products = items.flatMap((item, i) => {
    const quantity = Math.round(item.quantity * 1000) / 1000;
    const line = (qty: number, price: number) => ({
      code: null,
      name: item.customName || item.product?.name || 'Товар',
      price,
      quantity: qty,
      commodity: 'GOODS',
      vatCode: VAT_CODE,
      sum: Math.round(price * qty),
    });

    if (!Number.isInteger(quantity)) return [line(quantity, Math.round(sums[i] / quantity))];

    const price = Math.floor(sums[i] / quantity);
    const dearer = sums[i] - price * quantity; // столько штук идут на 1 дирам дороже
    return [line(quantity - dearer, price), line(dearer, price + 1)].filter(l => l.quantity > 0);
  });

  const receiptSum = products.reduce((total, product) => total + product.sum, 0);

  return {
    formCode: 'RECEIPT',
    ffdVersion: FFD_VERSION,
    shouldPrintSlip: true,
    operationType: 'INCOME',
    taxType: TAX_TYPE,
    products,
    receiptSum,
    taxes: {
      vats: [{ vatCode: VAT_CODE, vatSum: Math.round((receiptSum / 100) * vatPercent) }],
    },
  };
}

export function sendReceipt(sale: ReceiptSale): Promise<KkmResult> {
  return post('formReceipt', buildReceipt(sale, getKkmSettings().vatPercent));
}
