import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
  };

  const variantClasses = {
    positive: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] dark:bg-[#0E2718] dark:text-[#4ADE80] dark:border-[#165630]',
    negative: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] dark:bg-[#2B1313] dark:text-[#F87171] dark:border-[#5C1D1D]',
    warning: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#2B210B] dark:text-[#FBBF24] dark:border-[#5C4512]',
    neutral: 'bg-[#F4F5F2] text-[#58605C] border border-[#E3E6E2] dark:bg-[#1C221F] dark:text-[#9BA6A0] dark:border-[#2A342E]',
    brand: 'bg-[#EBF3EE] text-[#1B4332] border border-[#C2DBCB] dark:bg-[#16261E] dark:text-[#52B788] dark:border-[#234D39]',
  };

  const dotColors = {
    positive: 'bg-[#166534] dark:bg-[#4ADE80]',
    negative: 'bg-[#991B1B] dark:bg-[#F87171]',
    warning: 'bg-[#92400E] dark:bg-[#FBBF24]',
    neutral: 'bg-[#58605C] dark:bg-[#9BA6A0]',
    brand: 'bg-[#1B4332] dark:bg-[#52B788]',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded leading-none select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
