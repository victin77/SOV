import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { prisma } from './utils/prisma';
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import pipelineRoutes from './routes/pipeline';
import appointmentRoutes from './routes/appointments';
import tagRoutes from './routes/tags';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import auditRoutes from './routes/audit';
import importExportRoutes from './routes/importExport';
import captureRoutes from './routes/capture';
import notificationRoutes from './routes/notifications';
import whatsappRoutes from './routes/whatsapp';
import companyRoutes from './routes/company';
import superAdminRoutes from './routes/superAdmin';
import { ensureDefaultCompanyAndBackfill } from './utils/tenancy';
import { ensureSuperAdmin } from './utils/bootstrap';

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: use CORS_ORIGIN for separate frontend domains.
// In production without CORS_ORIGIN, Railway serves frontend/backend from the same origin.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'];

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));

// Make prisma available to routes
app.locals.prisma = prisma;

// Rate limiting — login: 5 tentativas por IP a cada 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Rate limiting global — 100 req/min por IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Em produção, servir o frontend buildado
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function start() {
  try {
    await prisma.$connect();
    await ensureDefaultCompanyAndBackfill(prisma);
    await ensureSuperAdmin(prisma);
    console.log('Database connected');
  } catch (err) {
    console.warn('Database connection failed, running in fallback mode:', err);
    process.env.FALLBACK_MODE = 'true';
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (process.env.FALLBACK_MODE === 'true') {
      console.log('⚠ Running in FALLBACK mode (no database)');
    }
  });
}

start();

export { prisma };
