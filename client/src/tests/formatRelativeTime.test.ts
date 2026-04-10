import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatAbsoluteDate } from '../utils/formatRelativeTime';

// Fixed reference time for deterministic tests
const NOW = new Date('2026-03-27T20:00:00.000Z');

const hoursAgo  = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000).toISOString();
const daysAgo   = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const weeksAgo  = (w: number) => new Date(NOW.getTime() - w * 7 * 24 * 60 * 60 * 1000).toISOString();

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Freeze Date.now() so relative calculations are stable
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps within the last minute', () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe('just now');
    expect(formatRelativeTime(new Date(NOW.getTime() - 30 * 1000).toISOString())).toBe('just now');
    expect(formatRelativeTime(new Date(NOW.getTime() - 59 * 1000).toISOString())).toBe('just now');
  });

  it('returns "X min ago" for timestamps 1–59 minutes ago', () => {
    expect(formatRelativeTime(minutesAgo(1))).toBe('1 min ago');
    expect(formatRelativeTime(minutesAgo(5))).toBe('5 min ago');
    expect(formatRelativeTime(minutesAgo(30))).toBe('30 min ago');
    expect(formatRelativeTime(minutesAgo(59))).toBe('59 min ago');
  });

  it('returns "Xh ago" for timestamps 1–23 hours ago', () => {
    expect(formatRelativeTime(hoursAgo(1))).toBe('1h ago');
    expect(formatRelativeTime(hoursAgo(2))).toBe('2h ago');
    expect(formatRelativeTime(hoursAgo(23))).toBe('23h ago');
  });

  it('returns "yesterday" for exactly 1 day ago', () => {
    expect(formatRelativeTime(daysAgo(1))).toBe('yesterday');
  });

  it('returns "X days ago" for 2–6 days ago', () => {
    expect(formatRelativeTime(daysAgo(2))).toBe('2 days ago');
    expect(formatRelativeTime(daysAgo(5))).toBe('5 days ago');
    expect(formatRelativeTime(daysAgo(6))).toBe('6 days ago');
  });

  it('returns "1 week ago" for exactly 7 days ago', () => {
    expect(formatRelativeTime(daysAgo(7))).toBe('1 week ago');
  });

  it('returns "X weeks ago" for 2–4 weeks ago', () => {
    expect(formatRelativeTime(weeksAgo(2))).toBe('2 weeks ago');
    expect(formatRelativeTime(weeksAgo(3))).toBe('3 weeks ago');
    expect(formatRelativeTime(weeksAgo(4))).toBe('4 weeks ago');
  });

  it('returns a short date string for timestamps older than ~1 month', () => {
    const result = formatRelativeTime(weeksAgo(6));
    // Should look like "Feb 13" or similar — just verify it's not a relative string
    expect(result).not.toContain('ago');
    expect(result).not.toBe('just now');
    expect(result.length).toBeGreaterThan(3); // at least "Feb 1"
  });

  it('accepts a Date object as input', () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('5 min ago');
  });
});

describe('formatAbsoluteDate', () => {
  it('returns a human readable date string', () => {
    const result = formatAbsoluteDate('2026-03-15T14:30:00.000Z');
    // Should include the year 2026 and the month March
    expect(result).toMatch(/2026/);
    // Should contain a time component
    expect(result.length).toBeGreaterThan(10);
  });

  it('accepts a Date object', () => {
    const result = formatAbsoluteDate(new Date('2026-03-15T14:30:00.000Z'));
    expect(result).toMatch(/2026/);
  });
});
