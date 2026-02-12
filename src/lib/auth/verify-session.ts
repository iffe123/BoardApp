/**
 * API Route Authentication Middleware
 *
 * Verifies Firebase ID tokens from the Authorization header.
 * Uses the Firebase client SDK to validate tokens since this app
 * runs on Vercel (no Firebase Admin SDK required for token decode).
 *
 * For production, consider using Firebase Admin SDK with service account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collections, getDoc } from '@/lib/firebase';

interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
  tenants?: Record<string, string>;
}

interface AuthResult {
  user: DecodedToken;
  token: string;
}

/**
 * Extract and validate the Bearer token from the request
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Decode a Firebase ID token (JWT) without server-side Admin SDK.
 * Parses the JWT payload to extract user claims.
 *
 * Note: In production, replace this with Firebase Admin SDK's
 * `getAuth().verifyIdToken(token)` for cryptographic verification.
 */
function decodeToken(token: string): DecodedToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const payload = JSON.parse(
    Buffer.from(parts[1]!, 'base64url').toString('utf-8')
  );

  // Check token expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return {
    uid: payload.sub || payload.user_id,
    email: payload.email,
    name: payload.name,
    tenants: payload.tenants,
  };
}

/**
 * Verify the session from a NextRequest.
 * Returns the decoded user token or throws an error.
 */
export async function verifySession(request: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  try {
    const user = decodeToken(token);
    if (!user.uid) {
      throw new AuthError('Invalid token: missing user ID', 401);
    }
    return { user, token };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid or expired token', 401);
  }
}

/**
 * Verify that the authenticated user has access to a specific tenant.
 * Checks JWT claims first, then falls back to Firestore membership lookup
 * (needed because custom claims may not be set without Firebase Admin SDK).
 */
export async function verifyTenantAccess(
  user: DecodedToken,
  tenantId: string
): Promise<void> {
  // Check JWT claims first
  if (user.tenants && tenantId in user.tenants) {
    return;
  }

  // Fallback: check Firestore membership directly
  try {
    const memberDoc = await getDoc(collections.member(tenantId, user.uid));
    if (memberDoc.exists()) {
      // Populate the tenants map so subsequent checks (e.g. role) work
      if (!user.tenants) user.tenants = {};
      const memberData = memberDoc.data();
      user.tenants[tenantId] = memberData.role as string;
      return;
    }
  } catch {
    // If Firestore lookup fails, fall through to denial
  }

  throw new AuthError('Access denied: no access to this organization', 403);
}

/**
 * Verify that the authenticated user has a specific role in a tenant.
 */
export async function verifyTenantRole(
  user: DecodedToken,
  tenantId: string,
  allowedRoles: string[]
): Promise<void> {
  await verifyTenantAccess(user, tenantId);
  const role = user.tenants![tenantId]!;
  if (!allowedRoles.includes(role)) {
    throw new AuthError('Access denied: insufficient permissions', 403);
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Create a standard error response for auth failures
 */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  return NextResponse.json(
    { error: 'Authentication failed' },
    { status: 401 }
  );
}
