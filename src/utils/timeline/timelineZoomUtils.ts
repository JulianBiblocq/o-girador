export const livePlayheadZoomState = {
  measure: 0, ratio: 0, measureDuration: 0, lastTickPerfMs: 0, liveMeasureW: 0, lastScrollX: -1,
};

export interface AnchoredZoomParams {
  containerEl: HTMLElement; scrollEl: HTMLElement; gridEl: HTMLElement | null;
  currentW: number; targetW: number; baseMeasureW: number; headerWidth: number;
  totalMeasures: number; totalContentW: number; leftPositions: number[]; widths: number[];
  isPlaying: boolean; anchorMeasureIdx: number; playheadMeasureIdx: number; disablePlayheadRAF?: boolean;
}

export function applyAnchoredTimelineZoom({
  containerEl, scrollEl, gridEl, currentW, targetW, baseMeasureW,
  headerWidth, totalMeasures, totalContentW, leftPositions, widths,
  isPlaying, anchorMeasureIdx, playheadMeasureIdx, disablePlayheadRAF = false,
}: AnchoredZoomParams): { targetW: number; newScrollLeft: number } | null {
  if (targetW === currentW) return null;

  const safeBaseW = baseMeasureW > 0 ? baseMeasureW : currentW;
  const oldScale = safeBaseW > 0 ? currentW / safeBaseW : 1;
  const newScale = safeBaseW > 0 ? targetW / safeBaseW : 1;

  let xOld = 0;
  let xNew = 0;

  if (isPlaying) {
    const m = Math.max(0, Math.min(totalMeasures - 1, livePlayheadZoomState.measure));
    const baseLeft = leftPositions[m] ?? (m * safeBaseW);
    const baseW = widths[m] ?? safeBaseW;
    const elapsedSec = livePlayheadZoomState.measureDuration > 0 && livePlayheadZoomState.lastTickPerfMs > 0
      ? Math.max(0, (performance.now() - livePlayheadZoomState.lastTickPerfMs) / 1000)
      : 0;
    const interpRatio = livePlayheadZoomState.measureDuration > 0
      ? Math.min(1, livePlayheadZoomState.ratio + elapsedSec / livePlayheadZoomState.measureDuration)
      : livePlayheadZoomState.ratio;
    const baseExactX = baseLeft + interpRatio * baseW;
    xOld = baseExactX * oldScale;
    xNew = baseExactX * newScale;
  } else {
    const m = Math.max(0, Math.min(totalMeasures - 1, anchorMeasureIdx));
    const baseLeft = leftPositions[m] ?? (m * safeBaseW);
    xOld = baseLeft * oldScale;
    xNew = baseLeft * newScale;
  }

  const viewportContentW = Math.max(1, scrollEl.clientWidth - headerWidth);
  const deltaViewport = xOld - scrollEl.scrollLeft;
  const isAnchorVisible = deltaViewport >= 0 && deltaViewport <= viewportContentW;
  const newScrollLeft = isAnchorVisible
    ? Math.max(0, xNew - deltaViewport)
    : Math.max(0, xNew - viewportContentW * 0.35);

  livePlayheadZoomState.liveMeasureW = targetW;
  livePlayheadZoomState.lastScrollX = newScrollLeft;

  const totalRatio = safeBaseW > 0 && totalContentW > 0 ? totalContentW / safeBaseW : totalMeasures;
  const newTotalGridW = headerWidth + totalRatio * targetW + 150;
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

  const playheadEl = document.getElementById('timeline-playhead-line') as HTMLElement | null;
  if (playheadEl) {
    const phMeasure = isPlaying
      ? Math.max(0, Math.min(totalMeasures - 1, livePlayheadZoomState.measure))
      : Math.max(0, Math.min(totalMeasures - 1, playheadMeasureIdx));
    const phBaseLeft = leftPositions[phMeasure] ?? (phMeasure * safeBaseW);
    const phBaseW = widths[phMeasure] ?? safeBaseW;
    const phX = isPlaying ? xNew : phBaseLeft * newScale;

    playheadEl.style.transition = 'none';
    playheadEl.style.transform = `translate3d(${headerWidth + phX}px, 0, 0)`;
    playheadEl.style.visibility = phX >= newScrollLeft ? 'visible' : 'hidden';

    if (isPlaying && livePlayheadZoomState.measureDuration > 0 && !disablePlayheadRAF) {
      const elapsedSec = livePlayheadZoomState.lastTickPerfMs > 0
        ? Math.max(0, (performance.now() - livePlayheadZoomState.lastTickPerfMs) / 1000)
        : 0;
      const curRatio = Math.min(1, livePlayheadZoomState.ratio + elapsedSec / livePlayheadZoomState.measureDuration);
      const remSec = Math.max(0.05, (1 - curRatio) * livePlayheadZoomState.measureDuration);
      const endX = (phBaseLeft + phBaseW) * newScale;
      requestAnimationFrame(() => {
        if (playheadEl && livePlayheadZoomState.liveMeasureW === targetW) {
          playheadEl.style.transition = `transform ${remSec}s linear`;
          playheadEl.style.transform = `translate3d(${headerWidth + endX}px, 0, 0)`;
        }
      });
    }
  }

  return { targetW, newScrollLeft };
}

export function attachTouchPinch(
  el: HTMLElement,
  getMeasureW: () => number,
  onZoomTarget: (w: number) => void
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
      if (dist > 0) onZoomTarget(Math.max(60, Math.min(320, Math.round(initialW * (dist / initialDist)))));
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
