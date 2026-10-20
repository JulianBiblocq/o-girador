/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OverlayCacheState } from './circleSequencerTypes';
import { ResolvedOverlaySignal } from './resolveOverlaySignal';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';

export function applySignalOverlay(
  container: HTMLDivElement,
  afficheurEl: HTMLDivElement,
  imgEl: HTMLImageElement,
  tintEl: HTMLDivElement,
  textEl: HTMLSpanElement,
  cache: OverlayCacheState,
  lastOverlayTextRef: React.MutableRefObject<string>,
  activeSig: ResolvedOverlaySignal,
  currentBeat: number,
  baseMeasureIdx: number,
  currentMeasureTimeSigs: Record<number, string> | undefined,
  defaultTimeSig: string | undefined
): void {
  let targetSrc = activeSig.image;
  if (activeSig.beatsCount !== 1 && activeSig.frames && activeSig.frames.length > 1) {
    const localSig = (currentMeasureTimeSigs && currentMeasureTimeSigs[baseMeasureIdx]) || defaultTimeSig || '4/4';
    const beatsInM = getBeatsPerMeasure(localSig);
    const totalFrames = activeSig.frames.length;
    const frameIdx = Math.min(totalFrames - 1, Math.floor((currentBeat / beatsInM) * totalFrames));
    targetSrc = activeSig.frames[frameIdx] || activeSig.frames[0] || activeSig.image;
  } else if (activeSig.frames && activeSig.frames.length > 0) {
    targetSrc = activeSig.frames[0] || activeSig.image;
  }

  if (cache.imgSrc !== targetSrc) {
    imgEl.src = targetSrc;
    cache.imgSrc = targetSrc;
  }
  if (imgEl.alt !== activeSig.name) imgEl.alt = activeSig.name;
  if (cache.imgDisplay !== 'block') {
    imgEl.style.display = 'block';
    cache.imgDisplay = 'block';
  }
  if (cache.tintDisplay !== 'block') {
    tintEl.style.display = 'block';
    cache.tintDisplay = 'block';
  }
  if (cache.bgColor !== 'transparent') {
    afficheurEl.style.backgroundColor = 'transparent';
    cache.bgColor = 'transparent';
  }

  if (lastOverlayTextRef.current !== activeSig.name) {
    textEl.innerText = activeSig.name;
    lastOverlayTextRef.current = activeSig.name;
  }
  if (cache.color !== '#ffffff') {
    textEl.style.color = '#ffffff';
    cache.color = '#ffffff';
  }
  if (cache.textShadow !== '0 1px 3px rgba(0,0,0,0.9)') {
    textEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
    cache.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
  }

  const len = activeSig.name.length;
  let sizeVal = 'clamp(7px, 1.1vw, 9px)';
  if (len <= 6) sizeVal = 'clamp(9px, 1.8vw, 16px)';
  else if (len <= 12) sizeVal = 'clamp(8px, 1.4vw, 12px)';

  if (cache.fontSize !== sizeVal) {
    textEl.style.setProperty('--dynamic-font-size', sizeVal);
    cache.fontSize = sizeVal;
  }
  if (cache.opacity !== '0.85') {
    container.style.opacity = '0.85';
    cache.opacity = '0.85';
  }
}
