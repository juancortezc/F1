'use client';

/**
 * LapTimeInput Component
 * Large, accessible input for entering lap times
 */

import React, { useState, useRef, useEffect } from 'react';

export interface LapTimeInputProps {
  lapNumber: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (timeMs: number) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

export function LapTimeInput({
  lapNumber,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  placeholder = '0:00.000',
  className = '',
}: LapTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Allow only numbers, colon, and period
    newValue = newValue.replace(/[^0-9:.]/g, '');

    // Auto-format as user types
    // Remove existing formatting
    const digitsOnly = newValue.replace(/[:.]/g, '');

    if (digitsOnly.length <= 1) {
      // Just the minute digit
      newValue = digitsOnly;
    } else if (digitsOnly.length === 2) {
      // M:S
      newValue = `${digitsOnly[0]}:${digitsOnly[1]}`;
    } else if (digitsOnly.length <= 4) {
      // M:SS or M:SS.
      newValue = `${digitsOnly[0]}:${digitsOnly.slice(1, 3)}${digitsOnly.length > 3 ? '.' + digitsOnly.slice(3) : ''}`;
    } else {
      // M:SS.mmm
      newValue = `${digitsOnly[0]}:${digitsOnly.slice(1, 3)}.${digitsOnly.slice(3, 6)}`;
    }

    onChange(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Try to parse and notify complete
    if (value && onComplete) {
      const timeMs = parseTimeToMs(value);
      if (timeMs !== null) {
        onComplete(timeMs);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value && onComplete) {
      const timeMs = parseTimeToMs(value);
      if (timeMs !== null) {
        onComplete(timeMs);
      }
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Lap Number Badge */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <span className="text-lg font-bold text-zinc-100">{lapNumber}</span>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          flex-1
          px-4 py-4
          bg-zinc-800 border-2 rounded-lg
          text-2xl font-mono font-bold text-center text-zinc-100
          placeholder:text-zinc-600
          focus:outline-none
          transition-colors
          ${isFocused ? 'border-zinc-500' : 'border-zinc-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        maxLength={9}
      />
    </div>
  );
}

/**
 * Parse time string to milliseconds
 * Formats: "1:23.456" or "1:23" or "83.456" or "83456"
 */
function parseTimeToMs(timeStr: string): number | null {
  if (!timeStr) return null;

  // Try M:SS.mmm format
  const colonFormat = timeStr.match(/^(\d):(\d{2})\.(\d{1,3})$/);
  if (colonFormat) {
    const [, minutes, seconds, ms] = colonFormat;
    const msValue = ms.padEnd(3, '0');
    return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(msValue);
  }

  // Try M:SS format (no ms)
  const shortFormat = timeStr.match(/^(\d):(\d{2})$/);
  if (shortFormat) {
    const [, minutes, seconds] = shortFormat;
    return parseInt(minutes) * 60000 + parseInt(seconds) * 1000;
  }

  // Try SS.mmm format
  const secondsOnly = timeStr.match(/^(\d{1,2})\.(\d{1,3})$/);
  if (secondsOnly) {
    const [, seconds, ms] = secondsOnly;
    const msValue = ms.padEnd(3, '0');
    return parseInt(seconds) * 1000 + parseInt(msValue);
  }

  // Try raw milliseconds
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr);
  }

  return null;
}

export default LapTimeInput;
