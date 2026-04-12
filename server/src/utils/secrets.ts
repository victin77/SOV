import crypto from 'crypto';

const SECRET = process.env.APP_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'crm-leads-local-encryption-secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

export function encryptSecret(value?: string | null) {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(value?: string | null) {
  if (!value) return null;

  const raw = Buffer.from(value, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
