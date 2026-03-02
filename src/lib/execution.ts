import type { Decision } from '@/types/schema';

export type ExecutionActionStatus = 'open' | 'in_progress' | 'done' | 'overdue';

export interface ExecutionActionItem {
  id: string;
  tenantId: string;
  decisionId?: string;
  ownerUserId: string;
  title: string;
  description?: string;
  dueDate: Date;
  status: ExecutionActionStatus;
  completionPercentage?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExecutionSummary {
  totalDecisionsLast12Months: number;
  decisionCompletionRate: number;
  openActionsCount: number;
  overdueCount: number;
  avgCompletionTime: number | null;
  actionsByOwner: Array<{ ownerUserId: string; count: number }>;
  impactCategoryBreakdown: Array<{ category: string; count: number }>;
  upcomingDeadlines: ExecutionActionItem[];
  boardPromises: Array<{ decisionId: string; title: string; decidedAt: Date }>;
}

export function normalizeActionStatus(action: ExecutionActionItem, now = new Date()): ExecutionActionStatus {
  if (action.status === 'done') return 'done';
  return action.dueDate.getTime() < now.getTime() ? 'overdue' : action.status;
}

export function getDecisionExecutionStatus(actions: ExecutionActionItem[]): 'not_started' | 'in_progress' | 'completed' {
  if (actions.length === 0) return 'not_started';
  if (actions.every((a) => normalizeActionStatus(a) === 'done')) return 'completed';
  return 'in_progress';
}

export function computeExecutionSummary(
  decisions: Decision[],
  actions: ExecutionActionItem[],
  now = new Date()
): ExecutionSummary {
  const last12MonthsCutoff = new Date(now);
  last12MonthsCutoff.setMonth(last12MonthsCutoff.getMonth() - 12);

  const decisionsLast12Months = decisions.filter((d) => d.decidedAt.toDate() >= last12MonthsCutoff);

  const normalizedActions = actions.map((a) => ({ ...a, status: normalizeActionStatus(a, now) }));
  const openActions = normalizedActions.filter((a) => a.status === 'open' || a.status === 'in_progress');
  const overdueCount = normalizedActions.filter((a) => a.status === 'overdue').length;

  const actionsByDecision = new Map<string, ExecutionActionItem[]>();
  for (const action of normalizedActions) {
    if (!action.decisionId) continue;
    const existing = actionsByDecision.get(action.decisionId) || [];
    existing.push(action);
    actionsByDecision.set(action.decisionId, existing);
  }

  const completedDecisions = decisionsLast12Months.filter((decision) => {
    const linkedActions = actionsByDecision.get(decision.id) || [];
    return linkedActions.length > 0 && linkedActions.every((action) => action.status === 'done');
  }).length;

  const doneActions = normalizedActions.filter((a) => a.status === 'done' && a.completedAt);
  const avgCompletionTime = doneActions.length
    ? doneActions.reduce((acc, action) => {
      const completedAt = action.completedAt as Date;
      return acc + (completedAt.getTime() - action.createdAt.getTime());
    }, 0) / doneActions.length
    : null;

  const ownerMap = new Map<string, number>();
  for (const action of normalizedActions) {
    ownerMap.set(action.ownerUserId, (ownerMap.get(action.ownerUserId) || 0) + 1);
  }

  const impactMap = new Map<string, number>();
  for (const decision of decisionsLast12Months) {
    const category = decision.impactCategory || 'other';
    impactMap.set(category, (impactMap.get(category) || 0) + 1);
  }

  const boardPromises = decisionsLast12Months
    .filter((decision) => (actionsByDecision.get(decision.id) || []).length === 0)
    .map((decision) => ({
      decisionId: decision.id,
      title: decision.title,
      decidedAt: decision.decidedAt.toDate(),
    }));

  const upcomingDeadlines = normalizedActions
    .filter((a) => a.status !== 'done')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8);

  return {
    totalDecisionsLast12Months: decisionsLast12Months.length,
    decisionCompletionRate: decisionsLast12Months.length ? completedDecisions / decisionsLast12Months.length : 0,
    openActionsCount: openActions.length,
    overdueCount,
    avgCompletionTime,
    actionsByOwner: Array.from(ownerMap.entries()).map(([ownerUserId, count]) => ({ ownerUserId, count })),
    impactCategoryBreakdown: Array.from(impactMap.entries()).map(([category, count]) => ({ category, count })),
    upcomingDeadlines,
    boardPromises,
  };
}
