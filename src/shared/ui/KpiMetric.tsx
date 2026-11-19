import React from 'react';

interface KpiMetricProps {
  label: string;
  value: string | number;
  helperText?: string;
  deltaLabel?: string;
  deltaTone?: 'neutral' | 'positive' | 'warning';
}

const DELTA_STYLES: Record<NonNullable<KpiMetricProps['deltaTone']>, string> = {
  neutral: 'text-[var(--text-secondary)]',
  positive: 'text-[var(--success)]',
  warning: 'text-[var(--peak)]',
};

export const KpiMetric: React.FC<KpiMetricProps> = ({
  label,
  value,
  helperText,
  deltaLabel,
  deltaTone = 'neutral',
}) => {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <div className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <div className="font-display tabular-nums text-[26px] font-semibold leading-tight text-[var(--foreground)]">
          {value}
        </div>
        {deltaLabel && (
          <span
            className={`tabular-nums text-xs font-medium ${DELTA_STYLES[deltaTone]}`}
          >
            {deltaLabel}
          </span>
        )}
      </div>
      {helperText && (
        <div className="mt-1 text-xs text-[var(--text-muted)]">{helperText}</div>
      )}
    </div>
  );
};
