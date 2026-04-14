import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function getSeedPassword(envName: string) {
  const configured = process.env[envName];
  if (configured) return configured;
  return `Seed-${crypto.randomBytes(8).toString('hex')}1`;
}

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPlainPassword = getSeedPassword('SEED_ADMIN_PASSWORD');
  const managerPlainPassword = getSeedPassword('SEED_MANAGER_PASSWORD');
  const sellerPlainPassword = getSeedPassword('SEED_SELLER_PASSWORD');
  const adminPassword = await bcrypt.hash(adminPlainPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
      phone: '(11) 99999-0001',
    },
  });
  console.log('Admin created:', admin.email);

  // Create manager
  const managerPassword = await bcrypt.hash(managerPlainPassword, 12);
  const manager = await prisma.user.upsert({
    where: { email: 'gerente@crm.com' },
    update: {},
    create: {
      email: 'gerente@crm.com',
      password: managerPassword,
      name: 'Carlos Gerente',
      role: 'MANAGER',
      phone: '(11) 99999-0002',
    },
  });
  console.log('Manager created:', manager.email);

  // Create sellers
  const sellerPassword = await bcrypt.hash(sellerPlainPassword, 12);
  const seller1 = await prisma.user.upsert({
    where: { email: 'ana@crm.com' },
    update: {},
    create: {
      email: 'ana@crm.com',
      password: sellerPassword,
      name: 'Ana Vendedora',
      role: 'SELLER',
      phone: '(11) 99999-0003',
    },
  });

  const seller2 = await prisma.user.upsert({
    where: { email: 'bruno@crm.com' },
    update: {},
    create: {
      email: 'bruno@crm.com',
      password: sellerPassword,
      name: 'Bruno Vendedor',
      role: 'SELLER',
      phone: '(11) 99999-0004',
    },
  });
  console.log('Sellers created');

  // Pipeline stages
  const stages = [
    { name: 'Prospecção', color: '#6366f1', order: 1 },
    { name: 'Primeiro Contato', color: '#06b6d4', order: 2 },
    { name: 'Qualificação', color: '#8b5cf6', order: 3 },
    { name: 'Proposta', color: '#f59e0b', order: 4 },
    { name: 'Negociação', color: '#f97316', order: 5 },
    { name: 'Fechamento', color: '#22c55e', order: 6 },
  ];

  const createdStages = [];
  for (const stage of stages) {
    const s = await prisma.pipelineStage.create({ data: stage });
    createdStages.push(s);
  }
  console.log('Pipeline stages created:', stages.length);

  // Tags
  const tags = [
    { name: 'Hot Lead', color: '#ef4444' },
    { name: 'Enterprise', color: '#6366f1' },
    { name: 'PME', color: '#22c55e' },
    { name: 'Indicação', color: '#f59e0b' },
    { name: 'Inbound', color: '#06b6d4' },
    { name: 'Outbound', color: '#8b5cf6' },
    { name: 'Retorno', color: '#ec4899' },
    { name: 'Urgente', color: '#dc2626' },
  ];

  const createdTags = [];
  for (const tag of tags) {
    const t = await prisma.tag.create({ data: tag });
    createdTags.push(t);
  }
  console.log('Tags created:', tags.length);

  // Sample leads
  const leadsData = [
    { name: 'João Silva', email: 'joao.silva@empresa.com', phone: '(11) 98765-4321', company: 'Tech Solutions Ltda', position: 'Diretor de TI', status: 'QUALIFIED' as const, priority: 'HIGH' as const, value: 45000, source: 'LinkedIn', stageId: createdStages[2].id, assignedToId: seller1.id, score: 75 },
    { name: 'Maria Santos', email: 'maria@abcorp.com.br', phone: '(21) 97654-3210', company: 'AB Corp', position: 'CEO', status: 'PROPOSAL' as const, priority: 'URGENT' as const, value: 120000, source: 'Indicação', stageId: createdStages[3].id, assignedToId: seller1.id, score: 90 },
    { name: 'Pedro Oliveira', email: 'pedro@startupx.io', phone: '(11) 96543-2109', company: 'StartupX', position: 'CTO', status: 'CONTACTED' as const, priority: 'MEDIUM' as const, value: 25000, source: 'Website', stageId: createdStages[1].id, assignedToId: seller2.id, score: 40 },
    { name: 'Fernanda Lima', email: 'fernanda@megastore.com', phone: '(31) 95432-1098', company: 'MegaStore', position: 'Gerente Compras', status: 'NEW' as const, priority: 'MEDIUM' as const, value: 80000, source: 'Feira', stageId: createdStages[0].id, assignedToId: seller2.id, score: 20 },
    { name: 'Ricardo Mendes', email: 'ricardo@globaltech.com', phone: '(11) 94321-0987', company: 'GlobalTech', position: 'VP Comercial', status: 'NEGOTIATION' as const, priority: 'HIGH' as const, value: 200000, source: 'Indicação', stageId: createdStages[4].id, assignedToId: seller1.id, score: 85 },
    { name: 'Camila Rocha', email: 'camila@inovacorp.com', phone: '(21) 93210-9876', company: 'InovaCorp', position: 'Diretora', status: 'QUALIFIED' as const, priority: 'MEDIUM' as const, value: 55000, source: 'Google Ads', stageId: createdStages[2].id, assignedToId: seller2.id, score: 60 },
    { name: 'Lucas Ferreira', email: 'lucas@dataflow.com.br', phone: '(11) 92109-8765', company: 'DataFlow', position: 'Analista', status: 'CONTACTED' as const, priority: 'LOW' as const, value: 15000, source: 'Website', stageId: createdStages[1].id, assignedToId: seller1.id, score: 30 },
    { name: 'Juliana Costa', email: 'juliana@bigcorp.com', phone: '(41) 91098-7654', company: 'BigCorp SA', position: 'Gerente Geral', status: 'WON' as const, priority: 'HIGH' as const, value: 95000, source: 'Indicação', stageId: createdStages[5].id, assignedToId: seller1.id, score: 100, wonDate: new Date() },
    { name: 'André Martins', email: 'andre@quickshop.com', phone: '(11) 90987-6543', company: 'QuickShop', position: 'Dono', status: 'NEW' as const, priority: 'MEDIUM' as const, value: 35000, source: 'Instagram', stageId: createdStages[0].id, assignedToId: seller2.id, score: 15 },
    { name: 'Patricia Almeida', email: 'patricia@logitech.com.br', phone: '(51) 89876-5432', company: 'LogiTech BR', position: 'Compradora', status: 'LOST' as const, priority: 'LOW' as const, value: 40000, source: 'Cold Call', assignedToId: seller2.id, score: 10, lostReason: 'Optou pelo concorrente', lostDate: new Date() },
    { name: 'Thiago Nascimento', email: 'thiago@construtora.com', phone: '(11) 91234-5678', company: 'Construtora Alfa', position: 'Diretor Financeiro', status: 'PROPOSAL' as const, priority: 'HIGH' as const, value: 180000, source: 'Evento', stageId: createdStages[3].id, assignedToId: seller1.id, score: 80 },
    { name: 'Beatriz Souza', email: 'beatriz@modashop.com', phone: '(21) 92345-6789', company: 'ModaShop', position: 'CEO', status: 'NEW' as const, priority: 'MEDIUM' as const, value: 22000, source: 'Website', stageId: createdStages[0].id, assignedToId: seller1.id, score: 25 },
  ];

  for (const leadData of leadsData) {
    const lead = await prisma.lead.create({ data: leadData });

    // Add some tags randomly
    const randomTags = createdTags
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);
    for (const tag of randomTags) {
      await prisma.leadTag.create({ data: { leadId: lead.id, tagId: tag.id } });
    }

    // Add activity
    await prisma.activity.create({
      data: { type: 'CREATED', description: `Lead "${lead.name}" criado`, leadId: lead.id },
    });
  }
  console.log('Leads created:', leadsData.length);

  // Sample appointments
  const now = new Date();
  const appointments = [
    { title: 'Reunião de apresentação', description: 'Apresentar solução para o cliente', startDate: new Date(now.getTime() + 86400000), endDate: new Date(now.getTime() + 86400000 + 3600000), location: 'Google Meet', leadId: '', userId: seller1.id },
    { title: 'Follow-up proposta', description: 'Acompanhar proposta enviada', startDate: new Date(now.getTime() + 172800000), endDate: new Date(now.getTime() + 172800000 + 1800000), location: 'Telefone', leadId: '', userId: seller1.id },
    { title: 'Demo do produto', description: 'Demonstração técnica', startDate: new Date(now.getTime() + 259200000), endDate: new Date(now.getTime() + 259200000 + 5400000), location: 'Escritório - Sala 3', leadId: '', userId: seller2.id },
    { title: 'Almoço de negócios', description: 'Fechamento do contrato', startDate: new Date(now.getTime() + 432000000), endDate: new Date(now.getTime() + 432000000 + 7200000), location: 'Restaurante Centro', leadId: '', userId: seller1.id },
  ];

  // Get lead IDs for appointments
  const allLeads = await prisma.lead.findMany({ take: 4 });
  for (let i = 0; i < appointments.length; i++) {
    appointments[i].leadId = allLeads[i % allLeads.length].id;
    await prisma.appointment.create({ data: appointments[i] });
  }
  console.log('Appointments created:', appointments.length);

  // Audit logs
  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'SEED', entity: 'system', details: { message: 'Database seeded' } },
  });

  console.log('\nSeed complete! Login credentials:');
  console.log(`  Admin:    admin@crm.com     / ${adminPlainPassword}`);
  console.log(`  Gerente:  gerente@crm.com   / ${managerPlainPassword}`);
  console.log(`  Vendedor: ana@crm.com       / ${sellerPlainPassword}`);
  console.log(`  Vendedor: bruno@crm.com     / ${sellerPlainPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
