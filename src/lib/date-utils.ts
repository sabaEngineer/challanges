/**
 * Date utilities for consistent date handling across timezones
 * 
 * IMPORTANT: We use a fixed timezone offset to ensure dates match user expectations.
 * Default offset is UTC+4 (Georgia timezone) - adjust TIMEZONE_OFFSET_HOURS if needed.
 */

// Timezone offset in hours from UTC (UTC+4 for Georgia)
export const TIMEZONE_OFFSET_HOURS = 4;

/**
 * Get the current date adjusted for the configured timezone
 */
export function getAdjustedNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Get today's date adjusted for timezone, for database comparisons
 * Returns start and end of day
 */
export function getTodayRange() {
  const adjustedNow = getAdjustedNow();
  
  // Start of today (adjusted for timezone)
  const startOfDay = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 0, 0, 0, 0));
  
  // End of today (adjusted for timezone)
  const endOfDay = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 23, 59, 59, 999));
  
  return { startOfDay, endOfDay };
}

/**
 * Get today's date in UTC for database comparisons (legacy - use getTodayRange instead)
 */
export function getTodayRangeUTC() {
  return getTodayRange();
}

/**
 * Normalize a date to midnight for date-only comparisons
 */
export function toMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get today's date at midnight (adjusted for configured timezone)
 */
export function getToday(): Date {
  const adjustedNow = getAdjustedNow();
  return new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 0, 0, 0, 0));
}

// Legacy aliases
export const toUTCMidnight = toMidnight;
export const getTodayUTC = getToday;

/**
 * Check if a date represents the same calendar day as today (adjusted for timezone)
 */
export function isToday(date: Date | string): boolean {
  const d = toMidnight(date);
  const today = getToday();
  return d.getTime() === today.getTime();
}

/**
 * Compare two dates by calendar day only (ignoring time)
 * Returns: negative if a < b, 0 if same day, positive if a > b
 */
export function compareDates(a: Date | string, b: Date | string): number {
  const dateA = toMidnight(a);
  const dateB = toMidnight(b);
  return dateA.getTime() - dateB.getTime();
}

/**
 * Check if today is within a date range (inclusive)
 */
export function isTodayInRange(startDate: Date | string, endDate: Date | string): boolean {
  const today = getToday();
  const start = toMidnight(startDate);
  const end = toMidnight(endDate);
  
  return today >= start && today <= end;
}

/**
 * Check if today is before a date
 */
export function isTodayBefore(date: Date | string): boolean {
  const today = getToday();
  const target = toMidnight(date);
  return today < target;
}

/**
 * Check if today is after a date
 */
export function isTodayAfter(date: Date | string): boolean {
  const today = getToday();
  const target = toMidnight(date);
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
 * Parse a date string (YYYY-MM-DD) to a Date at midnight
 * Use this when storing dates from form inputs
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Legacy alias
export const parseLocalDateToUTC = parseDateString;

