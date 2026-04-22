import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!CLIENT_ID) {
  console.warn('GOOGLE_CLIENT_ID nao definido. Login via Google ficara desativado.');
}

const client = CLIENT_ID ? new OAuth2Client(CLIENT_ID) : null;

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  googleId: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  if (!client || !CLIENT_ID) return null;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) return null;

    return {
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      googleId: payload.sub,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (err) {
    console.error('Falha ao validar Google ID token:', err);
    return null;
  }
}

export function isGoogleLoginEnabled(): boolean {
  return client !== null;
}
