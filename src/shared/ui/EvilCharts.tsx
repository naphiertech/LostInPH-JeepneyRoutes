import React, { useId, useMemo, useState } from 'react';

export interface EvilSeriesConfig {
  key: string;
  label: string;
  color: string;
  variant?: 'solid' | 'hatched' | 'gradient';
  strokeVariant?: 'solid' | 'dashed';
}

function sanitizeSvgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

function buildMonotonePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    path += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return path;
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number
): string {
  if (points.length === 0) return '';
  const curve = buildMonotonePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${curve} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const rad = Math.PI / 180;
  const startX = cx + radius * Math.cos((startAngleDeg - 90) * rad);
  const startY = cy + radius * Math.sin((startAngleDeg - 90) * rad);
  const endX = cx + radius * Math.cos((endAngleDeg - 90) * rad);
  const endY = cy + radius * Math.sin((endAngleDeg - 90) * rad);
  const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? '0' : '1';
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

/* ============================================================================
 * 1. EvilBarChart — Hatched / Gradient / Stacked / Clickable-Legend Bar Chart
 * ============================================================================ */

interface EvilBarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: EvilSeriesConfig[];
  stacked?: boolean;
  height?: number;
  activeIndex?: number;
  onSelectIndex?: (idx: number) => void;
  formatValue?: (v: number) => string;
}

