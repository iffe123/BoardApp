import { defaultSecurityPolicy, shouldRequireStepUp, verifySignedSessionToken, createSignedSessionToken, getRpId } from '@/lib/webauthn';

describe('webauthn helpers', () => {
  it('resolves rp id from origin fallback', () => {
    expect(getRpId('http://localhost:3000')).toBe('localhost');
  });

  it('applies role based policy', () => {
    const policy = { ...defaultSecurityPolicy(), requireWebAuthnStepUp: true, requireWebAuthnForRoles: ['admin'] };
    expect(shouldRequireStepUp(policy, 'admin')).toBe(true);
    expect(shouldRequireStepUp(policy, 'director')).toBe(false);
  });

  it('creates and verifies signed step-up token', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = createSignedSessionToken({ userId: 'u1', tenantId: 't1', exp });
    const payload = verifySignedSessionToken(token);
    expect(payload?.tenantId).toBe('t1');
  });
});
