import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não está definida. Defina a variável de ambiente antes de iniciar o servidor.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const IMPERSONATION_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_DAYS = 30;
const prisma = new PrismaClient();

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
  impersonating?: boolean;
  originalUserId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (!payload.companyId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { companyId: true },
      });
      payload.companyId = user?.companyId || null;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    // SUPER_ADMIN always passes role checks (they impersonate as ADMIN)
    if (req.user.role === 'SUPER_ADMIN' || req.user.impersonating) {
      next();
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }
    next();
  };
}

export function authorizeSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    // Allow if SUPER_ADMIN role OR if impersonating (original user was SUPER_ADMIN)
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.originalUserId) {
      res.status(403).json({ error: 'Acesso restrito ao Super Admin' });
      return;
    }
    next();
  };
}

export function generateToken(
  payload: AuthPayload,
  expiresIn: SignOptions['expiresIn'] = ACCESS_TOKEN_EXPIRY
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function generateImpersonationToken(payload: AuthPayload): string {
  return generateToken(payload, IMPERSONATION_TOKEN_EXPIRY);
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthPayload } | null> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    return null;
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, email: true, role: true, companyId: true, active: true },
  });

  if (!user || !user.active) return null;

  // Check if company is active
  if (user.companyId && user.role !== 'SUPER_ADMIN') {
    const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { active: true } });
    if (company && !company.active) return null;
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const accessToken = generateToken(payload);
  const refreshToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken, user: payload };
}

export async function revokeUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
