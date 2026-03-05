/**
 * Date utilities for F1 Night app
 * All dates are displayed in Ecuador timezone (America/Guayaquil, UTC-5)
 */

const ECUADOR_TIMEZONE = 'America/Guayaquil';

/**
 * Format a date string for display in Ecuador timezone
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 */
export const formatDateEC = (
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ECUADOR_TIMEZONE,
    ...options
  };

  return date.toLocaleDateString('es-EC', defaultOptions);
};

/**
 * Format a date for game selector display
 * Example: "mié, 4 mar 2026"
 */
export const formatGameDateEC = (dateString: string): string => {
  return formatDateEC(dateString, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format a date for full display
 * Example: "miércoles, 4 de marzo de 2026"
 */
export const formatFullDateEC = (dateString: string): string => {
  return formatDateEC(dateString, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format a date for short display
 * Example: "4/3/2026"
 */
export const formatShortDateEC = (dateString: string): string => {
  return formatDateEC(dateString, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a date with time in Ecuador timezone
 * Example: "4 mar 2026, 20:30"
 */
export const formatDateTimeEC = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('es-EC', {
    timeZone: ECUADOR_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
