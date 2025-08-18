import React from 'react';

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({ 
  children, 
  columns = 2,
  className = '' 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-3 ${className}`}>
      {children}
    </div>
  );
};

export default StatsGrid;