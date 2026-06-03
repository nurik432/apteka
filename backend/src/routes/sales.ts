import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/sales — создание продажи
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, discount, paymentType, cashAmount, cardAmount } = req.body;
    // items: [{productId, quantity, price, discount}]

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Добавьте товары в чек' });
      return;
    }

    const sale = await prisma.$transaction(async (tx) => {
      // Проверяем наличие всех товаров
      for (const item of items) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Товар ID ${item.productId} не найден`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Недостаточно товара "${product.name}" на складе (осталось: ${product.stock})`);
        }
      }

      // Рассчитываем суммы
      let totalAmount = 0;
      const saleItems: any[] = [];

      for (const item of items) {
        let purchasePrice = 0;
        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) purchasePrice = product.purchasePrice;
        }
        
        const itemDiscount = item.discount || 0;
        const itemTotal = (item.price * item.quantity) - itemDiscount;
        totalAmount += itemTotal;

        saleItems.push({
          productId: item.productId || null,
          customName: item.name || null,
          quantity: item.quantity,
          price: item.price,
          purchasePrice,
          discount: itemDiscount,
          total: itemTotal,
        } as any);
      }

      const saleDiscount = discount || 0;
      const finalAmount = totalAmount - saleDiscount;

      let providedCash = parseFloat(cashAmount) || 0;
      let providedCard = parseFloat(cardAmount) || 0;

      // Backward compatibility if UI sends old format
      if (!providedCash && !providedCard) {
        if (paymentType === 'cash') providedCash = finalAmount;
        else if (paymentType === 'card') providedCard = finalAmount;
      }

      if (providedCash + providedCard < finalAmount - 0.01) {
        throw new Error('Внесенная сумма меньше итоговой суммы чека');
      }

      const appliedCard = Math.min(providedCard, finalAmount);
      const appliedCash = Math.max(0, finalAmount - appliedCard);

      let finalPaymentType = 'cash';
      if (appliedCash > 0 && appliedCard > 0) finalPaymentType = 'mixed';
      else if (appliedCard > 0) finalPaymentType = 'card';

      // Создаём продажу
      const newSale = await tx.sale.create({
        data: {
          userId: req.user!.id,
          totalAmount,
          discount: saleDiscount,
          finalAmount,
          paymentType: finalPaymentType,
          cashAmount: appliedCash,
          cardAmount: appliedCard,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true } },
        },
      });

      // Уменьшаем остатки и создаём записи движения
      for (const item of items) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: item.quantity,
            price: item.price,
            reason: `Продажа #${newSale.id}`,
            userId: req.user!.id,
          },
        });
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Create sale error:', error);
    res.status(400).json({ error: error.message || 'Ошибка при создании продажи' });
  }
});

// GET /api/sales — история продаж
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true } } } },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/sales/:id — детали продажи
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ error: 'Продажа не найдена' });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/sales/:id/return — возврат продажи
router.post('/:id/return', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      res.status(404).json({ error: 'Продажа не найдена' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Возвращаем товары на склад
      for (const item of sale.items) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'RETURN',
            quantity: item.quantity,
            reason: `Возврат продажи #${sale.id}`,
            userId: req.user!.id,
          },
        });
      }
    });

    res.json({ message: 'Возврат оформлен' });
  } catch (error) {
    console.error('Return sale error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

