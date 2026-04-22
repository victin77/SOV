import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateBody,
} from '../utils/validation';
import { verifyGoogleIdToken, isGoogleLoginEnabled } from '../utils/google';
import { isSuperAdminEmail } from '../utils/bootstrap';
import { sendPasswordResetEmail, getAppUrl } from '../utils/email';

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
  mustChangePassword: true,
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

    if (!user.password) {
      res.status(401).json({ error: 'Este usuário usa login via Google. Clique em "Entrar com Google".' });
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

router.post('/google', async (req: Request, res: Response) => {
  try {
    if (!isGoogleLoginEnabled()) {
      res.status(503).json({ error: 'Login via Google nao configurado no servidor' });
      return;
    }

    const parsed = validateBody(googleLoginSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const profile = await verifyGoogleIdToken(parsed.data.idToken);
    if (!profile) {
      res.status(401).json({ error: 'Token do Google invalido' });
      return;
    }
    if (!profile.emailVerified) {
      res.status(403).json({ error: 'Seu email do Google nao foi verificado' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email: profile.email } });

    // Auto-cria super admin se o email estiver na whitelist
    if (!user && isSuperAdminEmail(profile.email)) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || 'Super Admin',
          role: 'SUPER_ADMIN',
          googleId: profile.googleId,
          avatar: profile.picture,
          lastSeenAt: new Date(),
        },
      });
      console.log(`Super admin criado via Google: ${user.email}`);
    }

    if (!user) {
      res.status(403).json({
        error: 'Este Gmail nao esta autorizado. Peca ao administrador da sua empresa para cadastrar o seu acesso.',
      });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'Usuario desativado. Entre em contato com o administrador.' });
      return;
    }

    // Liga googleId ao usuario se ainda nao estiver ligado
    if (!user.googleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    } else if (user.googleId !== profile.googleId) {
      res.status(403).json({ error: 'Este email ja esta vinculado a outra conta Google.' });
      return;
    }

    // Bloqueia se empresa do usuario esta desativada (SUPER_ADMIN nao tem empresa)
    if (user.companyId && user.role !== 'SUPER_ADMIN') {
      const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { active: true } });
      if (company && !company.active) {
        res.status(403).json({ error: 'Sua empresa esta desativada. Entre em contato com o suporte.' });
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
      action: 'LOGIN_GOOGLE',
      entity: 'user',
      entityId: user.id,
      ip: firstString(req.ip),
    });

    res.json({ user: freshUser });
  } catch (err) {
    console.error('POST /auth/google failed', err);
    res.status(500).json({ error: 'Erro ao fazer login com Google' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  // Resposta sempre igual, independente de o usuario existir (nao vaza whitelist)
  const genericResponse = { message: 'Se o email estiver cadastrado, voce recebera um link de redefinicao.' };

  try {
    const parsed = validateBody(forgotPasswordSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      res.json(genericResponse);
      return;
    }

    // Invalida tokens antigos do usuario
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

    // Responde imediatamente; o envio do email roda em background
    // (SMTP pode demorar ou falhar, mas isso nao deve travar a UX).
    res.json(genericResponse);

    sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
      .then((sent) => {
        logAudit({
          userId: user.id,
          companyId: user.companyId,
          action: 'FORGOT_PASSWORD',
          entity: 'user',
          entityId: user.id,
          details: { emailSent: sent },
          ip: firstString(req.ip),
        }).catch((err) => console.error('logAudit FORGOT_PASSWORD failed', err));
      })
      .catch((err) => console.error('sendPasswordResetEmail failed', err));
    return;
  } catch (err) {
    console.error('POST /auth/forgot-password failed', err);
    // Mantem resposta generica mesmo em erro pra nao vazar info
    res.json(genericResponse);
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(resetPasswordSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { token, newPassword } = parsed.data;

    const stored = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      res.status(400).json({ error: 'Link invalido ou expirado. Solicite um novo.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: stored.userId },
        data: { password: hashedPassword, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
    ]);

    await logAudit({
      userId: stored.userId,
      action: 'RESET_PASSWORD',
      entity: 'user',
      entityId: stored.userId,
      ip: firstString(req.ip),
    });

    res.json({ message: 'Senha redefinida com sucesso. Faca login com a nova senha.' });
  } catch (err) {
    console.error('POST /auth/reset-password failed', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
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

    if (!user.password) {
      res.status(400).json({ error: 'Voce ainda nao tem senha local. Use "Esqueci a senha" para definir uma.' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Senha atual incorreta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

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
