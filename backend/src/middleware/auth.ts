import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Секрет из окружения, иначе — сгенерированный при первом запуске и сохранённый рядом с БД.
// Путь одинаков для src/ (tsx) и dist/ (node): оба на уровень ниже backend/.
const SECRET_FILE = path.join(__dirname, '../../../database/.jwt-secret');

function loadJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (fs.existsSync(SECRET_FILE)) {
    const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (saved) return saved;
  }
  const secret = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const JWT_SECRET = loadJwtSecret();

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    fullName: string;
  };
}

export function generateToken(payload: { id: number; username: string; role: string; fullName: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      role: string;
      fullName: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный или просроченный токен' });
  }
}

export function roleGuard(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    next();
  };
}
