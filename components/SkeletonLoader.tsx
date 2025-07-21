import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'circle' | 'button';
  className?: string;
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'text', 
  className = '',
  count = 1 
}) => {
  const baseClasses = 'animate-pulse bg-slate-700';
  
  const variantClasses = {
    card: 'h-32 rounded-lg',
    text: 'h-4 rounded',
    circle: 'rounded-full',
    button: 'h-10 rounded-lg'
  };

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (count === 1) {
    return <div className={skeletonClass} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={skeletonClass} />
      ))}
    </div>
  );
};

export default SkeletonLoader;