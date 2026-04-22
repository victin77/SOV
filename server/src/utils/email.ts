import nodemailer, { Transporter } from 'nodemailer';
import dns from 'dns';

// Railway nao tem rota IPv6 outbound funcional pro smtp.gmail.com.
// Forcar resolucao IPv4 evita ENETUNREACH em conexoes SMTP.
dns.setDefaultResultOrder('ipv4first');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM = process.env.SMTP_FROM || (SMTP_USER ? `SOV CRM <${SMTP_USER}>` : null);
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter: Transporter | null = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
} else {
  console.warn('SMTP_USER/SMTP_PASS nao configurados - emails ficarao em modo log-only.');
}

export function isEmailEnabled(): boolean {
  return transporter !== null;
}

export function getAppUrl(): string {
  return APP_URL;
}

async function sendMail(params: { to: string; subject: string; html: string; logFallback: string }): Promise<boolean> {
  if (!transporter || !FROM) {
    console.warn(`Email nao enviado (SMTP nao configurado). ${params.logFallback}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log(`Email enviado para ${params.to}: messageId=${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`Falha ao enviar email para ${params.to}:`, err);
    return false;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  return sendMail({
    to: params.to,
    subject: 'Redefinicao de senha - SOV CRM',
    html: renderPasswordResetHtml(params),
    logFallback: `Link de reset para ${params.to}: ${params.resetUrl}`,
  });
}

export async function sendTemporaryPasswordEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
}): Promise<boolean> {
  return sendMail({
    to: params.to,
    subject: 'Sua senha foi redefinida - SOV CRM',
    html: renderTemporaryPasswordHtml(params),
    logFallback: `Senha temporaria para ${params.to}: ${params.temporaryPassword}`,
  });
}

function renderPasswordResetHtml(params: { name: string; resetUrl: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #6366f1;">Redefinicao de senha</h2>
      <p>Ola, ${escapeHtml(params.name)}.</p>
      <p>Recebemos uma solicitacao para redefinir sua senha no SOV CRM. Clique no botao abaixo para escolher uma nova senha. O link expira em 1 hora.</p>
      <p style="margin: 24px 0;">
        <a href="${params.resetUrl}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Redefinir senha</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">Se voce nao solicitou esta redefinicao, ignore este email - sua senha atual continua valida.</p>
      <p style="font-size: 12px; color: #6b7280;">Se o botao nao funcionar, copie e cole este link no navegador:<br>${params.resetUrl}</p>
    </div>
  `;
}

function renderTemporaryPasswordHtml(params: { name: string; temporaryPassword: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #6366f1;">Sua senha foi redefinida</h2>
      <p>Ola, ${escapeHtml(params.name)}.</p>
      <p>Um administrador redefiniu sua senha no SOV CRM. Use a senha temporaria abaixo para entrar:</p>
      <p style="background: #f3f4f6; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 1px;">
        ${escapeHtml(params.temporaryPassword)}
      </p>
      <p>Voce sera obrigado a definir uma nova senha no primeiro login.</p>
      <p style="font-size: 12px; color: #6b7280;">Se voce nao esperava essa mudanca, entre em contato com o administrador da sua empresa.</p>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
