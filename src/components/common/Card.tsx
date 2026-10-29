import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white dark:bg-[#151917] border border-[#E8EAE6] dark:border-[#242D28] rounded-lg transition-colors ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[#E8EAE6] dark:border-[#242D28] px-4 py-3.5 sm:px-5">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1] tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={paddingMap[padding]}>
        {children}
      </div>
    </div>
  );
};
