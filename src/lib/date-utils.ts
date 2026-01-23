/**
 * Date utilities for consistent date handling across timezones
 * 
 * IMPORTANT: Production servers run in UTC. We use UTC consistently
 * for all date comparisons to ensure behavior is the same in dev and prod.
 * 
 * Database @db.Date columns store dates without timezone, typically as UTC midnight.
 */

/**
 * Get today's date in UTC for database comparisons
 * Returns start and end of day in UTC
 */
export function getTodayRangeUTC() {
  const now = new Date();
  
  // Start of today in UTC
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  
  // End of today in UTC
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  return { startOfDay, endOfDay };
}

/**
 * Normalize a date to UTC midnight for date-only comparisons
 */
export function toUTCMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get today's date as UTC midnight
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Check if a date represents the same calendar day as today (in UTC)
 */
export function isToday(date: Date | string): boolean {
  const d = toUTCMidnight(date);
  const today = getTodayUTC();
  return d.getTime() === today.getTime();
}

/**
 * Compare two dates by calendar day only (using UTC, ignoring time)
 * Returns: negative if a < b, 0 if same day, positive if a > b
 */
export function compareDates(a: Date | string, b: Date | string): number {
  const dateA = toUTCMidnight(a);
  const dateB = toUTCMidnight(b);
  return dateA.getTime() - dateB.getTime();
}

/**
 * Check if today (UTC) is within a date range (inclusive)
 */
export function isTodayInRange(startDate: Date | string, endDate: Date | string): boolean {
  const today = getTodayUTC();
  const start = toUTCMidnight(startDate);
  const end = toUTCMidnight(endDate);
  
  return today >= start && today <= end;
}

/**
 * Check if today (UTC) is before a date
 */
export function isTodayBefore(date: Date | string): boolean {
  const today = getTodayUTC();
  const target = toUTCMidnight(date);
  return today < target;
}

/**
 * Check if today (UTC) is after a date
 */
export function isTodayAfter(date: Date | string): boolean {
  const today = getTodayUTC();
  const target = toUTCMidnight(date);
  return today > target;
}

/**
 * Get challenge status based on dates (using UTC)
 */
export function getChallengeStatus(startDate: Date | string, endDate: Date | string): 'active' | 'upcoming' | 'ended' {
  if (isTodayInRange(startDate, endDate)) return 'active';
  if (isTodayBefore(startDate)) return 'upcoming';
  return 'ended';
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date at UTC midnight
 * Use this when storing dates from form inputs
 */
export function parseLocalDateToUTC(dateStr: string): Date {
  // Parse as UTC midnight
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

