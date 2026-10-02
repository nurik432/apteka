import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { AuthRequest, generateToken, authMiddleware, isValidPin } from '../middleware/auth';

const router = Router();

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

// GET /api/auth/users — активные сотрудники для экрана входа (без авторизации)
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Login users error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login — вход по PIN
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, pin } = req.body;

    if (!Number.isInteger(userId) || !isValidPin(pin)) {
      res.status(400).json({ error: 'Выберите сотрудника и введите PIN из 4 цифр' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Неверный PIN' });
      return;
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      res.status(429).json({ error: `Слишком много попыток. Повторите через ${minutes} мин.` });
      return;
    }

    const isValid = await bcrypt.compare(pin, user.password);
    if (!isValid) {
      const failed = user.failedLogins + 1;
      if (failed >= MAX_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60000) },
        });
        res.status(429).json({ error: `Слишком много попыток. Вход заблокирован на ${LOCK_MINUTES} мин.` });
        return;
      }
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: failed } });
      res.status(401).json({ error: `Неверный PIN. Осталось попыток: ${MAX_ATTEMPTS - failed}` });
      return;
    }

    if (user.failedLogins > 0 || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, fullName: true, role: true, active: true },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!isValidPin(newPassword)) {
      res.status(400).json({ error: 'PIN должен состоять из 4 цифр' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const isValid = await bcrypt.compare(String(currentPassword ?? ''), user.password);
    if (!isValid) {
      res.status(400).json({ error: 'Неверный текущий PIN' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'PIN успешно изменён' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

