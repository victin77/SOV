import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function ensureSuperAdmin(prisma: PrismaClient) {
  // Verifica se já existe algum SUPER_ADMIN
  const existing = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existing) return;

  // Cria o primeiro SUPER_ADMIN com variáveis de ambiente ou valores padrão
  const email = process.env.SUPER_ADMIN_EMAIL || 'super@crm.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin1';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

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
