import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be defined before starting the server.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const IMPERSONATION_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_DAYS = 30;
const ACCESS_COOKIE = 'crm_access_token';
const REFRESH_COOKIE = 'crm_refresh_token';
const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
const IMPERSONATION_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

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

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const trimmedCookie = cookie.trim();
    const separatorIndex = trimmedCookie.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmedCookie.slice(0, separatorIndex);
    if (key === name) {
      return decodeURIComponent(trimmedCookie.slice(separatorIndex + 1));
    }
  }

  return null;
}

function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken?: string | null, accessMaxAge = ACCESS_COOKIE_MAX_AGE_MS) {
  res.cookie(ACCESS_COOKIE, accessToken, authCookieOptions(accessMaxAge));
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, authCookieOptions(REFRESH_COOKIE_MAX_AGE_MS));
  }
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

export function getRefreshTokenFromRequest(req: Request) {
  return readCookie(req, REFRESH_COOKIE);
}

export function getImpersonationCookieMaxAge() {
  return IMPERSONATION_COOKIE_MAX_AGE_MS;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearerToken || readCookie(req, ACCESS_COOKIE);

  if (!token) {
    res.status(401).json({ error: 'Token nao fornecido' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, companyId: true, active: true },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Token invalido ou usuario inativo' });
      return;
    }

    let companyId = user.companyId;
    const impersonating = user.role === 'SUPER_ADMIN' && payload.impersonating === true && Boolean(payload.companyId);

    if (impersonating) {
      const company = await prisma.company.findUnique({
        where: { id: payload.companyId as string },
        select: { id: true, active: true },
      });
      if (!company || !company.active) {
        res.status(403).json({ error: 'Empresa indisponivel para impersonacao' });
        return;
      }
      companyId = company.id;
    } else if (companyId && user.role !== 'SUPER_ADMIN') {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { active: true },
      });
      if (company && !company.active) {
        res.status(403).json({ error: 'Empresa desativada' });
        return;
      }
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId,
      impersonating,
      originalUserId: impersonating ? user.id : undefined,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissao' });
      return;
    }
    next();
  };
}

export function authorizeSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }
    if (req.user.role !== 'SUPER_ADMIN') {
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

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, email: true, role: true, companyId: true, active: true },
  });

  if (!user || !user.active) return null;

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
