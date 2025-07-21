import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'large';
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  variant = 'default',
  className = ''
}) => {
  const titleSize = variant === 'large' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';
  
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="text-[#FF1801] flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className={`font-bold text-slate-100 ${titleSize}`}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;