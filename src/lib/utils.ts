import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import type { AgendaItem } from '@/types/schema';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date, locale: string = 'sv-SE'): string {
  const dateLocale = locale.startsWith('sv') ? sv : enUS;

  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm', { locale: dateLocale })}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'HH:mm', { locale: dateLocale })}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm', { locale: dateLocale })}`;
  }

  return format(date, 'PPp', { locale: dateLocale });
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date, locale: string = 'sv-SE'): string {
  const dateLocale = locale.startsWith('sv') ? sv : enUS;
  return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
}

/**
 * Format relative date (alias for formatRelativeTime for compatibility)
 */
export function formatRelativeDate(date: Date, locale: string = 'sv-SE'): string {
  return formatRelativeTime(date, locale);
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Calculate meeting end time from agenda items
 */
export function calculateMeetingEndTime(startTime: Date, agendaItems: AgendaItem[]): Date {
  const totalMinutes = agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);
  return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
}

/**
 * Calculate total agenda duration
 */
export function calculateAgendaDuration(agendaItems: AgendaItem[]): number {
  return agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format currency (Swedish default)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'SEK',
  locale: string = 'sv-SE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number, locale: string = 'sv-SE'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if string contains another string (case insensitive, fuzzy)
 */
export function fuzzyMatch(text: string, search: string): boolean {
  const searchLower = search.toLowerCase();
  const textLower = text.toLowerCase();

  // Direct inclusion
  if (textLower.includes(searchLower)) return true;

  // Word-level matching
  const searchWords = searchLower.split(/\s+/);
  return searchWords.every((word) => textLower.includes(word));
}

/**
 * Check for conflict of interest match
 */
export function checkConflictMatch(
  agendaKeywords: string[],
  userConflicts: Array<{ entityName: string; isActive: boolean }>
): boolean {
  const activeConflicts = userConflicts.filter((c) => c.isActive);
  if (activeConflicts.length === 0 || agendaKeywords.length === 0) return false;

  return agendaKeywords.some((keyword) =>
    activeConflicts.some((conflict) => fuzzyMatch(conflict.entityName, keyword))
  );
}

/**
 * Calculate financial variance
 */
export function calculateVariance(current: number, previous: number): {
  absolute: number;
  percentage: number;
  direction: 'up' | 'down' | 'unchanged';
} {
  const absolute = current - previous;
  const percentage = previous !== 0 ? (absolute / previous) * 100 : 0;

  let direction: 'up' | 'down' | 'unchanged' = 'unchanged';
  if (absolute > 0) direction = 'up';
  else if (absolute < 0) direction = 'down';

  return { absolute, percentage, direction };
}

/**
 * Generate SHA-256 hash
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get agenda item type color
 */
export function getAgendaItemTypeColor(type: string): string {
  const colors: Record<string, string> = {
    information: 'bg-blue-100 text-blue-800',
    decision: 'bg-amber-100 text-amber-800',
    discussion: 'bg-purple-100 text-purple-800',
    formality: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Get meeting status color
 */
export function getMeetingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-slate-100 text-slate-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get decision outcome color
 */
export function getDecisionOutcomeColor(outcome: string): string {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    tabled: 'bg-yellow-100 text-yellow-800',
    withdrawn: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
  };
  return colors[outcome] || 'bg-gray-100 text-gray-800';
}
