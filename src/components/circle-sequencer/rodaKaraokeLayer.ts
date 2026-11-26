import { drawCenterKaraoke } from './drawCenterKaraoke';
import { resolveActiveVoiceState } from './resolveActiveVoiceState';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
import { LivePlaybackState } from './circleSequencerTypes';

export interface KaraokeLayerCache {
  lastRenderKey: string;
  wasVisible: boolean;
}

export function createKaraokeLayerCache(): KaraokeLayerCache {
  return { lastRenderKey: '', wasVisible: false };
}

export function invalidateKaraokeLayerCache(cache: KaraokeLayerCache): void {
  cache.lastRenderKey = '';
}

/**
 * Peint le médaillon central Karaoké sur son calque dédié (`z-[8]`, au-dessus de `CircleDrumstickOverlay` `z-[5]`)
 * UNIQUEMENT lorsque la syllabe/mesure/échelle change réellement (0 coût par trame le reste du temps).
 */
export function syncKaraokeOverlayLayer(
  karaokeCanvas: HTMLCanvasElement | null,
  targetPx: number,
  isCurrentlyPlaying: boolean,
  localTicks: number,
  live: LivePlaybackState,
  stateVal: any,
  dynamicScale: number,
  isHeavyDisabled: boolean,
  cache: KaraokeLayerCache
): void {
  if (!karaokeCanvas) return;

  if (!stateVal.isLetraActive) {
    if (cache.wasVisible) {
      karaokeCanvas.style.display = 'none';
      cache.wasVisible = false;
      cache.lastRenderKey = '';
    }
    return;
  }

  if (!cache.wasVisible) {
    karaokeCanvas.style.display = 'block';
    cache.wasVisible = true;
  }

  if (karaokeCanvas.width !== targetPx || karaokeCanvas.height !== targetPx) {
    karaokeCanvas.width = targetPx;
    karaokeCanvas.height = targetPx;
    cache.lastRenderKey = '';
  }

  const karaokeLive = !isCurrentlyPlaying && frozenPlaybackState.active
    ? { ...live, step: frozenPlaybackState.tick, measure: frozenPlaybackState.measure, maxTicks: localTicks, ratio: frozenPlaybackState.progress, isPreRoll: false }
    : live;

  const voiceState = resolveActiveVoiceState(
    karaokeLive,
    stateVal.rawTracks,
    stateVal.totalMeasures,
    stateVal.isLoopRegionActive,
    stateVal.loopStartMeasure,
    stateVal.loopEndMeasure,
    stateVal.soloPatternPlayId,
    stateVal.timeSig,
    stateVal.measureTimeSigs
  );

  const renderKey = `${targetPx}_${karaokeLive.measure}_${voiceState.activePattern?.id ?? 0}_${voiceState.activeRole}_${voiceState.currentStep}_${voiceState.isAnacrusis ? 1 : 0}_${dynamicScale.toFixed(2)}`;
  if (renderKey === cache.lastRenderKey) return;
  cache.lastRenderKey = renderKey;

  const kCtx = karaokeCanvas.getContext('2d');
  if (!kCtx) return;

  const scaleFactor = targetPx / 1200;
  kCtx.setTransform(1, 0, 0, 1, 0, 0);
  kCtx.clearRect(0, 0, targetPx, targetPx);
  if (voiceState.activeRole === 'none') return;

  kCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
  drawCenterKaraoke(
    kCtx, 600, 600, karaokeLive, stateVal.tracks, stateVal.rawTracks, stateVal.totalMeasures,
    stateVal.isLoopRegionActive, stateVal.loopStartMeasure, stateVal.loopEndMeasure,
    stateVal.soloPatternPlayId, dynamicScale, stateVal.timeSig, stateVal.measureTimeSigs, isHeavyDisabled
  );
  kCtx.setTransform(1, 0, 0, 1, 0, 0);
}
