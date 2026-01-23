/**
 * Date utilities for consistent date handling across timezones
 * 
 * Key insight: Dates stored in DB may be at UTC midnight. When comparing
 * with "today", we need to compare date parts only, ignoring time.
 */

/**
 * Get today's date normalized to compare with stored dates
 * Uses the start and end of the day to handle timezone issues
 */
export function getTodayRange() {
  const now = new Date();
  
  // Start of today (local midnight)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  
  // End of today (just before midnight)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
}

/**
 * Normalize a date to local midnight for date-only comparisons
 */
export function toLocalMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Check if a date string/object represents the same calendar day as today
 */
export function isToday(date: Date | string): boolean {
  const d = toLocalMidnight(date);
  const today = toLocalMidnight(new Date());
  return d.getTime() === today.getTime();
}

/**
 * Compare two dates by calendar day only (ignoring time)
 * Returns: negative if a < b, 0 if same day, positive if a > b
 */
export function compareDates(a: Date | string, b: Date | string): number {
  const dateA = toLocalMidnight(a);
  const dateB = toLocalMidnight(b);
  return dateA.getTime() - dateB.getTime();
}

/**
 * Check if today is within a date range (inclusive)
 */
export function isTodayInRange(startDate: Date | string, endDate: Date | string): boolean {
  const today = toLocalMidnight(new Date());
  const start = toLocalMidnight(startDate);
  const end = toLocalMidnight(endDate);
  
  return today >= start && today <= end;
}

/**
 * Check if today is before a date
 */
export function isTodayBefore(date: Date | string): boolean {
  const today = toLocalMidnight(new Date());
  const target = toLocalMidnight(date);
  return today < target;
}

/**
 * Check if today is after a date
 */
export function isTodayAfter(date: Date | string): boolean {
  const today = toLocalMidnight(new Date());
  const target = toLocalMidnight(date);
  return today > target;
}

/**
 * Get challenge status based on dates
 */
export function getChallengeStatus(startDate: Date | string, endDate: Date | string): 'active' | 'upcoming' | 'ended' {
  if (isTodayInRange(startDate, endDate)) return 'active';
  if (isTodayBefore(startDate)) return 'upcoming';
  return 'ended';
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date at local midnight
 * This avoids the UTC interpretation issue with new Date("YYYY-MM-DD")
 */
export function parseLocalDate(dateStr: string): Date {
  // Add time component to force local interpretation
  return new Date(dateStr + "T00:00:00");
}

