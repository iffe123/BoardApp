function randomKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function runAction<T>(input: {
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: Record<string, unknown>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<T> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': input.idempotencyKey || randomKey(),
      ...(input.headers || {}),
    },
    body: JSON.stringify(input.body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Action failed');
  }

  return response.json();
}
