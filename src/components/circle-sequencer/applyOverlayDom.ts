
import { SongMarker } from '../../types';
import { OverlayCacheState } from './circleSequencerTypes';
import { ResolvedOverlaySignal } from './resolveOverlaySignal';
import { applySignalOverlay } from './applySignalOverlay';
import { applyPreRollCountdown, applyMarkerOverlay } from './applyPreRollOrMarkerOverlay';

export function applyOverlayDom(
  container: HTMLDivElement,
  afficheurEl: HTMLDivElement,
  imgEl: HTMLImageElement,
  tintEl: HTMLDivElement,
  textEl: HTMLSpanElement,
  cache: OverlayCacheState,
  lastOverlayTextRef: React.MutableRefObject<string>,
  activeSig: ResolvedOverlaySignal | null,
  activeMarker: SongMarker | null,
  isPreRoll: boolean,
  currentBeat: number,
  baseMeasureIdx: number,
  currentMeasureTimeSigs: Record<number, string> | undefined,
  defaultTimeSig: string | undefined
): void {

  if (activeSig) {
    applySignalOverlay(
      container, afficheurEl, imgEl, tintEl, textEl, cache, lastOverlayTextRef,
      activeSig, currentBeat, baseMeasureIdx, currentMeasureTimeSigs, defaultTimeSig
    );
  } else if (isPreRoll) {
    applyPreRollCountdown(container, afficheurEl, imgEl, tintEl, textEl, cache, lastOverlayTextRef, currentBeat);
  } else if (activeMarker) {
    applyMarkerOverlay(container, afficheurEl, imgEl, tintEl, textEl, cache, lastOverlayTextRef, activeMarker);
  } else {
    if (cache.imgDisplay !== 'none') {
      imgEl.style.display = 'none';
      cache.imgDisplay = 'none';
    }
    if (cache.tintDisplay !== 'none') {
      tintEl.style.display = 'none';
      cache.tintDisplay = 'none';
    }
    if (lastOverlayTextRef.current !== '') {
      textEl.innerText = '';
      lastOverlayTextRef.current = '';
    }
    if (cache.textShadow !== 'none') {
      textEl.style.textShadow = 'none';
      cache.textShadow = 'none';
    }
    if (cache.bgColor !== 'transparent') {
      afficheurEl.style.backgroundColor = 'transparent';
      cache.bgColor = 'transparent';
    }
    if (cache.opacity !== '0') {
      container.style.opacity = '0';
      cache.opacity = '0';
    }
  }
}
