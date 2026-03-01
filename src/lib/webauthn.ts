import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { Timestamp, collections, getDoc } from '@/lib/firebase';

export type WebAuthnPurpose = 'registration' | 'authentication';

export interface TenantSecurityPolicy {
  requireWebAuthnStepUp: boolean;
  requireWebAuthnForRoles?: string[];
  sessionTtlHours: number;
  enforceForDashboard: boolean;
}

export const WEBAUTHN_COOKIE_NAME = '__Host-webauthn';

export function getRpId(originHeader?: string | null): string {
  if (process.env.BOARDAPP_RP_ID) return process.env.BOARDAPP_RP_ID;
  if (!originHeader) return 'localhost';
  try {
    return new URL(originHeader).hostname;
  } catch {
    return 'localhost';
  }
}

export function getExpectedOrigins(): string[] {
  const explicit = process.env.BOARDAPP_ORIGIN;
  if (explicit) return explicit.split(',').map((v) => v.trim()).filter(Boolean);
  return ['http://localhost:3000'];
}

export function defaultSecurityPolicy(): TenantSecurityPolicy {
  return {
    requireWebAuthnStepUp: false,
    sessionTtlHours: 12,
    enforceForDashboard: true,
  };
}

export async function getTenantSecurityPolicy(tenantId: string): Promise<TenantSecurityPolicy> {
  const tenantDoc = await getDoc(collections.tenant(tenantId));
  if (!tenantDoc.exists()) return defaultSecurityPolicy();
  const data = tenantDoc.data() as Record<string, unknown>;
  const policy = (data.securityPolicy || {}) as Partial<TenantSecurityPolicy>;
  return {
    ...defaultSecurityPolicy(),
    ...policy,
  };
}

export function createChallenge(): string {
  return randomBytes(32).toString('base64url');
}

export function createSignedSessionToken(payload: { userId: string; tenantId: string; exp: number }): string {
  const secret = process.env.WEB_AUTHN_JWT_SECRET || 'dev-only-secret';
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySignedSessionToken(token: string | undefined | null): { userId: string; tenantId: string; exp: number } | null {
  if (!token) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const secret = process.env.WEB_AUTHN_JWT_SECRET || 'dev-only-secret';
  const expectedSig = createHmac('sha256', secret).update(encoded).digest();
  const providedSig = Buffer.from(sig, 'base64url');
  if (expectedSig.length !== providedSig.length || !timingSafeEqual(expectedSig, providedSig)) return null;

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function getWebAuthnSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(WEBAUTHN_COOKIE_NAME)?.value;
  return verifySignedSessionToken(token);
}

export function challengeExpiresAt(minutes = 5) {
  return Timestamp.fromMillis(Date.now() + minutes * 60 * 1000);
}

export function parseClientDataJSON(clientDataJSON: string): { challenge: string; origin: string; type: string } {
  const parsed = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8')) as {
    challenge: string;
    origin: string;
    type: string;
  };
  return parsed;
}

export function shouldRequireStepUp(policy: TenantSecurityPolicy, role?: string): boolean {
  if (!policy.requireWebAuthnStepUp) return false;
  if (!policy.requireWebAuthnForRoles || policy.requireWebAuthnForRoles.length === 0) return true;
  return role ? policy.requireWebAuthnForRoles.includes(role) : false;
}
