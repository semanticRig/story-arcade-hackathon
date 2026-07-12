import { describe, it, expect } from 'vitest';
import { computeStreak, computeBadges, yesterday } from './streak';

describe('yesterday', () => {
  it('returns the previous day', () => {
    expect(yesterday('2026-07-15')).toBe('2026-07-14');
    expect(yesterday('2026-01-01')).toBe('2025-12-31');
    expect(yesterday('2026-03-01')).toBe('2026-02-28');
  });
});

describe('computeStreak', () => {
  it('returns same streak if already played today', () => {
    expect(computeStreak(5, '2026-07-15', '2026-07-15')).toBe(5);
  });

  it('increments streak if last played yesterday', () => {
    expect(computeStreak(5, '2026-07-14', '2026-07-15')).toBe(6);
  });

  it('resets to 1 if last played before yesterday', () => {
    expect(computeStreak(10, '2026-07-10', '2026-07-15')).toBe(1);
  });

  it('starts at 1 if never played before', () => {
    expect(computeStreak(0, null, '2026-07-15')).toBe(1);
  });

  it('increments from 0 with yesterday', () => {
    expect(computeStreak(0, '2026-07-14', '2026-07-15')).toBe(1);
  });
});

describe('computeBadges', () => {
  it('awards no badges below 3 days', () => {
    expect(computeBadges(0)).toEqual([]);
    expect(computeBadges(1)).toEqual([]);
    expect(computeBadges(2)).toEqual([]);
  });

  it('awards 3-day badge at exactly 3', () => {
    expect(computeBadges(3)).toEqual(['3-day']);
  });

  it('awards 3-day badge between 3 and 6', () => {
    expect(computeBadges(5)).toEqual(['3-day']);
  });

  it('awards 3-day + 7-day badge at exactly 7', () => {
    expect(computeBadges(7)).toEqual(['3-day', '7-day']);
  });

  it('awards both mid-tier badges between 7 and 29', () => {
    expect(computeBadges(15)).toEqual(['3-day', '7-day']);
  });

  it('awards all three badges at exactly 30', () => {
    expect(computeBadges(30)).toEqual(['3-day', '7-day', '30-day']);
  });

  it('awards all three badges above 30', () => {
    expect(computeBadges(100)).toEqual(['3-day', '7-day', '30-day']);
  });
});
