import {
  formatNumber,
  getInitials,
  truncate,
  generateId,
  debounce,
  fuzzyMatch,
  safeJsonParse,
  getAgendaItemTypeColor,
  getMeetingStatusColor,
  getDecisionOutcomeColor,
} from '@/lib/utils';

describe('formatNumber', () => {
  it('formats integers with thousands separator for sv-SE locale', () => {
    const result = formatNumber(1000000, 'sv-SE');
    // Swedish locale uses non-breaking space as thousands separator
    expect(result.replace(/\s/g, ' ')).toContain('1 000 000');
  });

  it('formats small numbers without separator', () => {
    expect(formatNumber(42, 'sv-SE')).toBe('42');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats negative numbers', () => {
    const result = formatNumber(-5000, 'sv-SE');
    expect(result.replace(/\s/g, ' ')).toMatch(/-5 000|−5 000/);
  });

  it('formats decimal numbers', () => {
    const result = formatNumber(1234.56, 'en-US');
    expect(result).toBe('1,234.56');
  });

  it('uses sv-SE locale by default', () => {
    const result = formatNumber(1000);
    // Should use Swedish formatting (space as thousands separator)
    expect(result.replace(/\s/g, ' ')).toContain('1 000');
  });

  it('formats with en-US locale', () => {
    expect(formatNumber(1000000, 'en-US')).toBe('1,000,000');
  });
});

describe('getInitials', () => {
  it('gets initials from a two-part name', () => {
    expect(getInitials('Anna Svensson')).toBe('AS');
  });

  it('gets initials from a single name', () => {
    expect(getInitials('Anna')).toBe('A');
  });

  it('limits initials to two characters for long names', () => {
    expect(getInitials('Anna Maria Svensson Lindqvist')).toBe('AM');
  });

  it('converts initials to uppercase', () => {
    expect(getInitials('anna svensson')).toBe('AS');
  });

  it('handles three-part names by taking first two initials', () => {
    expect(getInitials('Erik von Sydow')).toBe('EV');
  });
});

describe('truncate', () => {
  it('returns full text when shorter than maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('returns full text when exactly maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('truncates text with ellipsis when longer than maxLength', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('truncates long strings correctly', () => {
    const long = 'This is a very long string that should be truncated';
    const result = truncate(long, 20);
    expect(result).toBe('This is a very lo...');
    expect(result.length).toBe(20);
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('generateId', () => {
  it('generates a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('generates non-empty strings', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs on successive calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('contains a hyphen separator', () => {
    const id = generateId();
    expect(id).toContain('-');
  });

  it('generates multiple unique IDs in a batch', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call the function immediately', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the function after the wait period', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);
    // Only 100ms since the second call, so fn should not be called yet
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the debounced function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced('arg1', 'arg2');
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('uses the arguments from the last call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced('first');
    debounced('second');
    debounced('third');
    jest.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('can be called again after the wait period', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('fuzzyMatch', () => {
  it('matches exact text case-insensitively', () => {
    expect(fuzzyMatch('Hello World', 'hello world')).toBe(true);
  });

  it('matches substring', () => {
    expect(fuzzyMatch('Hello World', 'World')).toBe(true);
  });

  it('matches all search words in any order', () => {
    expect(fuzzyMatch('Hello Beautiful World', 'World Hello')).toBe(true);
  });

  it('returns false when not all words match', () => {
    expect(fuzzyMatch('Hello World', 'Hello Moon')).toBe(false);
  });

  it('returns true for empty search string', () => {
    expect(fuzzyMatch('Hello World', '')).toBe(true);
  });

  it('returns false when text does not contain search', () => {
    expect(fuzzyMatch('Hello', 'World')).toBe(false);
  });

  it('handles case-insensitive partial matching', () => {
    expect(fuzzyMatch('TechCorp AB', 'techcorp')).toBe(true);
  });

  it('matches single word from multi-word text', () => {
    expect(fuzzyMatch('Board Meeting Agenda', 'meeting')).toBe(true);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', { default: true })).toEqual({ default: true });
  });

  it('parses JSON arrays', () => {
    expect(safeJsonParse('[1, 2, 3]', [])).toEqual([1, 2, 3]);
  });

  it('returns fallback for empty string', () => {
    expect(safeJsonParse('', null)).toBeNull();
  });

  it('parses primitive JSON values', () => {
    expect(safeJsonParse('42', 0)).toBe(42);
    expect(safeJsonParse('"hello"', '')).toBe('hello');
    expect(safeJsonParse('true', false)).toBe(true);
    expect(safeJsonParse('null', 'fallback')).toBeNull();
  });

  it('returns fallback for truncated JSON', () => {
    expect(safeJsonParse('{"key": "val', { error: true })).toEqual({ error: true });
  });
});

describe('getAgendaItemTypeColor', () => {
  it('returns correct color for information type', () => {
    expect(getAgendaItemTypeColor('information')).toBe('bg-blue-100 text-blue-800');
  });

  it('returns correct color for decision type', () => {
    expect(getAgendaItemTypeColor('decision')).toBe('bg-amber-100 text-amber-800');
  });

  it('returns correct color for discussion type', () => {
    expect(getAgendaItemTypeColor('discussion')).toBe('bg-purple-100 text-purple-800');
  });

  it('returns correct color for formality type', () => {
    expect(getAgendaItemTypeColor('formality')).toBe('bg-gray-100 text-gray-800');
  });

  it('returns default color for unknown type', () => {
    expect(getAgendaItemTypeColor('unknown')).toBe('bg-gray-100 text-gray-800');
  });

  it('returns default color for empty string', () => {
    expect(getAgendaItemTypeColor('')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getMeetingStatusColor', () => {
  it('returns correct color for draft status', () => {
    expect(getMeetingStatusColor('draft')).toBe('bg-gray-100 text-gray-800');
  });

  it('returns correct color for scheduled status', () => {
    expect(getMeetingStatusColor('scheduled')).toBe('bg-blue-100 text-blue-800');
  });

  it('returns correct color for active status', () => {
    expect(getMeetingStatusColor('active')).toBe('bg-green-100 text-green-800');
  });

  it('returns correct color for completed status', () => {
    expect(getMeetingStatusColor('completed')).toBe('bg-slate-100 text-slate-800');
  });

  it('returns correct color for cancelled status', () => {
    expect(getMeetingStatusColor('cancelled')).toBe('bg-red-100 text-red-800');
  });

  it('returns default color for unknown status', () => {
    expect(getMeetingStatusColor('unknown')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getDecisionOutcomeColor', () => {
  it('returns correct color for approved outcome', () => {
    expect(getDecisionOutcomeColor('approved')).toBe('bg-green-100 text-green-800');
  });

  it('returns correct color for rejected outcome', () => {
    expect(getDecisionOutcomeColor('rejected')).toBe('bg-red-100 text-red-800');
  });

  it('returns correct color for tabled outcome', () => {
    expect(getDecisionOutcomeColor('tabled')).toBe('bg-yellow-100 text-yellow-800');
  });

  it('returns correct color for withdrawn outcome', () => {
    expect(getDecisionOutcomeColor('withdrawn')).toBe('bg-gray-100 text-gray-800');
  });

  it('returns correct color for pending outcome', () => {
    expect(getDecisionOutcomeColor('pending')).toBe('bg-blue-100 text-blue-800');
  });

  it('returns default color for unknown outcome', () => {
    expect(getDecisionOutcomeColor('unknown')).toBe('bg-gray-100 text-gray-800');
  });

  it('returns default color for empty string', () => {
    expect(getDecisionOutcomeColor('')).toBe('bg-gray-100 text-gray-800');
  });
});
