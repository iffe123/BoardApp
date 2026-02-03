/**
 * AI Hook for GovernanceOS
 *
 * React hook for using AI features in components.
 * Provides easy access to all AI capabilities with loading and error states.
 */

import { useState, useCallback } from 'react';
import {
  getAIService,
  type AIAnalysisResult,
  type FinancialPeriodInput,
  type MeetingInput,
  type AIAnalysisOptions,
} from '@/lib/ai-service';

interface UseAIOptions {
  onSuccess?: (result: AIAnalysisResult) => void;
  onError?: (error: Error) => void;
}

interface UseAIReturn {
  // State
  isLoading: boolean;
  error: Error | null;
  result: AIAnalysisResult | null;

  // Analysis methods
  analyzeComprehensive: (
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  analyzeRisks: (
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  analyzeFinancialHealth: (
    financialData: FinancialPeriodInput[],
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  analyzeCashflow: (
    financialData: FinancialPeriodInput[],
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  summarizeMeeting: (
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  extractActions: (
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  suggestFollowUps: (
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  checkCompliance: (
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ) => Promise<AIAnalysisResult>;

  // Utilities
  reset: () => void;
}

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);

  const aiService = getAIService();

  const handleAnalysis = useCallback(
    async <T extends unknown[]>(
      analysisMethod: (...args: T) => Promise<AIAnalysisResult>,
      ...args: T
    ): Promise<AIAnalysisResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const analysisResult = await analysisMethod(...args);

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }

        setResult(analysisResult);
        onSuccess?.(analysisResult);
        return analysisResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Analysis failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const analyzeComprehensive = useCallback(
    (
      financialData?: FinancialPeriodInput[],
      meetingData?: MeetingInput,
      analysisOptions?: AIAnalysisOptions
    ) =>
      handleAnalysis(
        aiService.analyzeComprehensive.bind(aiService),
        financialData,
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const analyzeRisks = useCallback(
    (
      financialData?: FinancialPeriodInput[],
      meetingData?: MeetingInput,
      analysisOptions?: AIAnalysisOptions
    ) =>
      handleAnalysis(
        aiService.analyzeRisks.bind(aiService),
        financialData,
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const analyzeFinancialHealth = useCallback(
    (financialData: FinancialPeriodInput[], analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.analyzeFinancialHealth.bind(aiService),
        financialData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const analyzeCashflow = useCallback(
    (financialData: FinancialPeriodInput[], analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.analyzeCashflow.bind(aiService),
        financialData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const summarizeMeeting = useCallback(
    (meetingData: MeetingInput, analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.summarizeMeeting.bind(aiService),
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const extractActions = useCallback(
    (meetingData: MeetingInput, analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.extractActions.bind(aiService),
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const suggestFollowUps = useCallback(
    (meetingData: MeetingInput, analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.suggestFollowUps.bind(aiService),
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
  );

  const checkCompliance = useCallback(
    (meetingData: MeetingInput, analysisOptions?: AIAnalysisOptions) =>
      handleAnalysis(
        aiService.checkCompliance.bind(aiService),
        meetingData,
        analysisOptions
      ),
    [handleAnalysis, aiService]
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
    analyzeComprehensive,
    analyzeRisks,
    analyzeFinancialHealth,
    analyzeCashflow,
    summarizeMeeting,
    extractActions,
    suggestFollowUps,
    checkCompliance,
    reset,
  };
}

/**
 * Hook for checking AI availability
 */
export function useAIAvailability() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [setupInstructions, setSetupInstructions] = useState<string[] | null>(null);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    try {
      const aiService = getAIService();
      const result = await aiService.checkAvailability();
      setIsAvailable(result.available);
      setSetupInstructions(result.setupInstructions || null);
    } catch {
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isAvailable,
    isChecking,
    setupInstructions,
    checkAvailability,
  };
}
