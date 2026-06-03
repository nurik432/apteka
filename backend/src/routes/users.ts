import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, roleGuard } from '../middleware/auth';

const router = Router();

// GET /api/users — список пользователей
router.get('/', authMiddleware, roleGuard('ADMIN'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/users — создание пользователя
router.post('/', authMiddleware, roleGuard('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password || !fullName) {
      res.status(400).json({ error: 'Заполните все обязательные поля' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role: role || 'PHARMACIST',
      },
      select: { id: true, username: true, fullName: true, role: true, active: true },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/users/:id — редактирование пользователя
router.put('/:id', authMiddleware, roleGuard('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { fullName, role, active, password } = req.body;

    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, fullName: true, role: true, active: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/users/:id — удаление (деактивация) пользователя
router.delete('/:id', authMiddleware, roleGuard('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);

    if (req.user!.id === id) {
      res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    res.json({ message: 'Пользователь деактивирован' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

