import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'erp_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** `<userId>.<expiresAt ms>.<HMAC>`: the user id is readable, but can't be changed without the secret. */
export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  const payload = `${userId}.${now + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the user id when the token is authentic and not expired, otherwise null. */
export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const [userId, expiresAt, signature] = token.split('.');
  if (!userId || !expiresAt || !signature) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresAt}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  return Number(expiresAt) > now ? userId : null;
}

/** Read one cookie from a raw `Cookie` header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
