'use client';

import { useCallback, useState } from 'react';

interface UseAsyncActionOptions<TArgs extends unknown[], TResult> {
  action: (...args: TArgs) => Promise<TResult>;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncActionReturn<TArgs extends unknown[]> {
  loading: boolean;
  error: string | null;
  execute: (...args: TArgs) => Promise<void>;
  resetError: () => void;
}

export function useAsyncAction<TArgs extends unknown[], TResult>({
  action,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Something went wrong. Please try again.',
}: UseAsyncActionOptions<TArgs, TResult>): UseAsyncActionReturn<TArgs> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: TArgs) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await action(...args);
      if (successMessage) {
        console.info(successMessage);
      }
      if (onSuccess) {
        await onSuccess(result);
      }
    } catch (err) {
      console.error('Unhandled action error:', err);
      const resolvedError = err instanceof Error ? err : new Error(errorMessage);
      setError(resolvedError.message || errorMessage);
      if (onError) {
        await onError(resolvedError);
      }
    } finally {
      setLoading(false);
    }
  }, [action, errorMessage, loading, onError, onSuccess, successMessage]);

  const resetError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    execute,
    resetError,
  };
}
