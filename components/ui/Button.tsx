import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { ScaleOnHover, Glow } from './Animations';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'luxury';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  glow = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return `
          bg-f1-pro-crimson hover:bg-f1-pro-crimson/80 
          text-white font-bold
          border-2 border-f1-pro-crimson
          shadow-f1-red
        `;
      case 'secondary':
        return `
          bg-f1-pro-titanium hover:bg-f1-pro-steel 
          text-f1-pro-platinum font-semibold
          border-2 border-f1-pro-steel hover:border-f1-pro-aluminum
        `;
      case 'danger':
        return `
          bg-red-600 hover:bg-red-700
          text-white font-bold
          border-2 border-red-600
        `;
      case 'ghost':
        return `
          bg-transparent hover:bg-f1-pro-steel/30
          text-f1-pro-silver hover:text-f1-pro-platinum
          border-2 border-f1-pro-steel hover:border-f1-pro-aluminum
        `;
      case 'luxury':
        return `
          bg-gradient-to-r from-f1-pro-gold/20 to-amber-500/20
          hover:from-f1-pro-gold/30 hover:to-amber-500/30
          text-f1-pro-gold font-bold
          border-2 border-f1-pro-gold
          shadow-f1-gold
        `;
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-f1-small';
      case 'md':
        return 'px-4 py-2 text-f1-base';
      case 'lg':
        return 'px-6 py-3 text-f1-large';
      case 'xl':
        return 'px-8 py-4 text-f1-xl';
      default:
        return '';
    }
  };

  const buttonClasses = `
    relative inline-flex items-center justify-center
    rounded-f1-lg transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-f1-pro-crimson/50
    disabled:opacity-50 disabled:cursor-not-allowed
    transform active:scale-95
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${loading ? 'cursor-wait' : ''}
    ${className}
  `;

  const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const content = (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      
      <div className={`flex items-center space-x-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        
        <span className="truncate">{children}</span>
        
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </div>
    </button>
  );

  if (glow && variant === 'luxury') {
    return (
      <Glow color="gold" intensity="medium">
        <ScaleOnHover>
          {content}
        </ScaleOnHover>
      </Glow>
    );
  }

  if (variant === 'primary') {
    return (
      <ScaleOnHover>
        {content}
      </ScaleOnHover>
    );
  }

  return content;
});

Button.displayName = 'Button';

export default Button;

// Specialized button variants
export const PrimaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="primary" {...props} />
);

export const LuxuryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="luxury" glow {...props} />
);

export const DangerButton: React.FC<ButtonProps> = (props) => (
  <Button variant="danger" {...props} />
);

export const GhostButton: React.FC<ButtonProps> = (props) => (
  <Button variant="ghost" {...props} />
);