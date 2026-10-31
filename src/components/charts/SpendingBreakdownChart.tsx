import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';

export interface CategorySpend {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface SpendingBreakdownChartProps {
  categories?: CategorySpend[];
}

export const SpendingBreakdownChart: React.FC<SpendingBreakdownChartProps> = ({
  categories: propCategories
}) => {
  const { categorySpending, formatAmount } = useFinance();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = propCategories && propCategories.length > 0 ? propCategories : categorySpending;
  const totalSpent = categories.reduce((sum, c) => sum + c.amount, 0);

  if (categories.length === 0 || totalSpent === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#8A928E] dark:text-[#6B7771] border border-dashed border-[#E8EAE6] dark:border-[#252E28] rounded-md">
        No expense disbursements recorded to categorize.
      </div>
    );
  }

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Visual SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-[#E8EAE6] dark:text-[#242D28]"
            strokeWidth={strokeWidth}
          />
          {categories.map((cat) => {
            const strokeDashoffset = circumference - (circumference * cat.percentage) / 100;
            const rotationAngle = (accumulatedPercent / 100) * 360;
            accumulatedPercent += cat.percentage;

            const isSelected = activeCategory === cat.name;

            return (
              <circle
                key={cat.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={cat.color}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(${rotationAngle} ${size / 2} ${size / 2})`}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setActiveCategory(cat.name)}
                onMouseLeave={() => setActiveCategory(null)}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          <span className="text-[10px] text-[#8A928E] dark:text-[#6B7771] uppercase tracking-wider font-medium truncate max-w-[90px]">
            {activeCategory ? activeCategory : 'Total Spent'}
          </span>
          <span className="text-sm font-bold text-[#141716] dark:text-[#F0F3F1] tabular-nums">
            {activeCategory 
              ? formatAmount(categories.find(c => c.name === activeCategory)?.amount || 0)
              : formatAmount(totalSpent)
            }
          </span>
          {activeCategory && (
            <span className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] tabular-nums">
              {categories.find(c => c.name === activeCategory)?.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Categorical Breakdown List */}
      <div className="flex-1 w-full space-y-2">
        {categories.slice(0, 6).map((cat) => {
          const isSelected = activeCategory === cat.name;
          return (
            <div
              key={cat.name}
              onMouseEnter={() => setActiveCategory(cat.name)}
              onMouseLeave={() => setActiveCategory(null)}
              className={`flex items-center justify-between text-xs p-1.5 rounded transition-colors cursor-pointer ${
                isSelected 
                  ? 'bg-[#F2F5F3] dark:bg-[#1E2621]' 
                  : 'hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-xs shrink-0" 
                  style={{ backgroundColor: cat.color }} 
                />
                <span className={`truncate ${isSelected ? 'font-semibold text-[#141716] dark:text-[#F0F3F1]' : 'text-[#58605C] dark:text-[#9BA6A0]'}`}>
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 tabular-nums">
                <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">
                  {formatAmount(cat.amount)}
                </span>
                <span className="text-[11px] text-[#8A928E] dark:text-[#6B7771] w-9 text-right">
                  {cat.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
