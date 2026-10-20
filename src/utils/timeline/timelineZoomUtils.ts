export interface ZoomAnchorParams {
  e: WheelEvent;
  containerEl: HTMLElement;
  scrollEl: HTMLElement;
  gridEl: HTMLElement | null;
  currentW: number;
  headerWidth: number;
  totalMeasures: number;
}

export function computeAndApplyWheelZoom({
  e, containerEl, scrollEl, gridEl, currentW, headerWidth, totalMeasures,
}: ZoomAnchorParams): { targetW: number; newScrollLeft: number } | null {
  const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
  if (delta === 0) return null;

  const zoomFactor = delta < 0 ? 1.15 : 0.87;
  const targetW = Math.max(60, Math.min(320, Math.round(currentW * zoomFactor)));
  if (targetW === currentW) return null;

  const mouseViewportX = e.clientX - scrollEl.getBoundingClientRect().left;
  let newScrollLeft = 0;
  if (mouseViewportX > headerWidth) {
    const deltaX = mouseViewportX - headerWidth;
    newScrollLeft = (scrollEl.scrollLeft + deltaX) * (targetW / currentW) - deltaX;
  } else {
    newScrollLeft = scrollEl.scrollLeft * (targetW / currentW);
  }
  newScrollLeft = Math.max(0, newScrollLeft);

  const newTotalGridW = headerWidth + totalMeasures * targetW + 150;
  if (gridEl) {
    gridEl.style.width = `${newTotalGridW}px`;
    gridEl.style.minWidth = `${newTotalGridW}px`;
  }
  const bgEl = scrollEl.querySelector('.wallpaper-surface-bg') as HTMLElement | null;
  if (bgEl) {
    bgEl.style.width = `max(100%, ${newTotalGridW + 150}px)`;
  }
  scrollEl.style.setProperty('--measure-width', `${targetW}px`);
  containerEl.style.setProperty('--measure-width', `${targetW}px`);
  containerEl.style.setProperty('--zoom-level', String(targetW / 480));
  scrollEl.scrollLeft = newScrollLeft;

  return { targetW, newScrollLeft };
}

export function attachTouchPinch(
  el: HTMLElement,
  getMeasureW: () => number,
  onMeasureWidthChange: (w: number) => void
) {
  let initialDist: number | null = null;
  let initialW = 0;
  const onStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialW = getMeasureW();
      e.preventDefault();
    }
  };
  const onMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDist !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (dist > 0) onMeasureWidthChange(Math.max(120, Math.min(960, Math.round(initialW * (dist / initialDist)))));
      e.preventDefault();
    }
  };
  const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) initialDist = null; };
  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd);
  el.addEventListener('touchcancel', onEnd);
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('touchcancel', onEnd);
  };
}
