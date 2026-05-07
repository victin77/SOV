import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  location?: string | null;
  attendeeEmail?: string | null;
}

function getRedirectUri(): string {
  const explicit = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.APP_URL || 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/api/auth/google-calendar/callback`;
}

export function isCalendarSyncEnabled(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function buildOAuthClient(): OAuth2Client {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google Calendar nao configurado: faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, getRedirectUri());
}

export function buildAuthorizationUrl(state: string): string {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForRefreshToken(code: string): Promise<string | null> {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens.refresh_token || null;
}

function authedClientFor(refreshToken: string): OAuth2Client {
  const client = buildOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function calendarFor(refreshToken: string) {
  return google.calendar({ version: 'v3', auth: authedClientFor(refreshToken) });
}

function toEventResource(input: CalendarEventInput) {
  return {
    summary: input.title,
    description: input.description || undefined,
    location: input.location || undefined,
    start: { dateTime: input.startDate.toISOString() },
    end: { dateTime: input.endDate.toISOString() },
    attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
    reminders: { useDefault: true },
  };
}

export async function createCalendarEvent(
  refreshToken: string,
  input: CalendarEventInput
): Promise<string | null> {
  const calendar = calendarFor(refreshToken);
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: toEventResource(input),
  });
  return response.data.id || null;
}

export async function updateCalendarEvent(
  refreshToken: string,
  eventId: string,
  input: CalendarEventInput
): Promise<void> {
  const calendar = calendarFor(refreshToken);
  await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: toEventResource(input),
  });
}

export async function deleteCalendarEvent(refreshToken: string, eventId: string): Promise<void> {
  const calendar = calendarFor(refreshToken);
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (err) {
    const status = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
    if (status === 404 || status === 410) return; // ja apagado, ignora
    throw err;
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const client = authedClientFor(refreshToken);
    await client.revokeToken(refreshToken);
  } catch {
    // se ja estiver revogado/invalido, apenas ignora
  }
}
