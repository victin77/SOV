import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import rateLimit from 'express-rate-limit';
import { getNextPipelinePosition } from '../utils/pipeline';
import { resolveCaptureCompany } from '../utils/tenancy';

const router = Router();

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Rate limit agressivo para captura publica
const captureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas requisicoes. Tente novamente em instantes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public endpoint - no auth required (for external forms/API)
router.post('/lead', captureLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company: companyName, source, notes, position, companySlug, website } = req.body;

    if (website) {
      res.status(400).json({ error: 'Requisicao invalida' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Nome e obrigatorio' });
      return;
    }
    if (name.length > 200 || (email && email.length > 200) || (phone && phone.length > 50) || (notes && notes.length > 2000)) {
      res.status(400).json({ error: 'Campos excedem tamanho maximo permitido' });
      return;
    }

    const resolvedCompany = await resolveCaptureCompany(prisma, companySlug);
    if (!resolvedCompany) {
      res.status(400).json({ error: 'companySlug valido e obrigatorio para capturar leads' });
      return;
    }
    const companyId = resolvedCompany.id;

    // Find first available stage DA EMPRESA
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { companyId },
      orderBy: { order: 'asc' },
    });
    const pipelinePosition = await getNextPipelinePosition(prisma, firstStage?.id);

    const lead = await prisma.lead.create({
      data: {
        name: name.trim().slice(0, 200),
        email: email ? String(email).trim().slice(0, 200) : null,
        phone: phone ? String(phone).trim().slice(0, 50) : null,
        company: companyName ? String(companyName).trim().slice(0, 200) : null,
        position: position ? String(position).trim().slice(0, 100) : null,
        source: source ? String(source).trim().slice(0, 100) : 'external-form',
        notes: notes ? String(notes).trim().slice(0, 2000) : null,
        stageId: firstStage?.id,
        pipelinePosition,
        companyId,
      },
    });

    await prisma.activity.create({
      data: {
        type: 'CAPTURED',
        description: `Lead capturado via fonte externa: ${source || 'formulario'}`,
        leadId: lead.id,
        companyId,
      },
    });

    res.status(201).json({ message: 'Lead capturado com sucesso', id: lead.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao capturar lead' });
  }
});

// Embeddable form HTML (public)
router.get('/form', (req: Request, res: Response) => {
  const companySlug = typeof req.query.companySlug === 'string' ? req.query.companySlug : '';
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Formulário de Contato</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f8fafc; padding: 20px; }
    .form-container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    h2 { color: #1e293b; margin-bottom: 24px; font-size: 1.5rem; }
    label { display: block; color: #475569; font-size: 0.875rem; font-weight: 500; margin-bottom: 4px; }
    input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; margin-bottom: 16px; outline: none; transition: border 0.2s; }
    input:focus, textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
    textarea { resize: vertical; min-height: 80px; }
    button { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #4f46e5; }
    .success { color: #059669; text-align: center; padding: 20px; font-weight: 500; }
    .error { color: #dc2626; font-size: 0.8rem; margin-bottom: 8px; }
    .website-field { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Entre em contato</h2>
    <form id="captureForm">
      <label for="name">Nome *</label>
      <input type="text" id="name" name="name" required>
      <label for="email">Email</label>
      <input type="email" id="email" name="email">
      <label for="phone">Telefone</label>
      <input type="tel" id="phone" name="phone">
      <label for="company">Empresa</label>
      <input type="text" id="company" name="company">
      <label for="notes">Mensagem</label>
      <textarea id="notes" name="notes"></textarea>
      <input class="website-field" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <input type="hidden" name="source" value="website-form">
      <input type="hidden" name="companySlug" value="${escapeHtmlAttribute(companySlug)}">
      <button type="submit">Enviar</button>
    </form>
    <div id="result"></div>
  </div>
  <script>
    document.getElementById('captureForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = Object.fromEntries(new FormData(form));
      try {
        const res = await fetch(window.location.origin + '/api/capture/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          form.style.display = 'none';
          document.getElementById('result').innerHTML = '<div class="success">Obrigado! Entraremos em contato em breve.</div>';
        } else {
          document.getElementById('result').innerHTML = '<div class="error">Erro ao enviar. Tente novamente.</div>';
        }
      } catch {
        document.getElementById('result').innerHTML = '<div class="error">Erro de conexão.</div>';
      }
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
