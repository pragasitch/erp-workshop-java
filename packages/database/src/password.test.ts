import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the original password', async () => {
    const stored = await hashPassword('password');

    await expect(verifyPassword('password', stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('password');

    await expect(verifyPassword('wrong', stored)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('password')).not.toBe(await hashPassword('password'));
  });

  it('rejects a malformed stored value', async () => {
    await expect(verifyPassword('password', 'not-a-hash')).resolves.toBe(false);
  });
});
