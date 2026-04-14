import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function ensureSuperAdmin(prisma: PrismaClient) {
  const existing = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existing) return;

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.warn('SUPER_ADMIN nao existe e SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD nao definidas. Nenhum super admin criado.');
    console.warn('Defina as variaveis de ambiente ou use: npm run create-super-admin');
    return;
  }

  if (password.length < 8) {
    console.error('SUPER_ADMIN_PASSWORD deve ter no minimo 8 caracteres.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`SUPER_ADMIN criado automaticamente: ${email}`);
  console.log('IMPORTANTE: troque a senha apos o primeiro login!');
}
