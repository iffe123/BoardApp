import {
  cn,
  formatDate,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  calculateMeetingEndTime,
  checkConflictMatch,
  calculateVariance,
} from '@/lib/utils';

describe('cn (className merger)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toContain('2024');
  });

  it('handles invalid dates', () => {
    expect(() => formatDate(new Date('invalid'))).toThrow();
  });
});

describe('formatCurrency', () => {
  it('formats SEK currency correctly', () => {
    const result = formatCurrency(1000000, 'SEK');
    expect(result).toContain('000');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'SEK');
    expect(result).toContain('0');
  });

  it('handles negative numbers', () => {
    const result = formatCurrency(-1000, 'USD');
    expect(result).toContain('1');
  });
});

describe('formatPercentage', () => {
  it('formats percentage correctly', () => {
    expect(formatPercentage(25)).toBe('25.0%');
  });

  it('handles zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('handles custom decimals', () => {
    expect(formatPercentage(12.34, 2)).toBe('12.34%');
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('formatDuration', () => {
  it('formats minutes correctly', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('formats hours correctly', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats hours and minutes correctly', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });
});

describe('calculateMeetingEndTime', () => {
  it('calculates end time correctly', () => {
    const start = new Date('2024-01-15T09:00:00');
    const agendaItems = [
      { id: '1', title: 'Item 1', estimatedDuration: 60, type: 'discussion' as const, order: 1 },
      { id: '2', title: 'Item 2', estimatedDuration: 60, type: 'decision' as const, order: 2 },
    ];
    const result = calculateMeetingEndTime(start, agendaItems);
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('checkConflictMatch', () => {
  it('returns true for matching keywords', () => {
    const conflicts: Array<{ entityName: string; isActive: boolean }> = [
      { entityName: 'TechCorp AB', isActive: true },
    ];
    const keywords = ['TechCorp', 'acquisition'];
    expect(checkConflictMatch(keywords, conflicts)).toBe(true);
  });

  it('returns false for non-matching keywords', () => {
    const conflicts: Array<{ entityName: string; isActive: boolean }> = [
      { entityName: 'OtherCompany', isActive: true },
    ];
    const keywords = ['TechCorp', 'acquisition'];
    expect(checkConflictMatch(keywords, conflicts)).toBe(false);
  });

  it('handles empty conflicts', () => {
    expect(checkConflictMatch(['keyword'], [])).toBe(false);
  });

  it('handles empty keywords', () => {
    const conflicts: Array<{ entityName: string; isActive: boolean }> = [
      { entityName: 'TechCorp', isActive: true },
    ];
    expect(checkConflictMatch([], conflicts)).toBe(false);
  });
});

describe('calculateVariance', () => {
  it('calculates positive variance correctly', () => {
    const result = calculateVariance(110, 100);
    expect(result.percentage).toBeCloseTo(10, 1);
    expect(result.direction).toBe('up');
  });

  it('calculates negative variance correctly', () => {
    const result = calculateVariance(90, 100);
    expect(result.percentage).toBeCloseTo(-10, 1);
    expect(result.direction).toBe('down');
  });

  it('handles zero previous value', () => {
    const result = calculateVariance(100, 0);
    expect(result.percentage).toBe(0);
  });
});
