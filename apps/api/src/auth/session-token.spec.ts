import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  readCookie,
  SESSION_TTL_MS,
  verifySessionToken,
} from './session-token.js';

const secret = 'test-secret-that-is-at-least-32-characters';

describe('session token', () => {
  it('round-trips the user id', () => {
    const token = createSessionToken('user-1', secret);

    expect(verifySessionToken(token, secret)).toBe('user-1');
  });

  it('rejects a token whose user id was changed', () => {
    const [, expiresAt, signature] = createSessionToken('user-1', secret).split('.');

    expect(verifySessionToken(`user-2.${expiresAt}.${signature}`, secret)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = createSessionToken('user-1', 'another-secret-that-is-at-least-32-chars');

    expect(verifySessionToken(token, secret)).toBeNull();
  });

  it('rejects an expired token', () => {
    const issuedAt = Date.now() - SESSION_TTL_MS - 1;
    const token = createSessionToken('user-1', secret, issuedAt);

    expect(verifySessionToken(token, secret)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifySessionToken('nope', secret)).toBeNull();
  });
});

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('a=1; erp_session=abc.def; b=2', 'erp_session')).toBe('abc.def');
  });

  it('returns undefined when the header or cookie is missing', () => {
    expect(readCookie(undefined, 'erp_session')).toBeUndefined();
    expect(readCookie('a=1', 'erp_session')).toBeUndefined();
  });
});
