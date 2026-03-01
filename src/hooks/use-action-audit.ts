'use client';

import { useCallback, useState } from 'react';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

interface ActionAuditOptions {
  tenantId: string;
  action: string;
  successMessage?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface ActionAuditEvent {
  tenantId: string;
  action: string;
  status: Exclude<ActionStatus, 'idle' | 'loading'>;
  message: string;
  metadata?: Record<string, unknown>;
}

export function useActionAudit() {
  const [statusByAction, setStatusByAction] = useState<Record<string, ActionStatus>>({});
  const [lastErrorByAction, setLastErrorByAction] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const logAuditEvent = useCallback(async (event: ActionAuditEvent) => {
    try {
      await fetch('/api/action-audit-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('[ActionAudit] Failed to log audit event', { event, error });
    }
  }, []);

  const runAction = useCallback(async <T>(
    options: ActionAuditOptions,
    actionFn: () => Promise<T>
  ): Promise<T> => {
    setStatusByAction((prev) => ({ ...prev, [options.action]: 'loading' }));
    setLastErrorByAction((prev) => ({ ...prev, [options.action]: '' }));

    try {
      const result = await actionFn();
      const successMessage = options.successMessage || 'Ändringen sparades.';
      setStatusByAction((prev) => ({ ...prev, [options.action]: 'success' }));
      setToastMessage(successMessage);
      await logAuditEvent({
        tenantId: options.tenantId,
        action: options.action,
        status: 'success',
        message: successMessage,
        metadata: options.metadata,
      });
      return result;
    } catch (error) {
      const fallbackMessage = options.errorMessage || 'Något gick fel. Försök igen.';
      const message = error instanceof Error ? error.message : fallbackMessage;
      const uiMessage = message || fallbackMessage;

      console.error(`[ActionAudit] ${options.action} failed`, error);
      setStatusByAction((prev) => ({ ...prev, [options.action]: 'error' }));
      setLastErrorByAction((prev) => ({ ...prev, [options.action]: uiMessage }));
      setToastMessage(uiMessage);

      await logAuditEvent({
        tenantId: options.tenantId,
        action: options.action,
        status: 'error',
        message: uiMessage,
        metadata: options.metadata,
      });
      throw error;
    }
  }, [logAuditEvent]);

  return {
    runAction,
    statusByAction,
    lastErrorByAction,
    toastMessage,
    dismissToast: () => setToastMessage(null),
  };
}

