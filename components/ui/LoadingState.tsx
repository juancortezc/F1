import React from 'react';
import { FadeIn, Pulse } from './Animations';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'f1-logo';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  message,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-8 h-8';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  const getSpinner = () => (
    <div
      className={`
        border-2 border-f1-pro-steel border-t-f1-pro-crimson
        rounded-full animate-spin
        ${getSizeClasses()}
      `}
    />
  );

  const getF1Spinner = () => (
    <div className="relative">
      <div
        className={`
          border-3 border-f1-pro-steel border-t-f1-pro-gold
          rounded-full animate-f1-spin-slow
          ${getSizeClasses()}
        `}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-f1-pro-gold font-bold text-f1-small">F1</div>
      </div>
    </div>
  );

  const getPulse = () => (
    <Pulse intensity="medium">
      <div
        className={`
          bg-f1-pro-steel rounded-f1-md
          ${getSizeClasses()}
        `}
      />
    </Pulse>
  );

  const getSkeleton = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-f1-pro-steel rounded w-3/4"></div>
      <div className="h-4 bg-f1-pro-steel rounded w-1/2"></div>
      <div className="h-4 bg-f1-pro-steel rounded w-2/3"></div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'skeleton':
        return getSkeleton();
      case 'pulse':
        return getPulse();
      case 'f1-logo':
        return getF1Spinner();
      default:
        return getSpinner();
    }
  };

  return (
    <FadeIn className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {renderVariant()}
      {message && (
        <p className="text-f1-small text-f1-pro-silver text-center max-w-sm">
          {message}
        </p>
      )}
    </FadeIn>
  );
};

export default LoadingState;

// Page-level loading component
interface PageLoadingProps {
  message?: string;
  variant?: 'full' | 'inline';
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Cargando F1 Night...',
  variant = 'full'
}) => {
  const containerClass = variant === 'full'
    ? 'min-h-screen flex items-center justify-center bg-f1-pro-carbon'
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClass}>
      <FadeIn className="text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-f1-pro-steel border-t-f1-pro-crimson rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-f1-pro-gold font-bold text-f1-small">F1</div>
            </div>
          </div>
        </div>
        <h2 className="text-f1-large font-bold text-f1-pro-platinum mb-2">
          F1 Night
        </h2>
        <p className="text-f1-base text-f1-pro-silver">{message}</p>
      </FadeIn>
    </div>
  );
};

// Error state component
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Error de Conexión',
  message,
  onRetry,
  className = ''
}) => (
  <FadeIn className={`text-center max-w-md mx-auto ${className}`}>
    <div className="text-6xl mb-4">⚠️</div>
    <h2 className="text-f1-large font-bold text-f1-pro-platinum mb-4">
      {title}
    </h2>
    <p className="text-f1-base text-f1-pro-silver mb-6">
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="
          bg-f1-pro-crimson hover:bg-f1-pro-crimson/80
          text-white font-bold py-3 px-6 rounded-f1-lg
          transition-colors focus:outline-none focus:ring-2 focus:ring-f1-pro-crimson/50
        "
      >
        Reintentar
      </button>
    )}
  </FadeIn>
);

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = ''
}) => (
  <FadeIn className={`text-center max-w-md mx-auto ${className}`}>
    {icon && (
      <div className="text-6xl mb-4">{icon}</div>
    )}
    <h3 className="text-f1-medium font-bold text-f1-pro-platinum mb-2">
      {title}
    </h3>
    <p className="text-f1-base text-f1-pro-silver mb-6">
      {message}
    </p>
    {action && (
      <button
        onClick={action.onClick}
        className="
          bg-f1-pro-titanium hover:bg-f1-pro-steel
          text-f1-pro-platinum font-medium py-2 px-4 rounded-f1-lg
          transition-colors focus:outline-none focus:ring-2 focus:ring-f1-pro-steel
        "
      >
        {action.label}
      </button>
    )}
  </FadeIn>
);