import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  count = 1
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded-f1-sm';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-f1-md';
      case 'card':
        return 'h-32 rounded-f1-lg';
      case 'table-row':
        return 'h-12 rounded-f1-md';
      default:
        return 'rounded-f1-md';
    }
  };

  const baseClasses = `
    bg-f1-pro-steel 
    animate-pulse 
    ${getVariantClasses()}
    ${className}
  `;

  const style = {
    width: width || (variant === 'text' ? '100%' : '4rem'),
    height: height || (variant === 'circular' ? '4rem' : undefined),
  };

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={baseClasses} style={style} />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={style} />;
};

// Specific skeleton components for common use cases
export const PlayerCardSkeleton: React.FC = () => (
  <div className="bg-f1-pro-chrome rounded-f1-lg p-4 border border-f1-pro-steel animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-f1-pro-steel rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-f1-pro-steel rounded w-1/3"></div>
        <div className="h-3 bg-f1-pro-titanium rounded w-1/2"></div>
      </div>
      <div className="h-8 w-20 bg-f1-pro-steel rounded-f1-md"></div>
    </div>
  </div>
);

export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel animate-pulse">
    <div className="space-y-4">
      <div className="h-3 bg-f1-pro-steel rounded w-1/4"></div>
      <div className="h-8 bg-f1-pro-steel rounded w-1/2"></div>
      <div className="h-3 bg-f1-pro-titanium rounded w-1/3"></div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 6 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-4 py-3">
        <div className="h-4 bg-f1-pro-steel rounded"></div>
      </td>
    ))}
  </tr>
);

export const CircuitCardSkeleton: React.FC = () => (
  <div className="bg-f1-pro-chrome rounded-f1-lg border border-f1-pro-steel animate-pulse">
    <div className="h-48 bg-f1-pro-steel rounded-t-f1-lg"></div>
    <div className="p-4 space-y-3">
      <div className="h-5 bg-f1-pro-steel rounded w-2/3"></div>
      <div className="h-3 bg-f1-pro-titanium rounded w-1/2"></div>
      <div className="flex justify-between">
        <div className="h-3 bg-f1-pro-titanium rounded w-1/4"></div>
        <div className="h-3 bg-f1-pro-steel rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;