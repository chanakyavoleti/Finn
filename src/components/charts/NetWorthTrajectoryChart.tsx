import React, { useState } from 'react';

interface TrajectoryPoint {
  date: string;
  value: number;
  isProjected?: boolean;
}

const DEFAULT_TRAJECTORY: TrajectoryPoint[] = [
  { date: 'Nov 25', value: 204500, isProjected: false },
  { date: 'Jan 26', value: 216200, isProjected: false },
  { date: 'Mar 26', value: 221800, isProjected: false },
  { date: 'May 26', value: 228400, isProjected: false },
  { date: 'Jul 26', value: 235100, isProjected: false },
  { date: 'Sep 26', value: 241900, isProjected: false },
  { date: 'Oct 26', value: 250658, isProjected: false }, // Today
  { date: 'Dec 26', value: 258800, isProjected: true },
  { date: 'Feb 27', value: 267000, isProjected: true },
];

export const NetWorthTrajectoryChart: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = DEFAULT_TRAJECTORY;
  const width = 580;
  const height = 190;
  const paddingLeft = 58;
  const paddingBottom = 26;
  const paddingTop = 15;
  const paddingRight = 20;

  const minVal = 190000;
  const maxVal = 280000;

  const getX = (idx: number) => {
    const usableWidth = width - paddingLeft - paddingRight;
    return paddingLeft + (idx / (data.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    const ratio = (val - minVal) / (maxVal - minVal);
    return height - paddingBottom - ratio * usableHeight;
  };

  // Build SVG paths: solid for historical, dashed for projected
  const historicalPoints = data.filter(d => !d.isProjected);
  const projectedPoints = data.filter(d => d.isProjected);

  // Connect last historical with first projected
  const connectionPoint = historicalPoints[historicalPoints.length - 1];
  const fullProjected = [connectionPoint, ...projectedPoints];

  const historicalPathD = historicalPoints.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const projectedOffsetIndex = historicalPoints.length - 1;
  const projectedPathD = fullProjected.reduce((acc, pt, i) => {
    const originalIndex = projectedOffsetIndex + i;
    const x = getX(originalIndex);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#1B4332] dark:bg-[#2D6A4F]" />
            <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">Verified Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-[#8A928E] dark:border-[#6B7771]" />
            <span className="text-[#58605C] dark:text-[#9BA6A0]">Savings Projection (+$4.1k/mo)</span>
          </div>
        </div>
        <span className="text-[11px] text-[#8A928E] dark:text-[#6B7771] tabular-nums">
          CAGR: +16.2%
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible select-none">
          {/* Y Axis Gridlines */}
          {[190000, 220000, 250000, 280000].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
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
                  ${level / 1000}k
                </text>
              </g>
            );
          })}

          {/* Historical Area fill */}
          <path
            d={`${historicalPathD} L ${getX(historicalPoints.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`}
            className="fill-[#1B4332]/5 dark:fill-[#2D6A4F]/10"
          />

          {/* Historical Path */}
          <path
            d={historicalPathD}
            fill="none"
            stroke="currentColor"
            className="text-[#1B4332] dark:text-[#2D6A4F]"
            strokeWidth="2.2"
          />

          {/* Projected Path */}
          <path
            d={projectedPathD}
            fill="none"
            stroke="currentColor"
            className="text-[#748E83] dark:text-[#52B788]"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

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
        {hoveredIndex !== null && (
          <div className="absolute top-0 right-4 bg-white dark:bg-[#1C221F] border border-[#E8EAE6] dark:border-[#2A342E] rounded p-2 text-xs tabular-nums shadow-sm pointer-events-none">
            <div className="text-[#8A928E] dark:text-[#6B7771] flex justify-between gap-3">
              <span>{data[hoveredIndex].date}</span>
              <span>{data[hoveredIndex].isProjected ? 'Forecast' : 'Actual'}</span>
            </div>
            <div className="font-semibold text-sm text-[#141716] dark:text-[#F0F3F1] mt-0.5">
              ${data[hoveredIndex].value.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
