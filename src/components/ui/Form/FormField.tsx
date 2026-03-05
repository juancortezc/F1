'use client';

/**
 * FormField Components
 * Reusable form inputs with F1 luxury styling
 */

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Full width */
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3
            bg-zinc-800 border rounded-md
            text-zinc-100 text-lg
            placeholder:text-zinc-500
            focus:outline-none focus:ring-2 focus:ring-zinc-600
            transition-colors
            ${error ? 'border-red-500' : 'border-zinc-700'}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-zinc-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Options */
  options: Array<{ value: string; label: string }>;
  /** Placeholder option */
  placeholder?: string;
  /** Full width */
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-3
            bg-zinc-800 border rounded-md
            text-zinc-100 text-lg
            focus:outline-none focus:ring-2 focus:ring-zinc-600
            transition-colors
            ${error ? 'border-red-500' : 'border-zinc-700'}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const getVariantClass = () => {
      switch (variant) {
        case 'primary':
          return 'bg-red-600 text-white hover:bg-red-700';
        case 'secondary':
          return 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600';
        case 'danger':
          return 'bg-red-700 text-white hover:bg-red-800';
        case 'ghost':
          return 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800';
        default:
          return 'bg-red-600 text-white hover:bg-red-700';
      }
    };

    const getSizeClass = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-2 text-sm';
        case 'md':
          return 'px-4 py-3 text-base';
        case 'lg':
          return 'px-6 py-4 text-lg';
        default:
          return 'px-4 py-3 text-base';
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${getVariantClass()}
          ${getSizeClass()}
          ${fullWidth ? 'w-full' : ''}
          font-bold rounded-md
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Cargando...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Input;
