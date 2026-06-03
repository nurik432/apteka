import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/suppliers — список поставщиков
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { movements: true } } },
    });

    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/suppliers/:id — поставщик с историей поставок
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        movements: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ error: 'Поставщик не найден' });
      return;
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/suppliers
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, contactName, phone, email, address } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Введите название поставщика' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: { name, contactName, phone, email, address },
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, contactName, phone, email, address } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contactName, phone, email, address },
    });

    res.json(supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.supplier.delete({ where: { id } });
    res.json({ message: 'Поставщик удалён' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

