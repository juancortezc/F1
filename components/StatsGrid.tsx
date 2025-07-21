import React from 'react';

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({ 
  children, 
  columns = 3, 
  gap = 'md',
  className = '' 
}) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', 
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const gridGap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`grid ${gridCols[columns]} ${gridGap[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default StatsGrid;