import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/warehouse/receipt — Приход товара
router.post('/receipt', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, price, sellingPrice, supplierId, reason, items } = req.body;

    // Bulk receipt handling
    if (items && Array.isArray(items) && items.length > 0) {
      const results = await prisma.$transaction(async (tx) => {
        const movements = [];
        for (const item of items) {
          if (!item.productId || !item.quantity) continue;
          
          const movement = await tx.stockMovement.create({
            data: {
              productId: parseInt(item.productId),
              supplierId: supplierId ? parseInt(supplierId) : null,
              type: 'RECEIPT',
              quantity: parseInt(item.quantity),
              price: item.price ? parseFloat(item.price) : null,
              reason: reason || 'Приход товара (массовый)',
              userId: req.user!.id,
            },
          });

          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: {
              stock: { increment: parseInt(item.quantity) },
              receivedDate: new Date(),
              ...(item.price ? { purchasePrice: parseFloat(item.price) } : {}),
              ...(item.sellingPrice ? { sellingPrice: parseFloat(item.sellingPrice) } : {}),
            },
          });
          
          movements.push(movement);
        }
        return movements;
      });
      res.status(201).json({ message: 'Оприходовано успешно', count: results.length });
      return;
    }

    if (!productId || !quantity) {
      res.status(400).json({ error: 'Укажите товар и количество' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Создаём запись движения
      const movement = await tx.stockMovement.create({
        data: {
          productId: parseInt(productId),
          supplierId: supplierId ? parseInt(supplierId) : null,
          type: 'RECEIPT',
          quantity: parseInt(quantity),
          price: price ? parseFloat(price) : null,
          reason: reason || 'Приход товара',
          userId: req.user!.id,
        },
        include: { product: true, supplier: true },
      });

      // Обновляем остаток
      const product = await tx.product.update({
        where: { id: parseInt(productId) },
        data: {
          stock: { increment: parseInt(quantity) },
          receivedDate: new Date(),
          ...(price ? { purchasePrice: parseFloat(price) } : {}),
          ...(sellingPrice ? { sellingPrice: parseFloat(sellingPrice) } : {}),
        },
      });

      return { movement, product };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Receipt error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/warehouse/write-off — Списание товара
router.post('/write-off', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity) {
      res.status(400).json({ error: 'Укажите товар и количество' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
    if (!product) {
      res.status(404).json({ error: 'Товар не найден' });
      return;
    }

    if (product.stock < parseInt(quantity)) {
      res.status(400).json({ error: 'Недостаточно товара на складе' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: parseInt(productId),
          type: 'WRITE_OFF',
          quantity: parseInt(quantity),
          reason: reason || 'Списание',
          userId: req.user!.id,
        },
        include: { product: true },
      });

      const updatedProduct = await tx.product.update({
        where: { id: parseInt(productId) },
        data: { stock: { decrement: parseInt(quantity) } },
      });

      return { movement, product: updatedProduct };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Write-off error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/warehouse/return — Возврат товара
router.post('/return', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity) {
      res.status(400).json({ error: 'Укажите товар и количество' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: parseInt(productId),
          type: 'RETURN',
          quantity: parseInt(quantity),
          reason: reason || 'Возврат товара',
          userId: req.user!.id,
        },
        include: { product: true },
      });

      const product = await tx.product.update({
        where: { id: parseInt(productId) },
        data: { stock: { increment: parseInt(quantity) } },
      });

      return { movement, product };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/warehouse/inventory — Инвентаризация
router.post('/inventory', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body; // [{productId, actualStock}]

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Укажите список товаров' });
      return;
    }

    const results = await prisma.$transaction(async (tx) => {
      const movements = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const diff = item.actualStock - product.stock;
        if (diff === 0) continue;

        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'INVENTORY',
            quantity: Math.abs(diff),
            reason: diff > 0 ? `Излишек: +${diff}` : `Недостача: ${diff}`,
            userId: req.user!.id,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.actualStock },
        });

        movements.push(movement);
      }

      return movements;
    });

    res.json({ message: 'Инвентаризация проведена', movements: results });
  } catch (error) {
    console.error('Inventory error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/warehouse/movements — история движения
router.get('/movements', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};
    if (type) where.type = type;
    if (productId) where.productId = productId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: true, supplier: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

