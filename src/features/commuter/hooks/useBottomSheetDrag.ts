import React, { useRef, useState } from 'react';

export type SheetSnapState = 'peek' | 'half' | 'full';

export function useBottomSheetDrag(initialSnap: SheetSnapState = 'half') {
  const [sheetSnap, setSheetSnap] = useState<SheetSnapState>(initialSnap);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const didDragRef = useRef(false);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStartRef.current = { y: e.clientY, time: Date.now() };
    didDragRef.current = false;
    setDragOffsetY(0);
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dy) >= 9) {
      didDragRef.current = true;
    }
    setDragOffsetY(Math.max(-140, Math.min(180, dy)));
  };

  const finishSheetDrag = (clientY: number) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDragOffsetY(0);

    const dy = clientY - start.y;
    const dt = Math.max(1, Date.now() - start.time);
    const velocity = dy / dt;

    if (Math.abs(dy) < 9) {
      return;
    }

    if (dy > 28 || velocity > 0.25) {
      setSheetSnap((prev) => {
        if (prev === 'full' && dy < 110 && velocity < 0.65) return 'half';
        return 'peek';
      });
      return;
    }

    if (dy < -28 || velocity < -0.25) {
      setSheetSnap((prev) => {
        if (prev === 'peek' && dy > -120 && velocity > -0.65) return 'half';
        return 'full';
      });
    }
  };

  const cancelSheetDrag = () => {
    dragStartRef.current = null;
    didDragRef.current = false;
    setDragOffsetY(0);
  };

  const togglePeek = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'peek'));
  };

  return {
    sheetSnap,
    setSheetSnap,
    dragOffsetY,
    handleSheetPointerDown,
    handleSheetPointerMove,
    finishSheetDrag,
    cancelSheetDrag,
    togglePeek,
  };
}
