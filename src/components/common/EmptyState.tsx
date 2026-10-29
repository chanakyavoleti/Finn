import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-[#D5D9D4] dark:border-[#2C3730] rounded-lg bg-[#FAFAF8] dark:bg-[#131715] ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#EBF3EE] dark:bg-[#1A2820] text-[#1B4332] dark:text-[#52B788] flex items-center justify-center mb-3.5">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#58605C] dark:text-[#9BA6A0] max-w-sm leading-relaxed">
        {description}
      </p>
      {(actionText || secondaryActionText) && (
        <div className="mt-4 flex items-center gap-2.5">
          {actionText && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
