'use client';

/**
 * Card Components
 * F1 luxury styled cards for data presentation
 */

import React from 'react';

export interface CardProps {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Card content */
  children: React.ReactNode;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Show border */
  bordered?: boolean;
  /** Elevated (with shadow effect) */
  elevated?: boolean;
  /** Header action button */
  headerAction?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** onClick handler */
  onClick?: () => void;
}

export function Card({
  title,
  subtitle,
  children,
  padding = 'md',
  bordered = true,
  elevated = false,
  headerAction,
  className = '',
  onClick,
}: CardProps) {
  const getPaddingClass = () => {
    switch (padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-2';
      case 'md':
        return 'p-4';
      case 'lg':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  const hasHeader = title || subtitle || headerAction;

  return (
    <div
      className={`
        bg-zinc-900 rounded-lg
        ${bordered ? 'border border-zinc-800' : ''}
        ${elevated ? 'shadow-lg shadow-black/20' : ''}
        ${onClick ? 'cursor-pointer hover:bg-zinc-800/50 transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            {title && <h3 className="text-lg font-bold text-zinc-100">{title}</h3>}
            {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={hasHeader ? getPaddingClass() : getPaddingClass()}>
        {children}
      </div>
    </div>
  );
}

/**
 * StatCard Component
 * Compact card for displaying a single statistic
 */
export interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Icon or indicator */
  icon?: React.ReactNode;
  /** Value color */
  valueColor?: 'default' | 'gold' | 'silver' | 'bronze' | 'green' | 'red';
  /** Additional className */
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  valueColor = 'default',
  className = '',
}: StatCardProps) {
  const getValueColorClass = () => {
    switch (valueColor) {
      case 'gold':
        return 'text-amber-400';
      case 'silver':
        return 'text-zinc-300';
      case 'bronze':
        return 'text-amber-600';
      case 'green':
        return 'text-green-400';
      case 'red':
        return 'text-red-400';
      default:
        return 'text-zinc-100';
    }
  };

  return (
    <div
      className={`
        bg-zinc-900 border border-zinc-800 rounded-lg
        p-3
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      <div className={`text-2xl font-mono font-bold mt-1 ${getValueColorClass()}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * InfoRow Component
 * Simple label-value row for lists
 */
export interface InfoRowProps {
  /** Label */
  label: string;
  /** Value */
  value: string | number | React.ReactNode;
  /** Additional className */
  className?: string;
}

export function InfoRow({ label, value, className = '' }: InfoRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-100 font-medium">{value}</span>
    </div>
  );
}

export default Card;
