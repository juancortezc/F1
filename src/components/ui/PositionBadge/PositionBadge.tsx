'use client';

/**
 * PositionBadge Component
 * Displays race positions with F1-style coloring (gold, silver, bronze)
 */

import React from 'react';

export interface PositionBadgeProps {
  /** Position number (1-based) */
  position: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as circle or pill */
  variant?: 'circle' | 'pill';
  /** Additional className */
  className?: string;
}

export function PositionBadge({
  position,
  size = 'md',
  variant = 'circle',
  className = '',
}: PositionBadgeProps) {
  const getPositionColor = () => {
    switch (position) {
      case 1:
        return 'bg-amber-400 text-black'; // Gold
      case 2:
        return 'bg-zinc-300 text-black'; // Silver
      case 3:
        return 'bg-amber-600 text-black'; // Bronze
      default:
        return 'bg-zinc-700 text-zinc-100'; // Others
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return variant === 'circle' ? 'w-5 h-5 text-xs' : 'px-2 py-0.5 text-xs';
      case 'md':
        return variant === 'circle' ? 'w-7 h-7 text-sm' : 'px-3 py-1 text-sm';
      case 'lg':
        return variant === 'circle' ? 'w-9 h-9 text-base' : 'px-4 py-1.5 text-base';
      default:
        return variant === 'circle' ? 'w-7 h-7 text-sm' : 'px-3 py-1 text-sm';
    }
  };

  const getShapeClass = () => {
    return variant === 'circle' ? 'rounded-full' : 'rounded-md';
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-mono font-bold
        ${getPositionColor()}
        ${getSizeClass()}
        ${getShapeClass()}
        ${className}
      `}
    >
      {position}
    </span>
  );
}

/**
 * PositionChange Component
 * Shows position change with arrow indicator
 */
export interface PositionChangeProps {
  /** Change in positions (positive = gained, negative = lost) */
  change: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

export function PositionChange({
  change,
  size = 'md',
  className = '',
}: PositionChangeProps) {
  if (change === 0) {
    return (
      <span className={`text-zinc-500 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
        —
      </span>
    );
  }

  const isGain = change > 0;
  const color = isGain ? 'text-green-400' : 'text-red-400';
  const arrow = isGain ? '▲' : '▼';
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`font-mono ${sizeClass} ${color} ${className}`}>
      {arrow} {Math.abs(change)}
    </span>
  );
}

export default PositionBadge;
