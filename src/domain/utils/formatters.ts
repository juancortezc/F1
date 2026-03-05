/**
 * Time formatting utilities
 * Centralized to avoid duplication across components
 */

/**
 * Format milliseconds to MM:SS.mmm format
 * @param ms - Time in milliseconds
 * @returns Formatted time string or '--:--.---' if invalid
 */
export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '--:--.---';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format milliseconds to short format M:SS.mmm (no leading zero on minutes)
 * @param ms - Time in milliseconds
 * @returns Formatted time string
 */
export function formatTimeShort(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '-:--';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format delta time with +/- prefix
 * @param ms - Delta time in milliseconds (positive = slower, negative = faster)
 * @returns Formatted delta string like "+0.234" or "-1.567"
 */
export function formatDelta(ms: number): string {
  if (ms === 0) return '±0.000';

  const sign = ms > 0 ? '+' : '-';
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  const milliseconds = absMs % 1000;

  if (seconds === 0) {
    return `${sign}0.${milliseconds.toString().padStart(3, '0')}`;
  }

  return `${sign}${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format milliseconds to seconds with decimals
 * @param ms - Time in milliseconds
 * @param decimals - Number of decimal places (default 3)
 * @returns Formatted seconds string
 */
export function formatSeconds(ms: number | null | undefined, decimals: number = 3): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '--';
  }

  return (ms / 1000).toFixed(decimals);
}

/**
 * Parse time string to milliseconds
 * Supports formats: "1:23.456", "83.456", "83456"
 * @param timeStr - Time string to parse
 * @returns Time in milliseconds or null if invalid
 */
export function parseTimeToMs(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }

  const trimmed = timeStr.trim();

  // Format: M:SS.mmm or MM:SS.mmm
  const colonFormat = /^(\d{1,2}):(\d{2})\.(\d{1,3})$/;
  const colonMatch = trimmed.match(colonFormat);
  if (colonMatch) {
    const minutes = parseInt(colonMatch[1], 10);
    const seconds = parseInt(colonMatch[2], 10);
    const ms = parseInt(colonMatch[3].padEnd(3, '0'), 10);
    return (minutes * 60 + seconds) * 1000 + ms;
  }

  // Format: SS.mmm (seconds with decimals)
  const decimalFormat = /^(\d+)\.(\d{1,3})$/;
  const decimalMatch = trimmed.match(decimalFormat);
  if (decimalMatch) {
    const seconds = parseInt(decimalMatch[1], 10);
    const ms = parseInt(decimalMatch[2].padEnd(3, '0'), 10);
    return seconds * 1000 + ms;
  }

  // Format: pure milliseconds
  const pureMs = /^\d+$/;
  if (pureMs.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return null;
}

/**
 * Format date to Spanish locale
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
