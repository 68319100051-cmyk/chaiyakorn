import { useState, useLayoutEffect, useEffect, RefObject } from 'react';

export type A5FitLevel = 0 | 1 | 2 | 3 | 4;

export interface A5FitResult {
  fitLevel: A5FitLevel;
  isOverflowing: boolean;
  measuredContentMm: number;
  usableHeightMm: number;
}

/**
 * Measures real rendered DOM height (scrollHeight) of A5 top + bottom content
 * against the exact printable A5 area (210mm - 6mm top - 3.5mm bottom = 200.5mm,
 * using 198.5mm effective limit for cross-browser Chrome/Edge print safety).
 *
 * Cascades strictly in order:
 *   0 -> Default (10pt table/info, full spacing)
 *   1 -> Reduce spacing between table rows & boxes (still 10pt)
 *   2 -> Reduce table & info-box font size by 0.5pt -> 9.5pt
 *   3 -> Reduce table & info-box font size by 0.5pt -> 9pt (minimum allowed)
 *   4 -> Condense repeated per-device text to 1 line per device (still >= 9pt)
 * If even Level 4 exceeds usableHeightMm, reports isOverflowing = true.
 * Never uses transform: scale() and never goes below 9pt.
 */
export function useA5FitToPage(
  paperRef: RefObject<HTMLDivElement | null>,
  topRef: RefObject<HTMLDivElement | null>,
  bottomRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  resetDeps: unknown[]
): A5FitResult {
  const [fitLevel, setFitLevel] = useState<A5FitLevel>(0);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [measuredContentMm, setMeasuredContentMm] = useState(0);
  // 210mm - 6mm top - 3.5mm bottom = 200.5mm; reserve 2mm anti-rounding guard for Chrome/Edge PDF
  const usableHeightMm = 198.5;

  const [fontsLoadedTick, setFontsLoadedTick] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    if (document.fonts.status === 'loaded') return;
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setFontsLoadedTick(t => t + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  // Reset to Level 0 whenever document/ticket/items change or webfonts settle
  useEffect(() => {
    setFitLevel(0);
    setIsOverflowing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...resetDeps, fontsLoadedTick]);

  useLayoutEffect(() => {
    if (!enabled) {
      setIsOverflowing(false);
      return;
    }

    const paper = paperRef.current;
    const topEl = topRef.current;
    const bottomEl = bottomRef.current;
    if (!paper || !topEl || !bottomEl) return;

    const paperRectWidth = paper.getBoundingClientRect().width;
    if (!paperRectWidth || paperRectWidth <= 0) return;

    const pxPerMm = paperRectWidth / 148;
    const maxUsablePx = usableHeightMm * pxPerMm;

    const topHeight = Math.max(topEl.scrollHeight, topEl.getBoundingClientRect().height);
    const bottomHeight = Math.max(bottomEl.scrollHeight, bottomEl.getBoundingClientRect().height);
    const totalPx = topHeight + bottomHeight;
    const totalMm = Number((totalPx / pxPerMm).toFixed(1));
    setMeasuredContentMm(totalMm);

    if (totalPx > maxUsablePx) {
      if (fitLevel < 4) {
        setFitLevel(prev => (prev < 4 ? ((prev + 1) as A5FitLevel) : prev));
      } else {
        setIsOverflowing(true);
      }
    } else {
      setIsOverflowing(false);
    }
  });

  return {
    fitLevel,
    isOverflowing,
    measuredContentMm,
    usableHeightMm
  };
}
