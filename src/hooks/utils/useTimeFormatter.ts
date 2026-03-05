/**
 * Hook for time formatting utilities
 * Provides memoized formatting functions
 */

import { useCallback, useMemo } from 'react';
import {
  formatTime,
  formatTimeShort,
  formatDelta,
  formatSeconds,
  parseTimeToMs,
} from '../../domain/utils/formatters';

export function useTimeFormatter() {
  // Memoize the formatting functions
  const format = useCallback((ms: number | null | undefined) => formatTime(ms), []);

  const formatShort = useCallback(
    (ms: number | null | undefined) => formatTimeShort(ms),
    []
  );

  const delta = useCallback((ms: number) => formatDelta(ms), []);

  const seconds = useCallback(
    (ms: number | null | undefined, decimals?: number) => formatSeconds(ms, decimals),
    []
  );

  const parse = useCallback((timeStr: string) => parseTimeToMs(timeStr), []);

  // Return all formatters
  return useMemo(
    () => ({
      formatTime: format,
      formatTimeShort: formatShort,
      formatDelta: delta,
      formatSeconds: seconds,
      parseTimeToMs: parse,
    }),
    [format, formatShort, delta, seconds, parse]
  );
}

export default useTimeFormatter;
