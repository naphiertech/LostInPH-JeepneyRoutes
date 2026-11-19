import React from 'react';
import { JeepneyRoute } from '../../../domain/transit/types';

export type VehicleArtworkSize = 'compact' | 'row' | 'detail';

interface VehicleArtworkProps {
  color: string;
  vehicleType: JeepneyRoute['vehicleType'];
  size?: VehicleArtworkSize;
  compact?: boolean;
}

const VEHICLE_ASSETS: Record<
  JeepneyRoute['vehicleType'],
  { webp: string; png: string }
> = {
  traditional_jeepney: {
    webp: '/vehicles/traditional-jeepney.webp',
    png: '/vehicles/traditional-jeepney.png',
  },
  modern_puv: {
    webp: '/vehicles/modern-puv.webp',
    png: '/vehicles/modern-puv.png',
  },
};

const SIZE_CLASSES: Record<
  VehicleArtworkSize,
  { container: string; img: string }
> = {
  compact: {
    container:
      'h-[58px] w-[80px] rounded-[11px] p-1 ring-1 ring-inset ring-black/[0.05] dark:ring-white/[0.07]',
    img: 'h-full w-full',
  },
  row: {
    container:
      'w-[92px] sm:w-[100px] self-stretch border-r border-[var(--border-subtle)] px-1.5 py-2',
    img: 'max-h-[64px] w-full',
  },
  detail: {
    container:
      'min-h-[84px] w-[108px] sm:w-[120px] self-stretch border-r border-[var(--border-subtle)] px-2 py-2',
    img: 'max-h-[72px] w-full',
  },
};

/**
 * Studio-rendered isometric 3D miniature sprite for Traditional Philippine Jeepneys
 * and Modern PUVs, staged on a subtle route-color-tinted neutral surface that adapts
 * cleanly to both Light and Dark themes.
 */
export const TransitVehicleArtwork: React.FC<VehicleArtworkProps> = ({
  color,
  vehicleType,
  size,
  compact = false,
}) => {
  const resolvedSize: VehicleArtworkSize = size ?? (compact ? 'compact' : 'row');
  const asset = VEHICLE_ASSETS[vehicleType];
  const classes = SIZE_CLASSES[resolvedSize];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[var(--surface-raised)] ${classes.container}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 9%, var(--surface-raised))`,
      }}
      aria-hidden="true"
    >
      <picture className="flex h-full w-full items-center justify-center">
        <source srcSet={asset.webp} type="image/webp" />
        <img
          src={asset.png}
          alt=""
          width={480}
          height={360}
          decoding="async"
          draggable={false}
          className={`pointer-events-none select-none object-contain transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${classes.img}`}
        />
      </picture>
    </div>
  );
};
