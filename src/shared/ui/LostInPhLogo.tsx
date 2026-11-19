import React from 'react';

interface LostInPhLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'darkTile' | 'greenTile';
  showConstruction?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<LostInPhLogoProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
  xl: 'h-16 w-16',
};

export const LostInPhLogo: React.FC<LostInPhLogoProps> = ({
  size = 'md',
  theme = 'darkTile',
  showConstruction = false,
  className = '',
}) => {
  const isGreen = theme === 'greenTile';
  const tileBg = isGreen ? '#5D9B19' : '#111827';
  const markColor = isGreen ? '#FFFFFF' : '#78BE20';
  const innerTrackColor = isGreen ? '#5D9B19' : '#111827';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
    >
      <rect width="64" height="64" rx="16" fill={tileBg} />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke={markColor}
        strokeOpacity={isGreen ? '0.32' : '0.38'}
        strokeWidth="1.5"
      />

      {showConstruction && (
        <>
          <circle
            cx="32"
            cy="34"
            r="21"
            stroke="#9CA3AF"
            strokeOpacity="0.38"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1="10"
            y1="34"
            x2="54"
            y2="34"
            stroke="#9CA3AF"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
          <line
            x1="32"
            y1="10"
            x2="32"
            y2="56"
            stroke="#9CA3AF"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
        </>
      )}

      {/* Iconic 3-Peak Jeepney Signboard Crown */}
      <path
        d="M23.5 18.5L21 11.5L28.5 15L33 10.5L37.5 15L45 11.5L42.5 18.5H23.5Z"
        fill={markColor}
      />

      {/* Double-Tracked L-Corridor Loop */}
      <path
        d="M19.5 22.5V43.5C19.5 46.8137 22.1863 49.5 25.5 49.5H43.5"
        stroke={markColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 22.5V43.5C19.5 46.8137 22.1863 49.5 25.5 49.5H43.5"
        stroke={innerTrackColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 45-Degree Wayfinding Compass Arrowhead */}
      <path
        d="M28.5 29.5L45 23L38.5 39.5L35 33L28.5 29.5Z"
        fill={markColor}
      />
    </svg>
  );
};
