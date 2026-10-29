import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors select-none finn-focus rounded-md';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[30px]',
    md: 'text-xs px-3.5 py-2 gap-2 min-h-[36px]',
    lg: 'text-sm px-4 py-2.5 gap-2.5 min-h-[42px]',
  };

  const variantClasses = {
    primary: 'bg-[#1B4332] hover:bg-[#143326] text-white shadow-xs dark:bg-[#2D6A4F] dark:hover:bg-[#23533E]',
    secondary: 'bg-white hover:bg-[#F6F7F5] text-[#141716] border border-[#E8EAE6] shadow-2xs dark:bg-[#181D1A] dark:hover:bg-[#202723] dark:text-[#F0F3F1] dark:border-[#28322C]',
    subtle: 'bg-transparent hover:bg-[#F0F2EF] text-[#58605C] hover:text-[#141716] dark:hover:bg-[#1E2420] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1]',
    outline: 'bg-transparent border border-[#E8EAE6] hover:bg-[#F6F7F5] text-[#141716] dark:border-[#28322C] dark:hover:bg-[#1A201C] dark:text-[#F0F3F1]',
    danger: 'bg-transparent text-[#991B1B] border border-[#FECACA] hover:bg-[#FEF2F2] dark:text-[#F87171] dark:border-[#5C1D1D] dark:hover:bg-[#281414]',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
