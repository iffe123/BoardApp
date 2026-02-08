/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup to prevent
 * cryptic runtime errors from missing configuration.
 */

import { z } from 'zod';

/**
 * Schema for server-side environment variables
 */
const serverEnvSchema = z.object({
  // Anthropic AI (required for AI features)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // BankID (required for signing features)
  BANKID_API_URL: z.string().url().optional(),
  BANKID_PFX_PATH: z.string().optional(),
  BANKID_PFX_PASSPHRASE: z.string().optional(),

  // ERP Integrations
  FORTNOX_CLIENT_ID: z.string().optional(),
  FORTNOX_CLIENT_SECRET: z.string().optional(),

  // Calendar Integrations
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Resend (email)
  RESEND_API_KEY: z.string().optional(),

  // App config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Schema for client-side environment variables (NEXT_PUBLIC_*)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate server environment variables.
 * Call this in API routes or server components.
 */
export function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`[env] Server environment validation failed:\n${formatted}`);
    // Don't throw during build - just warn
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing or invalid environment variables:\n${formatted}`);
    }
    return serverEnvSchema.parse({
      ...process.env,
    });
  }
  return result.data;
}

/**
 * Validate client environment variables.
 * Call this in the root layout or providers.
 */
export function validateClientEnv(): ClientEnv {
  const clientVars: Record<string, string | undefined> = {};
  for (const key of clientEnvSchema.keyof().options) {
    clientVars[key] = process.env[key];
  }

  const result = clientEnvSchema.safeParse(clientVars);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.warn(`[env] Client environment validation warnings:\n${formatted}`);
  }
  return result.success ? result.data : (clientVars as ClientEnv);
}
