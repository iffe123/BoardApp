import { AppError } from '@/lib/errors/AppError';

interface RunActionConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function runAction<T>(config: RunActionConfig): Promise<T> {
  const idempotencyKey = createIdempotencyKey();
  const headers = new Headers(config.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-idempotency-key', idempotencyKey);

  const response = await fetch(config.url, {
    method: config.method ?? 'POST',
    headers,
    body: config.body === undefined ? undefined : JSON.stringify(config.body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw AppError.fromHttpResponse(response.status, payload, 'Action request failed');
  }

  return payload as T;
}
