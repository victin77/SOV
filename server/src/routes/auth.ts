import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import {
  clearAuthCookies,
  generateToken,
  generateRefreshToken,
  getRefreshTokenFromRequest,
  rotateRefreshToken,
  revokeUserRefreshTokens,
  setAuthCookies,
  authenticate,
  authorize,
} from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { loginSchema, registerSchema, changePasswordSchema, updateProfileSchema, validateBody } from '../utils/validation';

const router = Router();

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  phone: true,
  whatsappNumber: true,
  companyId: true,
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  createdAt: true,
  lastSeenAt: true,
} as const;

router.post('/register', authenticate, authorize('ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(registerSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { email, password, name, role, phone, whatsappNumber } = parsed.data;

    // MANAGER cannot create ADMIN users
    if (req.user!.role === 'MANAGER' && role === 'ADMIN') {
      res.status(403).json({ error: 'Gerente nao pode criar usuarios administradores' });
      return;
    }

    // Use the company of the authenticated user (admin creating the new user)
    const creatorCompanyId = req.user!.companyId;
    if (!creatorCompanyId) {
      res.status(400).json({ error: 'Usuário sem empresa vinculada' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email já cadastrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'SELLER',
        phone,
        whatsappNumber,
        companyId: creatorCompanyId,
        lastSeenAt: new Date(),
      },
      select: userSelect,
    });

    await logAudit({
      userId: req.user!.userId,
      companyId: user.companyId,
      action: 'REGISTER',
      entity: 'user',
      entityId: user.id,
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(loginSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Block login if user's company is deactivated (skip for SUPER_ADMIN who has no company)
    if (user.companyId && user.role !== 'SUPER_ADMIN') {
      const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { active: true } });
      if (company && !company.active) {
        res.status(403).json({ error: 'Sua empresa está desativada. Entre em contato com o suporte.' });
        return;
      }
    }

    const freshUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
      select: userSelect,
    });

    const token = generateToken({
      userId: freshUser.id,
      email: freshUser.email,
      role: freshUser.role,
      companyId: freshUser.companyId,
    });

    const refreshToken = await generateRefreshToken(freshUser.id);
    setAuthCookies(res, token, refreshToken);

    await logAudit({
      userId: user.id,
      companyId: freshUser.companyId,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
      ip: firstString(req.ip),
    });

    res.json({
      user: freshUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: userSelect,
    });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('GET /auth/me failed', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(updateProfileSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { name, phone, avatar, whatsappNumber } = parsed.data;

    const data: Record<string, unknown> = { lastSeenAt: new Date() };
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (avatar !== undefined) data.avatar = avatar;
    if (whatsappNumber !== undefined) data.whatsappNumber = whatsappNumber;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: userSelect,
    });
    res.json(user);
  } catch (err) {
    console.error('PUT /auth/profile failed', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

router.post('/presence', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { lastSeenAt: new Date() },
    });

    res.json({ ok: true, lastSeenAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar presença' });
  }
});

router.put('/password', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(changePasswordSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Senha atual incorreta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    await logAudit({
      userId: user.id,
      companyId: user.companyId,
      action: 'CHANGE_PASSWORD',
      entity: 'user',
      entityId: user.id,
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken: bodyRefreshToken } = req.body as { refreshToken?: string };
    const refreshToken = bodyRefreshToken || getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token é obrigatório' });
      return;
    }

    const result = await rotateRefreshToken(refreshToken);
    if (!result) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Refresh token inválido ou expirado' });
      return;
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.json({
      ok: true,
    });
  } catch (err) {
    console.error('POST /auth/refresh failed', err);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    await revokeUserRefreshTokens(req.user!.userId);
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

export default router;