export const EvilBarChart: React.FC<EvilBarChartProps> = ({
  data,
  xKey,
  series,
  stacked = true,
  height = 228,
  activeIndex,
  onSelectIndex,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const uid = sanitizeSvgId(useId());
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenKeys.includes(s.key)),
    [series, hiddenKeys]
  );

  const activeSeries = visibleSeries.length > 0 ? visibleSeries : series;

  const focusedIdx =
    hoveredIdx ??
    (activeIndex !== undefined
      ? Math.min(Math.max(0, activeIndex), Math.max(0, data.length - 1))
      : Math.max(0, data.length - 1));

  const maxVal = useMemo(() => {
    let max = 1;
    for (const row of data) {
      if (stacked) {
        const sum = activeSeries.reduce(
          (acc, s) => acc + Math.max(0, Number(row[s.key] ?? 0)),
          0
        );
        if (sum > max) max = sum;
      } else {
        for (const s of activeSeries) {
          const val = Math.max(0, Number(row[s.key] ?? 0));
          if (val > max) max = val;
        }
      }
    }
    return Math.ceil(max * 1.12);
  }, [data, activeSeries, stacked]);

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= series.length - 1) return [];
      return [...prev, key];
    });
  };

  const vw = 620;
  const vh = height;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;
  const plotW = vw - padLeft - padRight;
  const plotH = vh - padTop - padBottom;
  const colCount = Math.max(1, data.length);
  const slotW = plotW / colCount;
  const tooltipLeftPct = Math.min(
    78,
    Math.max(22, ((padLeft + slotW * (focusedIdx + 0.5)) / vw) * 100)
  );
  const focusedRow = data[focusedIdx];

  return (
    <div className="space-y-3">
      {/* Clickable Series Legend (EvilCharts isClickable pattern) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {series.map((s) => {
            const isHidden = hiddenKeys.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                aria-pressed={!isHidden}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-opacity ${
                  isHidden
                    ? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] opacity-55'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {s.variant === 'hatched' ? (
                  <svg
                    viewBox="0 0 10 10"
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    aria-hidden="true"
                  >
                    <rect width="10" height="10" fill={s.color} fillOpacity="0.25" />
                    <path
                      d="M-2 10 L10 -2 M3 12 L12 3 M-4 6 L6 -4"
                      stroke={s.color}
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: s.color }}
                  />
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-[var(--text-muted)]">
          Click series to isolate · hover bars
        </span>
      </div>

      {/* SVG Canvas + Floating Crosshair Tooltip */}
      <div className="relative">
        {focusedRow && (
          <div
            style={{ left: `${tooltipLeftPct}%` }}
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] tabular-nums"
          >
            <div className="font-semibold text-[var(--foreground)]">
              {String(focusedRow[xKey] ?? '')}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              {activeSeries.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {formatValue(Number(focusedRow[s.key] ?? 0))}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className="h-auto w-full overflow-visible select-none"
          role="img"
          aria-label="Bar chart comparison"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {series.map((s) => (
              <React.Fragment key={s.key}>
                <pattern
                  id={`${uid}-hatch-${s.key}`}
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" fill={s.color} fillOpacity="0.22" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke={s.color}
                    strokeWidth="2.8"
                    strokeOpacity="0.92"
                  />
                </pattern>
                <linearGradient
                  id={`${uid}-grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.6" />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>

          {/* Dashed Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padTop + plotH * (1 - tick);
            const val = Math.round(maxVal * tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={vw - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : '3 4'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  className="tabular-nums"
                >
                  {formatValue(val)}
                </text>
              </g>
            );
          })}

          {/* Column Highlight + Bars */}
          {data.map((row, idx) => {
            const slotX = padLeft + idx * slotW;
            const isFocused = idx === focusedIdx;
            const barWidth = stacked
              ? Math.min(34, slotW * 0.52)
              : Math.min(18, (slotW * 0.7) / Math.max(1, activeSeries.length));

            let currentStackTopY = padTop + plotH;

            return (
              <g
                key={`${String(row[xKey] ?? idx)}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onClick={() => {
                  setHoveredIdx(idx);
                  onSelectIndex?.(idx);
                }}
              >
                {/* Hover column guide */}
                <rect
                  x={slotX + 3}
                  y={padTop}
                  width={Math.max(4, slotW - 6)}
                  height={plotH}
                  rx="8"
                  fill="var(--surface-raised)"
                  fillOpacity={isFocused ? 0.75 : 0}
                />

                {stacked
                  ? activeSeries.map((s, sIdx) => {
                      const val = Math.max(0, Number(row[s.key] ?? 0));
                      const segH = (val / maxVal) * plotH;
                      const segY = currentStackTopY - segH;
                      currentStackTopY = segY;
                      const isTopSegment = sIdx === activeSeries.length - 1;
                      const fill =
                        s.variant === 'hatched'
                          ? `url(#${uid}-hatch-${s.key})`
                          : s.variant === 'gradient'
                            ? `url(#${uid}-grad-${s.key})`
                            : s.color;

                      return (
                        <g key={s.key}>
                          <rect
                            x={slotX + (slotW - barWidth) / 2}
                            y={segY}
                            width={barWidth}
                            height={Math.max(0, segH - (sIdx > 0 ? 1.5 : 0))}
                            rx={isTopSegment ? 5 : 2}
                            fill={fill}
                            stroke={
                              s.variant === 'hatched' ? s.color : undefined
                            }
                            strokeWidth={s.variant === 'hatched' ? 1 : 0}
                            opacity={isFocused ? 1 : 0.88}
                          />
                        </g>
                      );
                    })
                  : activeSeries.map((s, sIdx) => {
                      const val = Math.max(0, Number(row[s.key] ?? 0));
                      const segH = (val / maxVal) * plotH;
                      const groupW = barWidth * activeSeries.length + (activeSeries.length - 1) * 4;
                      const startX = slotX + (slotW - groupW) / 2;
                      const x = startX + sIdx * (barWidth + 4);
                      const y = padTop + plotH - segH;
                      const fill =
                        s.variant === 'hatched'
                          ? `url(#${uid}-hatch-${s.key})`
                          : s.variant === 'gradient'
                            ? `url(#${uid}-grad-${s.key})`
                            : s.color;

                      return (
                        <rect
                          key={s.key}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={segH}
                          rx="4"
                          fill={fill}
                          stroke={s.variant === 'hatched' ? s.color : undefined}
                          strokeWidth={s.variant === 'hatched' ? 1 : 0}
                          opacity={isFocused ? 1 : 0.88}
                        />
                      );
                    })}

                {/* X-axis label */}
                <text
                  x={slotX + slotW / 2}
                  y={vh - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isFocused ? '700' : '500'}
                  fill={isFocused ? 'var(--foreground)' : 'var(--text-muted)'}
                >
                  {String(row[xKey] ?? '')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. EvilAreaChart — Monotone Cubic Bézier + Hatched Gradient Fill + Glowing Dots
 * ============================================================================ */

interface EvilAreaChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: EvilSeriesConfig[];
  height?: number;
  formatValue?: (v: number) => string;
}

export const EvilAreaChart: React.FC<EvilAreaChartProps> = ({
  data,
  xKey,
  series,
  height = 216,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const uid = sanitizeSvgId(useId());
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(
    Math.max(0, data.length - 1)
  );

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenKeys.includes(s.key)),
    [series, hiddenKeys]
  );
  const activeSeries = visibleSeries.length > 0 ? visibleSeries : series;

  const vw = 620;
  const vh = height;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 28;
  const plotW = vw - padLeft - padRight;
  const plotH = vh - padTop - padBottom;
  const baselineY = padTop + plotH;

  const maxVal = useMemo(() => {
    let max = 1;
    for (const row of data) {
      for (const s of activeSeries) {
        const val = Math.max(0, Number(row[s.key] ?? 0));
        if (val > max) max = val;
      }
    }
    return Math.ceil(max * 1.15);
  }, [data, activeSeries]);

  const seriesPoints = useMemo(() => {
    const count = Math.max(1, data.length - 1);
    return activeSeries.map((s) => {
      const pts = data.map((row, idx) => {
        const val = Math.max(0, Number(row[s.key] ?? 0));
        const x =
          data.length === 1
            ? padLeft + plotW / 2
            : padLeft + (idx / count) * plotW;
        const y = baselineY - (val / maxVal) * plotH;
        return { x, y, val };
      });
      return {
        config: s,
        points: pts,
        linePath: buildMonotonePath(pts),
        areaPath: buildAreaPath(pts, baselineY),
      };
    });
  }, [data, activeSeries, padLeft, plotW, baselineY, maxVal, plotH]);

  const safeIdx = Math.min(activeIdx, Math.max(0, data.length - 1));
  const activeRow = data[safeIdx];
  const crosshairX = seriesPoints[0]?.points[safeIdx]?.x ?? padLeft;
  const tooltipLeftPct = Math.min(76, Math.max(24, (crosshairX / vw) * 100));

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= series.length - 1) return [];
      return [...prev, key];
    });
  };

  return (
    <div className="space-y-3">
      {/* Clickable Series Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {series.map((s) => {
            const isHidden = hiddenKeys.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                aria-pressed={!isHidden}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-opacity ${
                  isHidden
                    ? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] opacity-55'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    borderColor: s.color,
                    backgroundColor: 'var(--surface)',
                  }}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
          Point: {String(activeRow?.[xKey] ?? '')}
        </span>
      </div>

      <div className="relative">
        {activeRow && (
          <div
            style={{ left: `${tooltipLeftPct}%` }}
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] tabular-nums"
          >
            <div className="font-semibold text-[var(--foreground)]">
              {String(activeRow[xKey] ?? '')}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              {activeSeries.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {formatValue(Number(activeRow[s.key] ?? 0))}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className="h-auto w-full overflow-visible select-none"
          role="img"
          aria-label="Monotone area trend chart"
        >
          <defs>
            {series.map((s) => (
              <React.Fragment key={s.key}>
                <linearGradient
                  id={`${uid}-area-grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
                <pattern
                  id={`${uid}-area-hatch-${s.key}`}
                  width="7"
                  height="7"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-45)"
                >
                  <rect width="7" height="7" fill={s.color} fillOpacity="0.06" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="7"
                    stroke={s.color}
                    strokeWidth="1.6"
                    strokeOpacity="0.32"
                  />
                </pattern>
              </React.Fragment>
            ))}
          </defs>

          {/* Horizontal Gridlines */}
          {[0, 0.33, 0.66, 1].map((tick) => {
            const y = padTop + plotH * (1 - tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={vw - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : '3 4'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  className="tabular-nums"
                >
                  {formatValue(Math.round(maxVal * tick))}
                </text>
              </g>
            );
          })}

          {/* Crosshair Guide Line */}
          <line
            x1={crosshairX}
            y1={padTop}
            x2={crosshairX}
            y2={baselineY}
            stroke="var(--text-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
          />

          {/* Areas, Glows, Monotone Strokes */}
          {seriesPoints.map(({ config, points, linePath, areaPath }) => {
            const activePt = points[safeIdx];
            return (
              <g key={config.key}>
                <path
                  d={areaPath}
                  fill={
                    config.variant === 'hatched'
                      ? `url(#${uid}-area-hatch-${config.key})`
                      : `url(#${uid}-area-grad-${config.key})`
                  }
                />
                {/* Subtle Glow Path */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={config.color}
                  strokeWidth="6"
                  strokeOpacity="0.14"
                  strokeLinecap="round"
                />
                {/* Crisp Stroke */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={config.color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray={
                    config.strokeVariant === 'dashed' ? '6 5' : undefined
                  }
                />
                {/* Vertex Colored-Border Dots */}
                {points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === safeIdx ? 4.8 : 2.8}
                    fill="var(--surface)"
                    stroke={config.color}
                    strokeWidth={idx === safeIdx ? 2.5 : 1.75}
                  />
                ))}
                {/* Extra Halo on Active Point */}
                {activePt && (
                  <circle
                    cx={activePt.x}
                    cy={activePt.y}
                    r={9}
                    fill={config.color}
                    fillOpacity="0.16"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Hover/Click Columns + X-Axis Labels */}
          {data.map((row, idx) => {
            const x = seriesPoints[0]?.points[idx]?.x ?? padLeft;
            const colW = plotW / Math.max(1, data.length);
            const isSelected = idx === safeIdx;
            return (
              <g
                key={`${String(row[xKey] ?? idx)}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                <rect
                  x={x - colW / 2}
                  y={padTop}
                  width={colW}
                  height={plotH + padBottom}
                  fill="transparent"
                />
                <text
                  x={x}
                  y={vh - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isSelected ? '700' : '500'}
                  fill={isSelected ? 'var(--foreground)' : 'var(--text-muted)'}
                >
                  {String(row[xKey] ?? '')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EvilDonutChart — Dot-Grid Backdrop + Padded Rounded Sectors + Click Legend
 * ============================================================================ */

export interface EvilDonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  variant?: 'solid' | 'hatched';
  helper?: string;
}

interface EvilDonutChartProps {
  segments: EvilDonutSegment[];
  centerLabel: string;
  formatValue?: (v: number) => string;
}

export const EvilDonutChart: React.FC<EvilDonutChartProps> = ({
  segments,
  centerLabel,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const uid = sanitizeSvgId(useId());
  const [selectedId, setSelectedId] = useState<string | null>(
    segments[0]?.id ?? null
  );

  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  );

  const arcs = useMemo(() => {
    const gapDeg = segments.length > 1 ? 6 : 0;
    const usableDeg = 360 - gapDeg * segments.length;
    let cursor = 0;

    return segments.map((seg) => {
      const pct = (seg.value / total) * 100;
      const sweep = Math.max(8, (seg.value / total) * usableDeg);
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + gapDeg;
      return {
        ...seg,
        pct: Math.round(pct),
        d: describeArc(90, 90, 62, startAngle, endAngle),
      };
    });
  }, [segments, total]);

  const focused =
    arcs.find((a) => a.id === selectedId) ?? arcs[0];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      {/* Donut Canvas with Dot-Grid Background Pattern */}
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full select-none">
          <defs>
            <pattern
              id={`${uid}-dotgrid`}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="5"
                cy="5"
                r="1"
                fill="var(--border)"
                fillOpacity="0.85"
              />
            </pattern>
            {arcs.map((a) => (
              <pattern
                key={a.id}
                id={`${uid}-donut-hatch-${a.id}`}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={a.color} fillOpacity="0.35" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={a.color}
                  strokeWidth="2.5"
                />
              </pattern>
            ))}
          </defs>

          <rect
            x="6"
            y="6"
            width="168"
            height="168"
            rx="84"
            fill={`url(#${uid}-dotgrid)`}
          />

          <circle
            cx="90"
            cy="90"
            r="62"
            fill="none"
            stroke="var(--surface-raised)"
            strokeWidth="16"
          />

          {arcs.map((arc) => {
            const isSelected = arc.id === focused?.id;
            return (
              <g
                key={arc.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(arc.id)}
                onMouseEnter={() => setSelectedId(arc.id)}
              >
                {isSelected && (
                  <path
                    d={arc.d}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="22"
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                  />
                )}
                <path
                  d={arc.d}
                  fill="none"
                  stroke={
                    arc.variant === 'hatched'
                      ? `url(#${uid}-donut-hatch-${arc.id})`
                      : arc.color
                  }
                  strokeWidth={isSelected ? 17 : 14}
                  strokeLinecap="round"
                  opacity={isSelected ? 1 : 0.78}
                />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">
            {focused ? focused.label : centerLabel}
          </span>
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)] tabular-nums">
            {focused ? `${focused.pct}%` : '100%'}
          </span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
            {focused ? formatValue(focused.value) : formatValue(total)}
          </span>
        </div>
      </div>

      {/* Clickable Interactive Segment List */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((arc) => {
          const isSelected = arc.id === focused?.id;
          return (
            <button
              key={arc.id}
              type="button"
              onClick={() => setSelectedId(arc.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                isSelected
                  ? 'border-[var(--accent)]/40 bg-[var(--surface-raised)] font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]/60'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[var(--foreground)]">
                    {arc.label}
                  </div>
                  {arc.helper && (
                    <div className="truncate text-[10px] font-normal text-[var(--text-muted)]">
                      {arc.helper}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right tabular-nums">
                <span className="font-semibold text-[var(--foreground)]">
                  {arc.pct}%
                </span>
                <div className="text-[10px] font-normal text-[var(--text-muted)]">
                  {formatValue(arc.value)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. EvilRadarChart — Polygonal Radar Profile with Glowing Edge & Hatched Fill
 * ============================================================================ */

export interface EvilRadarAxis {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface EvilRadarChartProps {
  axes: EvilRadarAxis[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  maxValue?: number;
}

export const EvilRadarChart: React.FC<EvilRadarChartProps> = ({
  axes,
  primaryLabel,
  secondaryLabel = 'Target',
  primaryColor = '#5D9B19',
  secondaryColor = '#0D9488',
  maxValue = 100,
}) => {
  const uid = sanitizeSvgId(useId());
  const [selectedAxisIdx, setSelectedAxisIdx] = useState(0);

  const cx = 135;
  const cy = 115;
  const maxR = 76;
  const count = Math.max(3, axes.length);

  const getPoint = (idx: number, val: number) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
    const r = (Math.max(0, Math.min(maxValue, val)) / maxValue) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const primaryPoints = axes.map((a, idx) => getPoint(idx, a.value));
  const secondaryPoints = axes.map((a, idx) =>
    getPoint(idx, a.secondaryValue ?? 85)
  );

  const primaryPoly = primaryPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const secondaryPoly = secondaryPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const focusedAxis = axes[selectedAxisIdx] ?? axes[0];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 270 230"
        className="h-auto w-full max-w-[260px] shrink-0 select-none"
        role="img"
        aria-label="Multi-metric radar profile"
      >
        <defs>
          <pattern
            id={`${uid}-radar-hatch`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill={primaryColor} fillOpacity="0.16" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={primaryColor}
              strokeWidth="1.6"
              strokeOpacity="0.45"
            />
          </pattern>
        </defs>

        {/* Concentric Web Rings */}
        {[0.25, 0.5, 0.75, 1].map((scale) => {
          const pts = axes
            .map((_, idx) => {
              const p = getPoint(idx, maxValue * scale);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={scale}
              points={pts}
              fill="none"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={scale < 1 ? '2 3' : undefined}
            />
          );
        })}

        {/* Radial Spokes */}
        {axes.map((axis, idx) => {
          const edge = getPoint(idx, maxValue);
          const labelPt = getPoint(idx, maxValue * 1.24);
          const isSelected = idx === selectedAxisIdx;
          return (
            <g
              key={axis.label}
              className="cursor-pointer"
              onClick={() => setSelectedAxisIdx(idx)}
            >
              <line
                x1={cx}
                y1={cy}
                x2={edge.x}
                y2={edge.y}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y + 3}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight={isSelected ? '700' : '500'}
                fill={isSelected ? 'var(--foreground)' : 'var(--text-secondary)'}
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Comparison Target Polygon */}
        <polygon
          points={secondaryPoly}
          fill={secondaryColor}
          fillOpacity="0.1"
          stroke={secondaryColor}
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />

        {/* Primary Performance Polygon (Hatched + Glow Stroke) */}
        <polygon
          points={primaryPoly}
          fill={`url(#${uid}-radar-hatch)`}
          stroke={primaryColor}
          strokeWidth="5"
          strokeOpacity="0.18"
          strokeLinejoin="round"
        />
        <polygon
          points={primaryPoly}
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Vertex Dots */}
        {primaryPoints.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={idx === selectedAxisIdx ? 4.8 : 3.2}
            fill="var(--surface)"
            stroke={primaryColor}
            strokeWidth="2.2"
            className="cursor-pointer"
            onClick={() => setSelectedAxisIdx(idx)}
          />
        ))}
      </svg>

      {/* Selected Axis Readout + Series Legend */}
      <div className="w-full min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
            <span
              className="h-2.5 w-2.5 rounded-xs"
              style={{ backgroundColor: primaryColor }}
            />
            <span>{primaryLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <span
              className="h-2.5 w-2.5 rounded-full border border-dashed"
              style={{ borderColor: secondaryColor }}
            />
            <span>{secondaryLabel}</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {axes.map((axis, idx) => {
            const active = idx === selectedAxisIdx;
            return (
              <button
                key={axis.label}
                type="button"
                onClick={() => setSelectedAxisIdx(idx)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors tabular-nums ${
                  active
                    ? 'border-[var(--accent)]/45 bg-[var(--surface-raised)] font-semibold text-[var(--foreground)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]/50'
                }`}
              >
                <span>{axis.label}</span>
                <span className="text-[var(--foreground)]">
                  {axis.value}/{maxValue}
                </span>
              </button>
            );
          })}
        </div>

        {focusedAxis && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 px-3 py-2 text-[11px] text-[var(--text-secondary)] tabular-nums">
            <strong className="text-[var(--foreground)]">
              {focusedAxis.label}:
            </strong>{' '}
            Current score {focusedAxis.value}/100 vs target{' '}
            {focusedAxis.secondaryValue ?? 85}/100.
          </div>
        )}
      </div>
    </div>
  );
};
