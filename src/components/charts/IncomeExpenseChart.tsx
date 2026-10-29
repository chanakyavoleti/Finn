import React, { useState } from 'react';

interface MonthlyCashFlow {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface IncomeExpenseChartProps {
  data?: MonthlyCashFlow[];
}

const DEFAULT_DATA: MonthlyCashFlow[] = [
  { month: 'May', income: 10400, expenses: 6200, savings: 4200 },
  { month: 'Jun', income: 10400, expenses: 6850, savings: 3550 },
  { month: 'Jul', income: 11150, expenses: 7100, savings: 4050 },
  { month: 'Aug', income: 10400, expenses: 6400, savings: 4000 },
  { month: 'Sep', income: 10800, expenses: 6950, savings: 3850 },
  { month: 'Oct', income: 10720, expenses: 6642, savings: 4078 },
];

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ data = DEFAULT_DATA }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses))) * 1.15;
  const chartHeight = 180;
  const chartWidth = 520;
  const paddingLeft = 50;
  const paddingBottom = 26;
  const availableWidth = chartWidth - paddingLeft - 20;
  const barGroupWidth = availableWidth / data.length;
  const barWidth = 14;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 text-xs text-[#58605C] dark:text-[#9BA6A0]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1B4332] dark:bg-[#2D6A4F]" />
            <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#B91C1C] dark:bg-[#F87171]" />
            <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">Expenses</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#52B788] dark:bg-[#34D399]" />
            <span>Net Savings</span>
          </div>
        </div>

        <button
          onClick={() => setViewMode(prev => prev === 'chart' ? 'table' : 'chart')}
          className="text-[11px] underline font-medium hover:text-[#141716] dark:hover:text-[#F0F3F1] cursor-pointer"
          aria-label="Toggle chart or table view"
        >
          {viewMode === 'chart' ? 'View tabular data' : 'View visual chart'}
        </button>
      </div>

      {viewMode === 'chart' ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 overflow-visible select-none"
          >
            {/* Horizontal Gridlines and Y-axis labels */}
            {[0, 0.33, 0.66, 1].map((pct, idx) => {
              const y = chartHeight - paddingBottom - pct * (chartHeight - paddingBottom - 10);
              const labelValue = Math.round((pct * maxVal) / 1000);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - 10}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#E8EAE6] dark:text-[#242D28]"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#8A928E] dark:fill-[#6B7771] tabular-nums"
                  >
                    ${labelValue}k
                  </text>
                </g>
              );
            })}

            {/* Bars and Month Labels */}
            {data.map((item, idx) => {
              const groupCenterX = paddingLeft + idx * barGroupWidth + barGroupWidth / 2;
              const incomeHeight = (item.income / maxVal) * (chartHeight - paddingBottom - 10);
              const expenseHeight = (item.expenses / maxVal) * (chartHeight - paddingBottom - 10);
              
              const incomeY = chartHeight - paddingBottom - incomeHeight;
              const expenseY = chartHeight - paddingBottom - expenseHeight;

              const isHovered = hoveredIdx === idx;

              return (
                <g 
                  key={item.month}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {/* Subtle hover band */}
                  {isHovered && (
                    <rect
                      x={paddingLeft + idx * barGroupWidth + 2}
                      y={8}
                      width={barGroupWidth - 4}
                      height={chartHeight - paddingBottom}
                      className="fill-black/[0.02] dark:fill-white/[0.03] rounded"
                    />
                  )}

                  {/* Income Bar */}
                  <rect
                    x={groupCenterX - barWidth - 1}
                    y={incomeY}
                    width={barWidth}
                    height={incomeHeight}
                    rx="2"
                    className={`transition-opacity ${isHovered ? 'fill-[#143326] dark:fill-[#377E5E]' : 'fill-[#1B4332] dark:fill-[#2D6A4F]'}`}
                  />

                  {/* Expense Bar */}
                  <rect
                    x={groupCenterX + 1}
                    y={expenseY}
                    width={barWidth}
                    height={expenseHeight}
                    rx="2"
                    className={`transition-opacity ${isHovered ? 'fill-[#7F1D1D] dark:fill-[#EF4444]' : 'fill-[#B91C1C] dark:fill-[#F87171]'}`}
                  />

                  {/* Month Label */}
                  <text
                    x={groupCenterX}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className={`text-[11px] tabular-nums ${isHovered ? 'font-semibold fill-[#141716] dark:fill-[#F0F3F1]' : 'fill-[#58605C] dark:fill-[#9BA6A0]'}`}
                  >
                    {item.month}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Callout */}
          {hoveredIdx !== null && (
            <div className="absolute top-1 right-2 bg-white dark:bg-[#1C221F] border border-[#E8EAE6] dark:border-[#2A342E] rounded-md shadow-md p-2 text-xs tabular-nums z-10 min-w-[170px] animate-in fade-in duration-75">
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1] border-b border-[#E8EAE6] dark:border-[#2A342E] pb-1 mb-1.5 flex justify-between">
                <span>{data[hoveredIdx].month} 2026</span>
                <span className="text-[#166534] dark:text-[#4ADE80]">+{((data[hoveredIdx].savings / data[hoveredIdx].income) * 100).toFixed(1)}% saved</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#58605C] dark:text-[#9BA6A0]">Earned:</span>
                <span className="font-medium text-[#1B4332] dark:text-[#52B788]">${data[hoveredIdx].income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#58605C] dark:text-[#9BA6A0]">Spent:</span>
                <span className="font-medium text-[#991B1B] dark:text-[#F87171]">${data[hoveredIdx].expenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-t border-[#E8EAE6] dark:border-[#2A342E] mt-1 pt-1 font-semibold">
                <span className="text-[#141716] dark:text-[#F0F3F1]">Net Savings:</span>
                <span className="text-[#166534] dark:text-[#4ADE80]">+${data[hoveredIdx].savings.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Accessible Table Alternative */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8EAE6] dark:border-[#242D28] text-[#58605C] dark:text-[#9BA6A0]">
                <th className="py-2 font-medium">Reporting Period</th>
                <th className="py-2 text-right font-medium">Income</th>
                <th className="py-2 text-right font-medium">Expenses</th>
                <th className="py-2 text-right font-medium">Net Savings</th>
                <th className="py-2 text-right font-medium">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
              {data.map((d) => {
                const rate = ((d.savings / d.income) * 100).toFixed(1);
                return (
                  <tr key={d.month} className="hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A]">
                    <td className="py-2 font-medium text-[#141716] dark:text-[#F0F3F1]">{d.month} 2026</td>
                    <td className="py-2 text-right tabular-nums text-[#166534] dark:text-[#4ADE80]">${d.income.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-[#991B1B] dark:text-[#F87171]">${d.expenses.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-[#141716] dark:text-[#F0F3F1]">+${d.savings.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-[#58605C] dark:text-[#9BA6A0]">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
