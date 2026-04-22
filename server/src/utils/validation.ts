import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos 1 letra')
  .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número');

const safeAvatarSchema = z
  .string()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith('/uploads/')) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Avatar deve ser uma URL http(s) ou caminho /uploads/');

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordSchema,
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  phone: z.string().max(30).optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
});

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordSchema.optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  phone: z.string().max(30).optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(10, 'idToken obrigatório'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token obrigatório'),
  newPassword: passwordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  phone: z.string().max(30).optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  avatar: safeAvatarSchema.optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: passwordSchema,
});

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.errors.map(e => e.message).join('; ');
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
