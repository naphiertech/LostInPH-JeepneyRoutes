import React from 'react';

interface ResponsiveTableProps {
  ariaLabel: string;
  columnLabels?: Partial<Record<2 | 3 | 4 | 5 | 6 | 7 | 8, string>>;
  children: React.ReactNode;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  ariaLabel,
  columnLabels,
  children,
}) => {
  const cssVars: React.CSSProperties = {};
  if (columnLabels) {
    for (const [idx, label] of Object.entries(columnLabels)) {
      if (label) {
        (cssVars as Record<string, string>)[`--col-${idx}`] = `"${label}"`;
      }
    }
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      style={cssVars}
      className="table-wrapper focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      <table>{children}</table>
    </div>
  );
};
