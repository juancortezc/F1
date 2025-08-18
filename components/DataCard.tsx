import React from 'react';

interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'highlight' | 'success';
  className?: string;
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'default',
  className = ''
}) => {
  const variantStyles = {
    default: 'surface-primary border-subtle',
    highlight: 'bg-[#FF1801]/5 border-[#FF1801]/20',
    success: 'bg-green-900/10 border-green-800/20'
  };

  return (
    <div className={`${variantStyles[variant]} p-4 border rounded-md ${className}`}>
      <p className="text-secondary text-f1-sm mb-2">{title}</p>
      <p className="text-primary text-f1-2xl font-bold font-mono tracking-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-muted text-f1-sm mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default DataCard;