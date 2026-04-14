import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD antes de criar o super admin.');
    process.exit(1);
  }

  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('Senha deve ter no minimo 8 caracteres, com pelo menos 1 letra e 1 numero.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuario ${email} ja existe. Nada a fazer.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('SUPER_ADMIN criado com sucesso!');
  console.log(`  Email: ${user.email}`);
  console.log(`  Nome:  ${user.name}`);
  console.log('');
  console.log('IMPORTANTE: troque a senha apos o primeiro login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
