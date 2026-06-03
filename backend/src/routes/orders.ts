import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/orders
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        supplier: true,
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/orders (Create draft)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { supplierId } = req.body;
    const order = await prisma.order.create({
      data: {
        supplierId: supplierId ? parseInt(supplierId) : null,
        status: 'DRAFT',
      },
      include: {
        supplier: true,
      }
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              include: { category: true, manufacturer: true }
            }
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/orders/:id/items (Add items to order, supports batch)
router.post('/:id/items', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);
    const items = req.body.items as { productId: number; orderedQty: number }[];

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Ожидается массив товаров' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'DRAFT') {
      res.status(400).json({ error: 'Заказ не найден или не является черновиком' });
      return;
    }

    // First, find products to get their purchase prices
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map(p => [p.id, p]));

    const newItems = items.map(item => {
      const p = productMap.get(item.productId);
      return {
        orderId,
        productId: item.productId,
        orderedQty: item.orderedQty,
        receivedQty: 0,
        purchasePrice: p?.purchasePrice || 0,
        sellingPrice: p?.sellingPrice || 0,
      };
    });

    // We can use createMany for bulk insertion
    await prisma.orderItem.createMany({
      data: newItems
    });

    // Calculate total amount
    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const totalAmount = allItems.reduce((acc, item) => acc + (item.purchasePrice * item.orderedQty), 0);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount }
    });

    res.json({ message: 'Товары добавлены', addedCount: newItems.length });
  } catch (error) {
    console.error('Add order items error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/orders/:id/items/:itemId (Update item details)
router.put('/:id/items/:itemId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);
    const { orderedQty, receivedQty, purchasePrice, sellingPrice } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'COMPLETED') {
      res.status(400).json({ error: 'Заказ завершен или не найден' });
      return;
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        orderedQty: orderedQty !== undefined ? parseInt(orderedQty) : undefined,
        receivedQty: receivedQty !== undefined ? parseInt(receivedQty) : undefined,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : undefined,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined,
      }
    });

    // Calculate total amount
    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const totalAmount = allItems.reduce((acc, item) => acc + (item.purchasePrice * item.orderedQty), 0);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount }
    });

    res.json({ message: 'Позиция обновлена' });
  } catch (error) {
    console.error('Update order item error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/orders/:id/items/:itemId
router.delete('/:id/items/:itemId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'COMPLETED') {
      res.status(400).json({ error: 'Заказ завершен или не найден' });
      return;
    }

    await prisma.orderItem.delete({
      where: { id: itemId }
    });

    // Calculate total amount
    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const totalAmount = allItems.reduce((acc, item) => acc + (item.purchasePrice * item.orderedQty), 0);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount }
    });

    res.json({ message: 'Позиция удалена' });
  } catch (error) {
    console.error('Delete order item error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/orders/:id/receive (Confirm receipt, update stock and prices, create movement)
router.post('/:id/receive', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }

    if (order.status === 'COMPLETED') {
      res.status(400).json({ error: 'Заказ уже оприходован' });
      return;
    }

    // Process all items in a transaction
    await prisma.$transaction(async (tx) => {
      let actualTotal = 0;

      for (const item of order.items) {
        if (item.receivedQty > 0) {
          actualTotal += (item.purchasePrice * item.receivedQty);
          
          // Update product stock and prices
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.receivedQty },
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              receivedDate: new Date()
            }
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              supplierId: order.supplierId,
              type: 'IN',
              quantity: item.receivedQty,
              price: item.purchasePrice,
              reason: `Приход по заказу #${order.id}`,
              userId: req.user?.id
            }
          });
        }
      }

      // Mark order as completed and set final amount based on received quantities
      await tx.order.update({
        where: { id: orderId },
        data: { 
          status: 'COMPLETED',
          totalAmount: actualTotal
        }
      });
    });

    res.json({ message: 'Заказ успешно оприходован' });
  } catch (error) {
    console.error('Receive order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/orders/:id (Delete order)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await prisma.order.findUnique({ where: { id } });
    
    if (!order) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }
    if (order.status === 'COMPLETED') {
      res.status(400).json({ error: 'Нельзя удалить оприходованный заказ' });
      return;
    }

    // First delete items
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    // Then delete order
    await prisma.order.delete({ where: { id } });

    res.json({ message: 'Заказ удален' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
