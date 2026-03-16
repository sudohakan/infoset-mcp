const {
  PRIORITY_MAP,
  STATUS_MAP,
  getPriorityInfo,
  getStatusText,
  truncate,
} = require('../src/utils');

describe('utils.js', () => {
  describe('PRIORITY_MAP', () => {
    test('contains all 4 priority levels', () => {
      expect(PRIORITY_MAP[1]).toEqual({ label: 'Low', emoji: '🟢' });
      expect(PRIORITY_MAP[2]).toEqual({ label: 'Medium', emoji: '🟡' });
      expect(PRIORITY_MAP[3]).toEqual({ label: 'High', emoji: '🟠' });
      expect(PRIORITY_MAP[4]).toEqual({ label: 'Urgent', emoji: '🔴' });
    });
  });

  describe('STATUS_MAP', () => {
    test('contains all 4 statuses', () => {
      expect(STATUS_MAP[1]).toBe('Open');
      expect(STATUS_MAP[2]).toBe('Pending');
      expect(STATUS_MAP[3]).toBe('Resolved');
      expect(STATUS_MAP[4]).toBe('Closed');
    });
  });

  describe('getPriorityInfo', () => {
    test('returns correct info for valid priorities', () => {
      expect(getPriorityInfo(1).label).toBe('Low');
      expect(getPriorityInfo(4).emoji).toBe('🔴');
    });

    test('defaults to Medium for unknown priority', () => {
      expect(getPriorityInfo(null)).toEqual(PRIORITY_MAP[2]);
      expect(getPriorityInfo(undefined)).toEqual(PRIORITY_MAP[2]);
      expect(getPriorityInfo(99)).toEqual(PRIORITY_MAP[2]);
    });
  });

  describe('getStatusText', () => {
    test('returns correct text for valid statuses', () => {
      expect(getStatusText(1)).toBe('Open');
      expect(getStatusText(4)).toBe('Closed');
    });

    test('returns Unknown for invalid status', () => {
      expect(getStatusText(null)).toBe('Unknown');
      expect(getStatusText(99)).toBe('Unknown');
    });
  });

  describe('truncate', () => {
    test('returns original string if under max length', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    test('returns exact length string as-is', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });

    test('truncates with ellipsis when over max', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    test('handles null/undefined input', () => {
      expect(truncate(null, 10)).toBe('');
      expect(truncate(undefined, 10)).toBe('');
    });

    test('handles empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });
});
