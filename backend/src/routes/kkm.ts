import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, roleGuard } from '../middleware/auth';
import {
  KkmResult,
  closeShift,
  discover,
  getKkmSettings,
  kkmMessage,
  openShift,
  printXReport,
  saveKkmSettings,
  sendReceipt,
} from '../kkm';

const router = Router();

router.use(authMiddleware, roleGuard('ADMIN', 'MANAGER', 'PHARMACIST'));

const SALES_LIMIT = 200;

// Продажи, которые прямо сейчас отправляются на ККМ: защита от двойного нажатия
const sending = new Set<number>();

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dayKey = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toResponse = (result: KkmResult, successMessage: string) => ({
  ok: result.status === 'SUCCESS',
  status: result.status,
  message: result.status === 'SUCCESS' ? successMessage : kkmMessage(result.status),
});

// GET /api/kkm/sales — последние продажи со статусом печати на ККМ
router.get('/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 2, 1), 31);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: daysAgo(days - 1) } },
      include: {
        items: { select: { customName: true, product: { select: { name: true } } } },
        user: { select: { fullName: true } },
        fiscalReceipts: { select: { status: true }, orderBy: { id: 'desc' } },
      },
      orderBy: { id: 'desc' },
      take: SALES_LIMIT,
    });

    res.json(sales.map(({ fiscalReceipts, ...sale }) => ({
      ...sale,
      // Напечатанный чек остаётся напечатанным, даже если позже была неудачная попытка
      fiscalStatus: fiscalReceipts.some(r => r.status === 'SUCCESS') ? 'SUCCESS' : fiscalReceipts[0]?.status ?? null,
    })));
  } catch (error) {
    console.error('Get KKM sales error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/kkm/sales/:id/send — напечатать чек продажи на ККМ
router.post('/sales/:id/send', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);

  if (sending.has(id)) {
    res.status(409).json({ error: 'Чек уже отправляется на ККМ' });
    return;
  }
  sending.add(id);

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true } } } },
        fiscalReceipts: { where: { status: 'SUCCESS' }, select: { id: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ error: 'Продажа не найдена' });
      return;
    }
    if (sale.fiscalReceipts.length > 0) {
      res.status(409).json({ error: 'Чек этой продажи уже напечатан на ККМ' });
      return;
    }

    const result = await sendReceipt(sale);

    if (result.status !== 'NOT_CONFIGURED') {
      await prisma.fiscalReceipt.create({
        data: { saleId: id, status: result.status, response: result.raw, userId: req.user!.id },
      });
    }

    res.json(toResponse(result, 'Чек напечатан'));
  } catch (error) {
    console.error('Send KKM receipt error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    sending.delete(id);
  }
});

// GET /api/kkm/report — суммы напечатанных чеков по дням и журнал отправок
router.get('/report', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [printed, attempts] = await Promise.all([
      prisma.fiscalReceipt.findMany({
        where: { status: 'SUCCESS', sale: { createdAt: { gte: daysAgo(19) } } },
        select: { saleId: true, sale: { select: { finalAmount: true, createdAt: true } } },
      }),
      prisma.fiscalReceipt.findMany({
        where: { createdAt: { gte: daysAgo(1) } },
        include: {
          sale: { select: { finalAmount: true, createdAt: true, user: { select: { fullName: true } } } },
        },
        orderBy: { id: 'desc' },
        take: SALES_LIMIT,
      }),
    ]);

    const seen = new Set<number>();
    const byDay = new Map<string, { date: string; total: number; checks: number }>();
    for (const receipt of printed) {
      if (seen.has(receipt.saleId)) continue;
      seen.add(receipt.saleId);

      const date = dayKey(receipt.sale.createdAt);
      const day = byDay.get(date) || { date, total: 0, checks: 0 };
      day.total += receipt.sale.finalAmount;
      day.checks += 1;
      byDay.set(date, day);
    }

    res.json({
      daily: Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date)),
      attempts,
    });
  } catch (error) {
    console.error('Get KKM report error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/kkm/shift/open — открыть смену
router.post('/shift/open', async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(toResponse(await openShift(req.user!.fullName), 'Смена открыта'));
});

// POST /api/kkm/shift/close — закрыть смену
router.post('/shift/close', async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(toResponse(await closeShift(req.user!.fullName), 'Смена закрыта'));
});

// POST /api/kkm/x-report — напечатать X-отчёт
router.post('/x-report', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(toResponse(await printXReport(), 'X-отчёт напечатан'));
});

// GET /api/kkm/settings — адрес ККМ и ставка НДС
router.get('/settings', (_req: AuthRequest, res: Response): void => {
  res.json(getKkmSettings());
});

// POST /api/kkm/discover — найти ККМ в локальной сети и запомнить её адрес
router.post('/discover', roleGuard('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = getKkmSettings();
    // Порт берём из формы: кассир мог поменять его, ещё не нажав «Сохранить»
    const port = Number(req.body?.port) || settings.port;

    const host = await discover(port);
    if (!host) {
      res.status(404).json({ error: 'ККМ не найдена. Проверьте, что принтер включён и подключён кабелем' });
      return;
    }

    const error = saveKkmSettings({ ...settings, host, port });
    if (error) {
      res.status(400).json({ error });
      return;
    }
    res.json(getKkmSettings());
  } catch (error) {
    console.error('Discover KKM error:', error);
    res.status(500).json({ error: 'Не удалось найти ККМ' });
  }
});

// PUT /api/kkm/settings — сохранить настройки ККМ
router.put('/settings', roleGuard('ADMIN'), (req: AuthRequest, res: Response): void => {
  try {
    const error = saveKkmSettings(req.body || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }
    res.json(getKkmSettings());
  } catch (error) {
    console.error('Save KKM settings error:', error);
    res.status(500).json({ error: 'Не удалось сохранить настройки ККМ' });
  }
});

export default router;
