import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

const MAX_RANGE_DAYS = 366;

// Ключ дня по местному времени (toISOString дал бы UTC и сдвинул ночные продажи на прошлый день)
const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDay = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
};

/**
 * Период из ?from=YYYY-MM-DD&to=YYYY-MM-DD (оба дня включительно, местное время).
 * Без параметров — последние defaultDays дней, включая сегодня.
 */
function parseRange(query: Record<string, unknown>, defaultDays: number):
  { start: Date; end: Date; days: number } | { error: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from = parseDay(query.from);
  let to = parseDay(query.to);
  if ((query.from && !from) || (query.to && !to)) return { error: 'Неверный формат даты (нужно ГГГГ-ММ-ДД)' };

  to = to ?? today;
  if (!from) {
    from = new Date(to);
    from.setDate(from.getDate() - (defaultDays - 1));
  }
  if (from > to) return { error: 'Дата начала позже даты окончания' };

  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  if (days > MAX_RANGE_DAYS) return { error: `Период не может быть больше ${MAX_RANGE_DAYS} дней` };

  const end = new Date(to);
  end.setDate(end.getDate() + 1); // конец не включительно
  return { start: from, end, days };
}

// GET /api/analytics/dashboard — все метрики для Dashboard
router.get('/dashboard', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Продажи сегодня
    const todaySales = await prisma.sale.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { items: true },
    });

    const todayRevenue = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
    const todayProfit = todaySales.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, item) => 
        itemSum + ((item.price - item.purchasePrice) * item.quantity) - item.discount, 0
      ), 0
    );
    const todayChecks = todaySales.length;

    // Продажи за месяц
    const monthSales = await prisma.sale.findMany({
      where: { createdAt: { gte: monthStart } },
      include: { items: true },
    });

    const monthRevenue = monthSales.reduce((sum, s) => sum + s.finalAmount, 0);
    const monthProfit = monthSales.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, item) =>
        itemSum + ((item.price - item.purchasePrice) * item.quantity) - item.discount, 0
      ), 0
    );
    const monthChecks = monthSales.length;

    // Общее количество товаров
    const totalProducts = await prisma.product.count();
    const lowStockProducts = await prisma.product.findMany({
      where: { stock: { gt: -1 } },
    });
    const lowStockCount = lowStockProducts.filter(p => p.stock <= p.minStock && p.minStock > 0).length;

    // Просроченные товары
    const expiredCount = await prisma.product.count({
      where: { expiryDate: { lt: now } },
    });

    res.json({
      todayRevenue,
      todayProfit,
      todayChecks,
      monthRevenue,
      monthProfit,
      monthChecks,
      totalProducts,
      lowStockCount,
      expiredCount,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/analytics/sales-by-day?from&to — продажи по дням (по умолчанию последние 30 дней)
router.get('/sales-by-day', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const range = parseRange(req.query, 30);
    if ('error' in range) {
      res.status(400).json({ error: range.error });
      return;
    }

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      include: { items: true },
    });

    // Группируем по дням
    const dayMap = new Map<string, { revenue: number; profit: number; checks: number }>();

    for (let i = 0; i < range.days; i++) {
      const date = new Date(range.start);
      date.setDate(date.getDate() + i);
      dayMap.set(localDayKey(date), { revenue: 0, profit: 0, checks: 0 });
    }

    for (const sale of sales) {
      const key = localDayKey(sale.createdAt);
      const existing = dayMap.get(key);
      if (existing) {
        existing.revenue += sale.finalAmount;
        existing.profit += sale.items.reduce((sum, item) =>
          sum + ((item.price - item.purchasePrice) * item.quantity) - item.discount, 0
        );
        existing.checks += 1;
      }
    }

    const result = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    res.json(result);
  } catch (error) {
    console.error('Sales by day error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/analytics/sales-by-month — продажи по месяцам (последние 12 месяцев)
router.get('/sales-by-month', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      include: { items: true },
    });

    const monthMap = new Map<string, { revenue: number; profit: number; checks: number }>();

    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { revenue: 0, profit: 0, checks: 0 });
    }

    for (const sale of sales) {
      const key = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.revenue += sale.finalAmount;
        existing.profit += sale.items.reduce((sum, item) =>
          sum + ((item.price - item.purchasePrice) * item.quantity) - item.discount, 0
        );
        existing.checks += 1;
      }
    }

    const result = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    res.json(result);
  } catch (error) {
    console.error('Sales by month error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/analytics/top-products?from&to — топ-10 товаров (по умолчанию за последний месяц)
router.get('/top-products', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let where: { gte: Date; lt?: Date };
    if (req.query.from || req.query.to) {
      const range = parseRange(req.query, 30);
      if ('error' in range) {
        res.status(400).json({ error: range.error });
        return;
      }
      where = { gte: range.start, lt: range.end };
    } else {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);
      where = { gte: monthStart };
    }

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: where },
      },
      include: { product: { select: { name: true } } },
    });

    const productMap = new Map<number | string, { name: string; quantity: number; revenue: number }>();
    for (const item of saleItems) {
      const key = item.productId || 'custom';
      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total;
      } else {
        productMap.set(key, {
          name: item.customName || item.product?.name || 'Неизвестный товар',
          quantity: item.quantity,
          revenue: item.total,
        });
      }
    }

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json(topProducts);
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/analytics/stock-by-category — остатки по категориям
router.get('/stock-by-category', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: { select: { stock: true, sellingPrice: true } },
      },
    });

    const result = categories.map(cat => ({
      name: cat.name,
      totalItems: cat.products.reduce((sum, p) => sum + p.stock, 0),
      totalValue: cat.products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0),
    })).filter(c => c.totalItems > 0)
      .sort((a, b) => b.totalValue - a.totalValue);

    res.json(result);
  } catch (error) {
    console.error('Stock by category error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

