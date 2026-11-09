export const livePlayheadZoomState = {
  measure: 0, ratio: 0, measureDuration: 0, lastTickPerfMs: 0, liveMeasureW: 0, lastScrollX: -1, isZooming: false,
};

export function setTimelineZoomingDomFlag(_containerEl: HTMLElement | null, _scrollEl: HTMLElement | null, active: boolean) {
  livePlayheadZoomState.isZooming = active;
}

export interface AnchoredZoomParams {
  containerEl: HTMLElement; scrollEl: HTMLElement; gridEl: HTMLElement | null;
  currentW: number; targetW: number; baseMeasureW: number; headerWidth: number;
  totalMeasures: number; totalContentW: number; leftPositions: number[]; widths: number[];
  isPlaying: boolean; anchorMeasureIdx: number; playheadMeasureIdx: number;
}

export function computeWheelZoomTarget(rawDelta: number, currentTargetW: number): number | null {
  if (rawDelta === 0) return null;
  const clampedDelta = Math.max(-120, Math.min(120, rawDelta));
  const stepFactor = Math.pow(1.0018, -clampedDelta);
  const nextTarget = Math.max(60, Math.min(320, currentTargetW * stepFactor));
  return Math.abs(nextTarget - currentTargetW) > 0.1 ? nextTarget : null;
}

export function applyAnchoredTimelineZoom({
  containerEl, scrollEl, gridEl, currentW, targetW, baseMeasureW,
  headerWidth, totalMeasures, totalContentW, leftPositions, widths,
  isPlaying, anchorMeasureIdx, playheadMeasureIdx,
}: AnchoredZoomParams): { targetW: number; newScrollLeft: number } | null {
  if (targetW === currentW) return null;

  const safeBaseW = baseMeasureW > 0 ? baseMeasureW : currentW;
  const oldScale = safeBaseW > 0 ? currentW / safeBaseW : 1;
  const newScale = safeBaseW > 0 ? targetW / safeBaseW : 1;

  let xOld = 0, xNew = 0;
  if (isPlaying) {
    const m = Math.max(0, Math.min(totalMeasures - 1, livePlayheadZoomState.measure));
    const baseLeft = leftPositions[m] ?? (m * safeBaseW), baseW = widths[m] ?? safeBaseW;
    const elapsedSec = livePlayheadZoomState.measureDuration > 0 && livePlayheadZoomState.lastTickPerfMs > 0
      ? Math.max(0, (performance.now() - livePlayheadZoomState.lastTickPerfMs) / 1000) : 0;
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
  const newScrollLeft = isAnchorVisible ? Math.max(0, xNew - deltaViewport) : Math.max(0, xNew - viewportContentW * 0.35);

  livePlayheadZoomState.liveMeasureW = targetW;
  livePlayheadZoomState.lastScrollX = newScrollLeft;

  const totalRatio = safeBaseW > 0 && totalContentW > 0 ? totalContentW / safeBaseW : totalMeasures;
  const newTotalGridW = headerWidth + totalRatio * targetW + 150;
  if (gridEl) { gridEl.style.width = `${newTotalGridW}px`; gridEl.style.minWidth = `${newTotalGridW}px`; }
  const bgEl = scrollEl.querySelector('.wallpaper-surface-bg') as HTMLElement | null;
  if (bgEl) bgEl.style.width = `max(100%, ${newTotalGridW + 150}px)`;
  scrollEl.style.setProperty('--measure-width', `${targetW}px`);
  containerEl.style.setProperty('--measure-width', `${targetW}px`);
  containerEl.style.setProperty('--zoom-level', String(targetW / 480));
  scrollEl.scrollLeft = newScrollLeft;

  const playheadEl = document.getElementById('timeline-playhead-line') as HTMLElement | null;
  if (playheadEl) {
    const phMeasure = Math.max(0, Math.min(totalMeasures - 1, isPlaying ? livePlayheadZoomState.measure : playheadMeasureIdx));
    const phBaseLeft = leftPositions[phMeasure] ?? (phMeasure * safeBaseW);
    const phX = isPlaying ? xNew : phBaseLeft * newScale;
    playheadEl.style.transition = 'none';
    playheadEl.style.transform = `translate3d(${headerWidth + phX}px, 0, 0)`;
    playheadEl.style.visibility = phX >= newScrollLeft ? 'visible' : 'hidden';
  }

  return { targetW, newScrollLeft };
}

export function attachTouchPinch(el: HTMLElement, getMeasureW: () => number, onZoomTarget: (w: number) => void) {
  let initialDist: number | null = null, initialW = 0;
  const onStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialW = getMeasureW(); e.preventDefault();
    }
  };
  const onMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDist !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (dist > 0) onZoomTarget(Math.max(60, Math.min(320, initialW * (dist / initialDist))));
      e.preventDefault();
    }
  };
  const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) initialDist = null; };
  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd); el.addEventListener('touchcancel', onEnd);
  return () => {
    el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd);
  };
}
