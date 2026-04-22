import { Resend } from 'resend';

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'SOV CRM <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const resend = API_KEY ? new Resend(API_KEY) : null;

export function isEmailEnabled(): boolean {
  return resend !== null;
}

export function getAppUrl(): string {
  return APP_URL;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY nao configurado - email nao enviado. Link:', params.resetUrl);
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: 'Redefinicao de senha - SOV CRM',
      html: renderPasswordResetHtml(params),
    });
    if (result.error) {
      console.error('Erro ao enviar email:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao enviar email de reset:', err);
    return false;
  }
}

export async function sendTemporaryPasswordEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY nao configurado - email nao enviado. Senha temporaria:', params.temporaryPassword);
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: 'Sua senha foi redefinida - SOV CRM',
      html: renderTemporaryPasswordHtml(params),
    });
    if (result.error) {
      console.error('Erro ao enviar email:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao enviar email de senha temporaria:', err);
    return false;
  }
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
