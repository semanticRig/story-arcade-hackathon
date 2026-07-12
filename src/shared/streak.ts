/**
 * Pure functions for streak calculation and badge assignment.
 * No Redis dependencies — testable with plain inputs.
 */

/** Calculate new streak days given the current streak and last played date. */
export function computeStreak(
  currentStreak: number,
  lastPlayedDate: string | null,
  today: string,
): number {
  if (lastPlayedDate === today) return currentStreak;
  if (lastPlayedDate === yesterday(today)) return currentStreak + 1;
  return 1;
}

/** Determine which badges should be active for a given streak count. */
export function computeBadges(streakDays: number): string[] {
  const badges: string[] = [];
  if (streakDays >= 3) badges.push('3-day');
  if (streakDays >= 7) badges.push('7-day');
  if (streakDays >= 30) badges.push('30-day');
  return badges;
}

/** Get yesterday's date string (YYYY-MM-DD). */
export function yesterday(today: string): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
