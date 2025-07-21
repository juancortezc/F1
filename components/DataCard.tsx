import React from 'react';

interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'highlight' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    default: 'bg-slate-800/50 border-slate-700',
    highlight: 'bg-[#FF1801]/10 border-[#FF1801]/30',
    success: 'bg-green-900/20 border-green-500/30',
    warning: 'bg-yellow-900/20 border-yellow-500/30',
    info: 'bg-blue-900/20 border-blue-500/30'
  };

  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const valueSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`${variantStyles[variant]} ${sizeStyles[size]} border rounded-lg backdrop-blur-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className="text-slate-400">{icon}</div>}
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">{title}</p>
          </div>
          <p className={`font-bold text-slate-100 ${valueSize[size]} font-mono`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataCard;