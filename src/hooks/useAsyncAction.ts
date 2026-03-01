'use client';

import { useCallback, useState } from 'react';

interface UseAsyncActionOptions<TArgs, TResult> {
  action: (args: TArgs) => Promise<TResult>;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

interface UseAsyncActionResult<TArgs, TResult> {
  execute: (args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: Error | null;
}

export function useAsyncAction<TArgs, TResult>(
  opts: UseAsyncActionOptions<TArgs, TResult>
): UseAsyncActionResult<TArgs, TResult> {
  const { action, onSuccess, onError } = opts;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (args: TArgs): Promise<TResult> => {
      if (loading) {
        throw new Error('Action is already in progress.');
      }

      setLoading(true);
      setError(null);

      try {
        const result = await action(args);
        await onSuccess?.(result);
        return result;
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('Action failed');
        setError(normalizedError);
        await onError?.(normalizedError);
        throw normalizedError;
      } finally {
        setLoading(false);
      }
    },
    [action, loading, onError, onSuccess]
  );

  return { execute, loading, error };
}
