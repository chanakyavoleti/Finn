import React from 'react';
import { Badge } from './Badge';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  secondaryContext?: string;
  className?: string;
  accent?: 'forest' | 'neutral' | 'amber';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  secondaryContext,
  className = '',
  accent = 'neutral',
  tooltip,
}) => {
  const accentBorder = {
    forest: 'border-l-2 border-l-[#1B4332] dark:border-l-[#2D6A4F]',
    amber: 'border-l-2 border-l-[#B45309] dark:border-l-[#FBBF24]',
    neutral: '',
  };

  return (
    <div
      className={`bg-white dark:bg-[#151917] border border-[#E8EAE6] dark:border-[#242D28] rounded-lg p-4 sm:p-5 transition-all ${accentBorder[accent]} ${className}`}
      title={tooltip}
    >
      <div className="flex items-center justify-between text-xs font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1.5 tracking-tight">
        <span>{label}</span>
        {trend && (
          <Badge
            variant={trend.isNeutral ? 'neutral' : trend.isPositive ? 'positive' : 'negative'}
            size="sm"
          >
            {trend.value}
          </Badge>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-semibold text-[#141716] dark:text-[#F0F3F1] tabular-nums tracking-tight">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-[#8A928E] dark:text-[#6B7771] tabular-nums">
            {subValue}
          </span>
        )}
      </div>

      {secondaryContext && (
        <p className="mt-1 text-xs text-[#58605C] dark:text-[#9BA6A0] truncate">
          {secondaryContext}
        </p>
      )}
    </div>
  );
};
