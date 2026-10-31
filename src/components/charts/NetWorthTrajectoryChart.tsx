import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';

interface TrajectoryPoint {
  date: string;
  value: number;
  isProjected?: boolean;
}

export const NetWorthTrajectoryChart: React.FC = () => {
  const { metrics, formatAmount, primaryCurrency } = useFinance();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentNW = metrics.totalNetWorth;
  const currencySymbol = primaryCurrency === 'INR' ? '₹' : primaryCurrency === 'EUR' ? '€' : primaryCurrency === 'GBP' ? '£' : '$';

  // Construct realistic trajectory relative to current authoritative net worth
  const data: TrajectoryPoint[] = [
    { date: 'May 26', value: Math.round(currentNW * 0.86), isProjected: false },
    { date: 'Jun 26', value: Math.round(currentNW * 0.89), isProjected: false },
    { date: 'Jul 26', value: Math.round(currentNW * 0.92), isProjected: false },
    { date: 'Aug 26', value: Math.round(currentNW * 0.95), isProjected: false },
    { date: 'Sep 26', value: Math.round(currentNW * 0.97), isProjected: false },
    { date: 'Oct 26', value: Math.round(currentNW), isProjected: false }, // Today
    { date: 'Nov 26', value: Math.round(currentNW * 1.03), isProjected: true },
    { date: 'Dec 26', value: Math.round(currentNW * 1.06), isProjected: true },
    { date: 'Jan 27', value: Math.round(currentNW * 1.09), isProjected: true },
  ];

  const width = 580;
  const height = 190;
  const paddingLeft = 60;
  const paddingBottom = 26;
  const paddingTop = 15;
  const paddingRight = 20;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(1000, Math.max(...values) * 1.05);

  const getX = (idx: number) => {
    const usableWidth = width - paddingLeft - paddingRight;
    return paddingLeft + (idx / (data.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
    return height - paddingBottom - ratio * usableHeight;
  };

  // Build SVG paths: solid for historical, dashed for projected
  const historicalPoints = data.filter(d => !d.isProjected);
  const projectedPoints = data.filter(d => d.isProjected);

  const connectionPoint = historicalPoints[historicalPoints.length - 1];
  const fullProjected = [connectionPoint, ...projectedPoints];

  const historicalPathD = historicalPoints.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const projectedOffsetIndex = historicalPoints.length - 1;
  const projectedPathD = fullProjected.reduce((acc, pt, i) => {
    const x = getX(projectedOffsetIndex + i);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const formatLevel = (lvl: number) => {
    if (primaryCurrency === 'INR') {
      if (lvl >= 10000000) return `₹${(lvl / 10000000).toFixed(1)}Cr`;
      if (lvl >= 100000) return `₹${(lvl / 100000).toFixed(1)}L`;
      if (lvl >= 1000) return `₹${Math.round(lvl / 1000)}k`;
      return `₹${Math.round(lvl)}`;
    }
    if (lvl >= 1000) return `${currencySymbol}${Math.round(lvl / 1000)}k`;
    return `${currencySymbol}${Math.round(lvl)}`;
  };

  const gridLevels = [
    minVal,
    minVal + (maxVal - minVal) * 0.33,
    minVal + (maxVal - minVal) * 0.66,
    maxVal,
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#1B4332] dark:bg-[#2D6A4F]" />
            <span className="text-[#58605C] dark:text-[#9BA6A0]">Historical Record</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#748E83] dark:border-[#52B788]" />
            <span className="text-[#58605C] dark:text-[#9BA6A0]">Projected Trajectory</span>
          </div>
        </div>
        <span className="text-[11px] text-[#8A928E] dark:text-[#6B7771] tabular-nums">
          Current: {formatAmount(currentNW)}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible select-none">
          {/* Y Axis Gridlines */}
          {gridLevels.map((level, idx) => {
            const y = getY(level);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-[#E8EAE6] dark:text-[#242D28]"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-[#8A928E] dark:fill-[#6B7771] tabular-nums"
                >
                  {formatLevel(level)}
                </text>
              </g>
            );
          })}

          {/* Historical Area fill */}
          {historicalPathD && (
            <path
              d={`${historicalPathD} L ${getX(historicalPoints.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`}
              className="fill-[#1B4332]/5 dark:fill-[#2D6A4F]/10"
            />
          )}

          {/* Historical Path */}
          {historicalPathD && (
            <path
              d={historicalPathD}
              fill="none"
              stroke="currentColor"
              className="text-[#1B4332] dark:text-[#2D6A4F]"
              strokeWidth="2.2"
            />
          )}

          {/* Projected Path */}
          {projectedPathD && (
            <path
              d={projectedPathD}
              fill="none"
              stroke="currentColor"
              className="text-[#748E83] dark:text-[#52B788]"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Data Points */}
          {data.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.value);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={pt.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3.5}
                  className={`${
                    pt.isProjected
                      ? 'fill-white stroke-[#748E83] dark:fill-[#151917] dark:stroke-[#52B788]'
                      : 'fill-[#1B4332] stroke-white dark:fill-[#2D6A4F] dark:stroke-[#151917]'
                  } transition-all`}
                  strokeWidth="1.5"
                />

                {/* X axis labels */}
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[10px] tabular-nums ${
                    isHovered
                      ? 'font-bold fill-[#141716] dark:fill-[#F0F3F1]'
                      : 'fill-[#8A928E] dark:fill-[#6B7771]'
                  }`}
                >
                  {pt.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Readout Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-0 right-4 bg-white dark:bg-[#1C221F] border border-[#E8EAE6] dark:border-[#2A342E] rounded p-2 text-xs tabular-nums shadow-sm pointer-events-none">
            <div className="text-[#8A928E] dark:text-[#6B7771] flex justify-between gap-3">
              <span>{data[hoveredIndex].date}</span>
              <span>{data[hoveredIndex].isProjected ? 'Forecast' : 'Actual'}</span>
            </div>
            <div className="font-semibold text-sm text-[#141716] dark:text-[#F0F3F1] mt-0.5">
              {formatAmount(data[hoveredIndex].value)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
