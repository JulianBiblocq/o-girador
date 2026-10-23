
import { SongMarker } from '../../types';
import { OverlayCacheState } from './circleSequencerTypes';

export function applyPreRollCountdown(
  container: HTMLDivElement,
  afficheurEl: HTMLDivElement,
  imgEl: HTMLImageElement,
  tintEl: HTMLDivElement,
  textEl: HTMLSpanElement,
  cache: OverlayCacheState,
  lastOverlayTextRef: React.MutableRefObject<string>,
  currentBeat: number
): void {
  if (cache.imgDisplay !== 'none') {
    imgEl.style.display = 'none';
    cache.imgDisplay = 'none';
  }
  if (cache.tintDisplay !== 'none') {
    tintEl.style.display = 'none';
    cache.tintDisplay = 'none';
  }
  const countNum = String(currentBeat + 1);
  if (lastOverlayTextRef.current !== countNum) {
    textEl.innerText = countNum;
    lastOverlayTextRef.current = countNum;
    try {
      afficheurEl.animate(
        [{ transform: 'scale(1.25)' }, { transform: 'scale(1.0)' }],
        { duration: 180, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
      );
    } catch (_) {}
  }
  if (cache.bgColor !== 'var(--cordel-wood)') {
    afficheurEl.style.backgroundColor = 'var(--cordel-wood)';
    cache.bgColor = 'var(--cordel-wood)';
  }
  if (cache.color !== '#f4ecd8') {
    textEl.style.color = '#f4ecd8';
    cache.color = '#f4ecd8';
  }
  if (cache.textShadow !== 'none') {
    textEl.style.textShadow = 'none';
    cache.textShadow = 'none';
  }
  const sizeVal = 'clamp(24px, 4.5vw, 38px)';
  if (cache.fontSize !== sizeVal) {
    textEl.style.setProperty('--dynamic-font-size', sizeVal);
    cache.fontSize = sizeVal;
  }
  if (cache.opacity !== '0.90') {
    container.style.opacity = '0.90';
    cache.opacity = '0.90';
  }
}

export function applyMarkerOverlay(
  container: HTMLDivElement,
  afficheurEl: HTMLDivElement,
  imgEl: HTMLImageElement,
  tintEl: HTMLDivElement,
  textEl: HTMLSpanElement,
  cache: OverlayCacheState,
  lastOverlayTextRef: React.MutableRefObject<string>,
  activeMarker: SongMarker
): void {
  if (cache.imgDisplay !== 'none') {
    imgEl.style.display = 'none';
    cache.imgDisplay = 'none';
  }
  if (cache.tintDisplay !== 'none') {
    tintEl.style.display = 'none';
    cache.tintDisplay = 'none';
  }
  const targetBgColor = activeMarker.color || '#f19066';
  if (cache.bgColor !== targetBgColor) {
    afficheurEl.style.backgroundColor = targetBgColor;
    cache.bgColor = targetBgColor;
  }
  if (lastOverlayTextRef.current !== activeMarker.name) {
    textEl.innerText = activeMarker.name;
    lastOverlayTextRef.current = activeMarker.name;
  }
  if (cache.color !== '#1a1a1a') {
    textEl.style.color = '#1a1a1a';
    cache.color = '#1a1a1a';
  }
  if (cache.textShadow !== 'none') {
    textEl.style.textShadow = 'none';
    cache.textShadow = 'none';
  }

  const lines = activeMarker.name.split('\n');
  const maxLineLen = Math.max(...lines.map(l => l.trim().length));
  let sizeVal = 'clamp(12px, 1.6vw, 14px)';
  if (maxLineLen <= 6 && lines.length <= 2) sizeVal = 'clamp(13px, 2.0vw, 16px)';
  else if (maxLineLen <= 10 && lines.length <= 2) sizeVal = 'clamp(12px, 1.8vw, 15px)';
  else if (maxLineLen <= 14) sizeVal = 'clamp(11px, 1.6vw, 13px)';
  else sizeVal = 'clamp(10px, 1.3vw, 12px)';

  if (cache.fontSize !== sizeVal) {
    textEl.style.setProperty('--dynamic-font-size', sizeVal);
    cache.fontSize = sizeVal;
  }
  if (cache.opacity !== '0.85') {
    container.style.opacity = '0.85';
    cache.opacity = '0.85';
  }
}
