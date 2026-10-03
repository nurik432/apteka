import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, notifyError } from '@/lib/utils';
import { FileText, Lock, Printer, RefreshCw, Unlock } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'sales' | 'report' | 'shift';

interface KkmSale {
  id: number;
  createdAt: string;
  finalAmount: number;
  user?: { fullName: string };
  items: { customName: string | null; product: { name: string } | null }[];
  fiscalStatus: string | null;
}

interface KkmAttempt {
  id: number;
  saleId: number;
  status: string;
  createdAt: string;
  sale: { finalAmount: number; createdAt: string; user?: { fullName: string } };
}

interface KkmReport {
  daily: { date: string; total: number; checks: number }[];
  attempts: KkmAttempt[];
}

export interface KkmResponse {
  ok: boolean;
  status: string;
  message: string;
}

const statusLabels: Record<string, string> = {
  SUCCESS: 'Напечатан',
  UNAVAILABLE: 'ККМ недоступна',
  SHIFT_MUST_BE_OPEN: 'Смена закрыта',
  INVALID_DOC: 'Отклонён ККМ',
};

const cardStyle = { background: 'var(--color-card)', border: '1px solid var(--color-border)' };
const rowStyle = { borderBottom: '1px solid var(--color-border)' };
const thClass = 'px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge badge-neutral">Не отправлен</span>;
  return (
    <span className={`badge ${status === 'SUCCESS' ? 'status-green' : 'status-red'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function SkeletonRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-5">
        <div className="space-y-3"><div className="skeleton w-2/3" /><div className="skeleton w-full" /><div className="skeleton w-4/5" /></div>
      </td>
    </tr>
  );
}

export function notifyKkm(data: KkmResponse) {
  if (data.ok) toast.success(data.message);
  else toast.error(data.message, { id: data.message });
}

// SalesTab и ShiftTab используются и в окне «ККМ» на кассе (pos/components/KkmModal.tsx)
export function SalesTab() {
  const [sales, setSales] = useState<KkmSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/kkm/sales');
      setSales(res.data);
    } catch (err) { notifyError(err, 'Не удалось загрузить продажи'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const send = async (id: number) => {
    setSendingId(id);
    try {
      const res = await api.post<KkmResponse>(`/kkm/sales/${id}/send`);
      notifyKkm(res.data);
    } catch (err) { notifyError(err, 'Не удалось отправить чек на ККМ'); }
    await load();
    setSendingId(null);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={rowStyle}>
              <th className={`${thClass} text-left`}>№</th>
              <th className={`${thClass} text-left`}>Дата</th>
              <th className={`${thClass} text-left`}>Кассир</th>
              <th className={`${thClass} text-left`}>Товары</th>
              <th className={`${thClass} text-right`}>Сумма</th>
              <th className={`${thClass} text-left`}>Статус</th>
              <th className={`${thClass} text-right`}>ККМ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRow colSpan={7} />
            ) : sales.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><b>Нет продаж за последние два дня</b><p>Оформленные на кассе продажи появятся здесь.</p></div></td></tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} className="table-row-hover" style={rowStyle}>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">#{sale.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(sale.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{sale.user?.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground min-w-[200px] whitespace-normal break-words">
                    {sale.items.map(i => i.customName || i.product?.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(sale.finalAmount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={sale.fiscalStatus} /></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {sale.fiscalStatus !== 'SUCCESS' && (
                      <button type="button" className="btn btn-primary" disabled={sendingId !== null} onClick={() => send(sale.id)}>
                        <Printer className="w-4 h-4" />
                        {sendingId === sale.id ? 'Печать…' : 'Отправить'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportTab() {
  const [report, setReport] = useState<KkmReport | null>(null);

  useEffect(() => {
    api.get('/kkm/report')
      .then(res => setReport(res.data))
      .catch(err => notifyError(err, 'Не удалось загрузить отчёт ККМ'));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <h2 className="text-base font-bold px-4 pt-4 pb-1">Напечатано по дням</h2>
        <table className="w-full text-sm">
          <thead>
            <tr style={rowStyle}>
              <th className={`${thClass} text-left`}>Дата</th>
              <th className={`${thClass} text-right`}>Чеков</th>
              <th className={`${thClass} text-right`}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {!report ? (
              <SkeletonRow colSpan={3} />
            ) : report.daily.length === 0 ? (
              <tr><td colSpan={3}><div className="empty-state"><b>Нет напечатанных чеков</b><p>За последние 20 дней на ККМ ничего не печатали.</p></div></td></tr>
            ) : (
              report.daily.map(day => (
                <tr key={day.date} className="table-row-hover" style={rowStyle}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(`${day.date}T00:00:00`)}</td>
                  <td className="px-4 py-3 text-right num">{day.checks}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(day.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl overflow-hidden lg:col-span-2" style={cardStyle}>
        <h2 className="text-base font-bold px-4 pt-4 pb-1">Журнал отправок за два дня</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={rowStyle}>
                <th className={`${thClass} text-left`}>Чек</th>
                <th className={`${thClass} text-left`}>Отправлен</th>
                <th className={`${thClass} text-left`}>Кассир</th>
                <th className={`${thClass} text-right`}>Сумма</th>
                <th className={`${thClass} text-left`}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {!report ? (
                <SkeletonRow colSpan={5} />
              ) : report.attempts.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><b>Отправок не было</b><p>Отправьте чек на вкладке «Продажи».</p></div></td></tr>
              ) : (
                report.attempts.map(attempt => (
                  <tr key={attempt.id} className="table-row-hover" style={rowStyle}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">#{attempt.saleId}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(attempt.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{attempt.sale.user?.fullName}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(attempt.sale.finalAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={attempt.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ShiftTab() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (endpoint: string, fallback: string) => {
    setBusy(endpoint);
    try {
      const res = await api.post<KkmResponse>(endpoint);
      notifyKkm(res.data);
    } catch (err) { notifyError(err, fallback); }
    setBusy(null);
  };

  const closeShift = () => {
    if (!confirm('Закрыть смену на ККМ?')) return;
    run('/kkm/shift/close', 'Не удалось закрыть смену');
  };

  return (
    <div className="rounded-xl bg-card border p-[18px] flex flex-col gap-2.5 max-w-xl">
      <h2 className="text-base font-bold">Смена ККМ</h2>
      <p className="text-sm text-muted-foreground">
        Чеки печатаются только при открытой смене. Откройте её в начале рабочего дня и закройте в конце.
      </p>
      <div className="flex flex-wrap gap-3 mt-1">
        <button type="button" className="btn btn-primary btn-lg" disabled={busy !== null} onClick={() => run('/kkm/shift/open', 'Не удалось открыть смену')}>
          <Unlock className="w-[18px] h-[18px]" />
          {busy === '/kkm/shift/open' ? 'Открытие…' : 'Открыть смену'}
        </button>
        <button type="button" className="btn btn-danger btn-lg" disabled={busy !== null} onClick={closeShift}>
          <Lock className="w-[18px] h-[18px]" />
          {busy === '/kkm/shift/close' ? 'Закрытие…' : 'Закрыть смену'}
        </button>
        <button type="button" className="btn btn-secondary btn-lg" disabled={busy !== null} onClick={() => run('/kkm/x-report', 'Не удалось напечатать X-отчёт')}>
          <FileText className="w-[18px] h-[18px]" />
          {busy === '/kkm/x-report' ? 'Печать…' : 'X-отчёт'}
        </button>
      </div>
    </div>
  );
}

export default function KkmPage() {
  const [tab, setTab] = useState<Tab>('sales');
  const [configured, setConfigured] = useState(true);
  // Смена ключа перезагружает данные активной вкладки
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get('/kkm/settings')
      .then(res => setConfigured(!!res.data.host))
      .catch(err => notifyError(err, 'Не удалось загрузить настройки ККМ'));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: 'Продажи' },
    { key: 'report', label: 'Отчёт' },
    { key: 'shift', label: 'Смена' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight">ККМ</h1>
          <p className="text-muted-foreground text-[13px]">Печать чеков продаж на фискальном принтере</p>
        </div>
        {tab !== 'shift' && (
          <button type="button" className="btn btn-secondary" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
        )}
      </div>

      {!configured && (
        <div className="rounded-xl px-4 py-3 text-sm status-yellow">
          Адрес ККМ не задан. Администратор может указать его в разделе «Настройки».
        </div>
      )}

      <div className="seg w-fit">
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && <SalesTab key={refreshKey} />}
      {tab === 'report' && <ReportTab key={refreshKey} />}
      {tab === 'shift' && <ShiftTab />}
    </div>
  );
}
