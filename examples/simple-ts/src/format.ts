/**
 * Formatting utilities for working with dates and strings.
 *
 * @module format
 */

/**
 * Pads a number with leading zeros up to `width`.
 *
 * @param value - The number to pad.
 * @param width - Target width in characters.
 * @returns The padded string.
 *
 * @example
 * padZero(7, 3) // '007'
 */
export function padZero(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * Formats a date as an ISO 8601 calendar date (`YYYY-MM-DD`).
 *
 * @param date - The date to format.
 * @returns ISO date string.
 *
 * @example
 * formatIsoDate(new Date('2026-05-13')) // '2026-05-13'
 */
export function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padZero(date.getUTCMonth() + 1, 2);
  const day = padZero(date.getUTCDate(), 2);
  return `${year}-${month}-${day}`;
}

/**
 * Truncate a string to at most `max` characters, appending an ellipsis when
 * truncation occurs.
 *
 * @param value - Input string.
 * @param max - Maximum length, including the ellipsis.
 * @returns The (possibly truncated) string.
 *
 * @deprecated Use `Intl.Segmenter`-based truncation for non-Latin scripts.
 */
export function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)) + '…';
}
