import { PrismaClient } from '@prisma/client';
import { getSuperAdminEmails } from './utils/bootstrap';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Migracao de usuarios existentes ---');

  const superAdminEmails = getSuperAdminEmails();
  if (superAdminEmails.length === 0) {
    console.warn('SUPER_ADMIN_EMAILS nao definido - nenhum usuario sera promovido.');
  } else {
    console.log(`Whitelist SUPER_ADMIN: ${superAdminEmails.join(', ')}`);

    for (const email of superAdminEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log(`  [skip] ${email} nao existe ainda - sera criado no primeiro login via Google.`);
        continue;
      }

      if (user.role === 'SUPER_ADMIN' && user.companyId === null) {
        console.log(`  [ok] ${email} ja e SUPER_ADMIN sem empresa.`);
        continue;
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN', companyId: null },
      });
      console.log(`  [promote] ${email}: role=${user.role}->SUPER_ADMIN, companyId=${user.companyId}->null`);
      void updated;
    }
  }

  // Relatorio geral
  const [totalUsers, googleUsers, passwordOnlyUsers, noCredentialUsers, superAdmins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.user.count({ where: { googleId: null, password: { not: null } } }),
    prisma.user.count({ where: { googleId: null, password: null } }),
    prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
  ]);

  console.log('');
  console.log('--- Estado final ---');
  console.log(`Total de usuarios:        ${totalUsers}`);
  console.log(`  SUPER_ADMINs:           ${superAdmins}`);
  console.log(`  Com Google vinculado:   ${googleUsers}`);
  console.log(`  Somente senha local:    ${passwordOnlyUsers}`);
  console.log(`  Sem credencial alguma:  ${noCredentialUsers}`);

  if (noCredentialUsers > 0) {
    console.log('');
    console.log('Atencao: existem usuarios sem senha nem Google vinculado.');
    console.log('Eles nao conseguirao logar ate que definam uma senha via "Esqueci a senha"');
    console.log('ou ate que liguem uma conta Google.');
  }
}

main()
  .catch((err) => {
    console.error('Migracao falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
