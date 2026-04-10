import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getNextPipelinePosition } from '../utils/pipeline';

const router = Router();
const prisma = new PrismaClient();

// Public endpoint - no auth required (for external forms/API)
router.post('/lead', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, source, notes, position } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Nome é obrigatório' });
      return;
    }

    // Find first available stage
    const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'asc' } });
    const pipelinePosition = await getNextPipelinePosition(prisma, firstStage?.id);

    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        position: position || null,
        source: source || 'external-form',
        notes: notes || null,
        stageId: firstStage?.id,
        pipelinePosition,
      },
    });

    await prisma.activity.create({
      data: { type: 'CAPTURED', description: `Lead capturado via fonte externa: ${source || 'formulário'}`, leadId: lead.id },
    });

    res.status(201).json({ message: 'Lead capturado com sucesso', id: lead.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao capturar lead' });
  }
});

// Embeddable form HTML (public)
router.get('/form', (_req: Request, res: Response) => {
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
      <input type="hidden" name="source" value="website-form">
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
