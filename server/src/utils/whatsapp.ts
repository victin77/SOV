const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

export function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;

  return digits;
}

export function buildWhatsAppLink(phone?: string | null, message?: string): string | null {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return null;

  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalizedPhone}${query}`;
}

export function isWhatsAppCloudConfigured(config?: { apiToken?: string | null; phoneNumberId?: string | null }): boolean {
  if (config) {
    return Boolean(config.apiToken && config.phoneNumberId);
  }

  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppCloudMessage(params: {
  to: string;
  message: string;
  apiToken?: string | null;
  phoneNumberId?: string | null;
  apiVersion?: string | null;
}) {
  const token = params.apiToken || process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = params.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = params.apiVersion || WHATSAPP_API_VERSION;

  if (!token || !phoneNumberId) {
    throw new Error('Integração do WhatsApp Cloud API não configurada.');
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'text',
        text: {
          preview_url: false,
          body: params.message,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    throw new Error(error || `Falha no envio WhatsApp (${response.status})`);
  }

  return response.json();
}
