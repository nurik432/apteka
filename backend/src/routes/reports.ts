import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/reports/sales — продажи за период
router.get('/sales', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'day';
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    let startDate: Date;
    let endDate = new Date();

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo + 'T23:59:59');
    } else {
      startDate = new Date();
      switch (period) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }
    }

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true, category: { select: { name: true } } } } },
        },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Рассчитываем метрики
    const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalCash = sales.reduce((sum, s) => sum + (s.cashAmount || 0), 0);
    const totalCard = sales.reduce((sum, s) => sum + (s.cardAmount || 0), 0);
    const totalCost = sales.reduce((sum, s) => 
      sum + s.items.reduce((itemSum, item) => itemSum + (item.purchasePrice * item.quantity), 0), 0
    );
    const totalProfit = totalRevenue - totalCost;
    const totalChecks = sales.length;
    const averageCheck = totalChecks > 0 ? totalRevenue / totalChecks : 0;

    res.json({
      sales,
      summary: {
        totalRevenue,
        totalCash,
        totalCard,
        totalCost,
        totalProfit,
        totalChecks,
        averageCheck,
        period,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/reports/top-products — топ продаваемых товаров
router.get('/top-products', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const period = (req.query.period as string) || 'month';

    let startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: startDate } },
      },
      include: { product: { select: { name: true, sellingPrice: true } } },
    });

    // Группируем по товарам
    const productMap = new Map<number | string, { name: string; totalQuantity: number; totalRevenue: number }>();
    for (const item of saleItems) {
      const key = item.productId || 'custom';
      const existing = productMap.get(key);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.total;
      } else {
        productMap.set(key, {
          name: item.customName || item.product?.name || 'Неизвестный товар',
          totalQuantity: item.quantity,
          totalRevenue: item.total,
        });
      }
    }

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    res.json(topProducts);
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

