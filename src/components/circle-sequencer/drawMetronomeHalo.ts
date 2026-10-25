import { RIM_RADIUS } from './circleSequencerConstants';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { useTransportStore } from '../../stores/useTransportStore';
import { LivePlaybackState } from './circleSequencerTypes';

export interface MetronomeHaloState {
  flashStartTime: number;
  flashBeat: number;
  lastBeatKey: string;
}

export function createMetronomeHaloState(): MetronomeHaloState {
  return { flashStartTime: 0, flashBeat: 0, lastBeatKey: '' };
}

export function drawMetronomeHalo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  live: LivePlaybackState,
  isCurrentlyPlaying: boolean,
  localTimeSig: string,
  ctxTime: number,
  isDark: boolean,
  isEco: boolean,
  haloState: MetronomeHaloState
): void {
  const isVisualMetroActive = useTransportStore.getState().isVisualMetronomeActive;
  if (!isVisualMetroActive || (!isCurrentlyPlaying && !live.isPreRoll)) {
    haloState.lastBeatKey = '';
    haloState.flashStartTime = 0;
    return;
  }

  const isPreRoll = Boolean(live.isPreRoll);
  const beatsInMeasure = getBeatsPerMeasure(localTimeSig);

  let currentBeat = 0;
  let beatKey = '';

  if (isPreRoll) {
    currentBeat = live.preRollBeat !== undefined ? live.preRollBeat : 0;
    beatKey = `preroll_${live.measure}_${currentBeat}`;
  } else {
    let ratio = live.ratio !== undefined ? live.ratio : 0;
    if (live.time !== undefined && live.measureDuration && live.measureDuration > 0) {
      const elapsedSinceTick = Math.max(0, ctxTime - live.time);
      ratio = (live.ratio + elapsedSinceTick / live.measureDuration) % 1;
    }
    currentBeat = Math.min(beatsInMeasure - 1, Math.max(0, Math.floor(ratio * beatsInMeasure)));
    beatKey = `${live.measure}_${currentBeat}`;
  }

  if (beatKey !== haloState.lastBeatKey) {
    haloState.flashStartTime = performance.now();
    haloState.flashBeat = currentBeat;
    haloState.lastBeatKey = beatKey;
  }

  const elapsedMs = performance.now() - haloState.flashStartTime;
  const DURATION_MS = 200;
  if (elapsedMs >= DURATION_MS || haloState.flashStartTime === 0) {
    return;
  }

  const progress = elapsedMs / DURATION_MS;
  const alphaDecay = Math.pow(1 - progress, 2);
  const isBeatOne = haloState.flashBeat === 0;

  const baseAlpha = isDark
    ? (isBeatOne ? 0.95 : 0.75) * alphaDecay
    : (isBeatOne ? 1.0 : 0.85) * alphaDecay;

  const color = isDark
    ? `rgba(250, 204, 21, ${baseAlpha.toFixed(3)})`
    : `rgba(245, 158, 11, ${baseAlpha.toFixed(3)})`;

  const haloRadius = RIM_RADIUS + 18;
  const lineWidth = isBeatOne ? 14 : 8;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  if (!isEco) {
    ctx.shadowColor = color;
    ctx.shadowBlur = isBeatOne ? 24 : 14;
  } else {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
}
