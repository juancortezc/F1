'use client';

/**
 * TimeDisplay Component
 * Displays lap times with automatic formatting and optional delta
 */

import React from 'react';
import { formatTime, formatDelta } from '../../../domain/utils/formatters';

export interface TimeDisplayProps {
  /** Time in milliseconds */
  timeMs: number | null | undefined;
  /** Optional delta time in milliseconds (positive = slower, negative = faster) */
  deltaMs?: number | null;
  /** Show delta inline */
  showDelta?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show as mono font */
  mono?: boolean;
  /** Additional className */
  className?: string;
  /** Show placeholder when no time */
  placeholder?: string;
  /** Bold text */
  bold?: boolean;
}

export function TimeDisplay({
  timeMs,
  deltaMs,
  showDelta = false,
  size = 'md',
  mono = true,
  className = '',
  placeholder = '--:--.---',
  bold = false,
}: TimeDisplayProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'text-xs';
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      case 'xl':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  const getDeltaColor = (delta: number) => {
    if (delta < 0) return 'text-green-400'; // Faster
    if (delta > 0) return 'text-red-400'; // Slower
    return 'text-zinc-400'; // Same
  };

  const getDeltaSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'text-[10px]';
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const formattedTime = timeMs != null ? formatTime(timeMs) : placeholder;
  const formattedDelta = deltaMs != null ? formatDelta(deltaMs) : null;

  return (
    <span
      className={`
        ${getSizeClass()}
        ${mono ? 'font-mono' : ''}
        ${bold ? 'font-bold' : ''}
        text-zinc-100
        ${className}
      `}
    >
      {formattedTime}
      {showDelta && formattedDelta && (
        <span className={`ml-2 ${getDeltaSizeClass()} ${getDeltaColor(deltaMs!)}`}>
          {formattedDelta}
        </span>
      )}
    </span>
  );
}

/**
 * DeltaDisplay Component
 * Displays only the delta time with color coding
 */
export interface DeltaDisplayProps {
  /** Delta time in milliseconds */
  deltaMs: number | null | undefined;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show + prefix for positive values */
  showPrefix?: boolean;
  /** Additional className */
  className?: string;
}

export function DeltaDisplay({
  deltaMs,
  size = 'md',
  showPrefix = true,
  className = '',
}: DeltaDisplayProps) {
  if (deltaMs == null) {
    return <span className={`text-zinc-500 ${className}`}>--</span>;
  }

  const getSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'text-xs';
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const getColor = () => {
    if (deltaMs < 0) return 'text-green-400';
    if (deltaMs > 0) return 'text-red-400';
    return 'text-zinc-400';
  };

  return (
    <span className={`font-mono ${getSizeClass()} ${getColor()} ${className}`}>
      {formatDelta(deltaMs)}
    </span>
  );
}

export default TimeDisplay;
