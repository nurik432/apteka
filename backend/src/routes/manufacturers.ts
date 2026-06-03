import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/manufacturers
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(manufacturers);
  } catch (error) {
    console.error('Get manufacturers error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/manufacturers
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Введите название фирмы' });
      return;
    }
    const manufacturer = await prisma.manufacturer.create({ data: { name } });
    res.status(201).json(manufacturer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Фирма с таким названием уже существует' });
      return;
    }
    console.error('Create manufacturer error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/manufacturers/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { name } = req.body;
    const manufacturer = await prisma.manufacturer.update({ where: { id }, data: { name } });
    res.json(manufacturer);
  } catch (error) {
    console.error('Update manufacturer error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/manufacturers/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.manufacturer.delete({ where: { id } });
    res.json({ message: 'Фирма удалена' });
  } catch (error) {
    console.error('Delete manufacturer error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
