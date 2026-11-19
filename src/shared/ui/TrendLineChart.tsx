import React, { useState } from 'react';
import { NetworkDemandPoint } from '../../domain/transit/types';

interface TrendLineChartProps {
  data: NetworkDemandPoint[];
  title: string;
  subtitle?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  title,
  subtitle,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(0, data.length - 1)
  );

  if (data.length === 0) return null;

  const width = 640;
  const height = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.activeTripsK), 180);
  const minVal = 80;
  const yTicks = [80, 120, 160, maxVal];

  const getX = (idx: number) =>
    data.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (data.length - 1)) * plotW;

  const getY = (val: number) =>
    padTop + ((maxVal - val) / Math.max(1, maxVal - minVal)) * plotH;

  const points = data.map((d, idx) => `${getX(idx)},${getY(d.activeTripsK)}`).join(' ');
  const areaPoints = `${getX(0)},${padTop + plotH} ${points} ${getX(data.length - 1)},${padTop + plotH}`;

  const activePoint = data[activeIndex] ?? data[0];

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs">
          <span className="font-medium text-[var(--foreground)]">
            {activePoint.slotLabel}
          </span>
          <span className="tabular-nums font-medium text-[var(--accent)]">
            {activePoint.activeTripsK}k trips
          </span>
          <span className="hidden tabular-nums text-[var(--text-secondary)] sm:inline">
            {activePoint.verifiedChecks} checks · {activePoint.reportsFiled}{' '}
            reports
          </span>
        </div>
      </div>

      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title} trend chart`}
          className="h-auto w-full overflow-visible"
        >
          {/* 4 faint reference gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                >
                  {tick}k
                </text>
              </g>
            );
          })}

          {/* Single-hue gentle fill (< 10% opacity) */}
          <polygon
            points={areaPoints}
            fill="var(--accent)"
            fillOpacity="0.09"
          />

          {/* Primary corridor trend polyline */}
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Selectable data nodes */}
          {data.map((d, idx) => {
            const cx = getX(idx);
            const cy = getY(d.activeTripsK);
            const isSelected = idx === activeIndex;
            return (
              <g key={d.slotLabel}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5 : 3.5}
                  fill={isSelected ? 'var(--accent)' : 'var(--surface)'}
                  stroke="var(--accent)"
                  strokeWidth="2"
                  className="cursor-pointer transition-[r,fill,stroke]"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                />
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fill={isSelected ? 'var(--foreground)' : 'var(--text-muted)'}
                  fontWeight={isSelected ? '600' : '400'}
                  fontSize="11"
                  fontFamily="var(--font-sans)"
                  className="cursor-pointer"
                  onClick={() => setActiveIndex(idx)}
                >
                  {d.slotLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
