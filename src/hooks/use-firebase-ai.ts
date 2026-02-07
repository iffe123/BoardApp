/**
 * Firebase AI Logic React Hook
 *
 * Provides client-side access to Gemini AI via Firebase AI Logic.
 * Uses the Firebase AI SDK directly — no separate API key required.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  getFirebaseAIService,
  type FirebaseAIService,
} from '@/lib/firebase-ai';
import type {
  AIAnalysisResult,
  AIAnalysisType,
  FinancialPeriodInput,
  MeetingInput,
  AIAnalysisOptions,
} from '@/lib/ai-service';

interface UseFirebaseAIOptions {
  onSuccess?: (result: AIAnalysisResult) => void;
  onError?: (error: Error) => void;
}

interface UseFirebaseAIReturn {
  isLoading: boolean;
  error: Error | null;
  result: AIAnalysisResult | null;
  isAvailable: boolean | null;

  analyze: (
    analysisType: AIAnalysisType,
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  generateMinutes: FirebaseAIService['generateMinutes'];
  summarizeText: FirebaseAIService['summarizeText'];
  checkAvailability: () => Promise<boolean>;
  reset: () => void;
}

export function useFirebaseAI(options: UseFirebaseAIOptions = {}): UseFirebaseAIReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const service = getFirebaseAIService();

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const { available } = await service.checkAvailability();
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, [service]);

  const analyze = useCallback(
    async (
      analysisType: AIAnalysisType,
      financialData?: FinancialPeriodInput[],
      meetingData?: MeetingInput,
      analysisOptions?: AIAnalysisOptions
    ): Promise<AIAnalysisResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const analysisResult = await service.analyze(
          analysisType,
          financialData,
          meetingData,
          analysisOptions
        );

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }

        setResult(analysisResult);
        onSuccess?.(analysisResult);
        return analysisResult;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Analysis failed');
        setError(e);
        onError?.(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [service, onSuccess, onError]
  );

  const generateMinutes = useCallback(
    (...args: Parameters<FirebaseAIService['generateMinutes']>) =>
      service.generateMinutes(...args),
    [service]
  );

  const summarizeText = useCallback(
    (...args: Parameters<FirebaseAIService['summarizeText']>) =>
      service.summarizeText(...args),
    [service]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    isAvailable,
    analyze,
    generateMinutes,
    summarizeText,
    checkAvailability,
    reset,
  };
}
