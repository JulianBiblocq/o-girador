import { RIM_RADIUS } from './circleSequencerConstants';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { useTransportStore } from '../../stores/useTransportStore';
import { computeMonotonicMeasureProgress } from './computeStickAngle';
import { LivePlaybackState } from './circleSequencerTypes';

export interface MetronomeHaloState {
  flashStartTime: number;
  flashBeat: number;
  lastBeatKey: string;
}

const HALO_DURATION_MS = 200;

export function createMetronomeHaloState(): MetronomeHaloState {
  return { flashStartTime: 0, flashBeat: 0, lastBeatKey: '' };
}

export function isMetronomeHaloAnimating(haloState: MetronomeHaloState): boolean {
  return haloState.flashStartTime > 0 && (performance.now() - haloState.flashStartTime) < HALO_DURATION_MS;
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
    const ratio = computeMonotonicMeasureProgress(live, isCurrentlyPlaying, ctxTime);
    currentBeat = Math.min(beatsInMeasure - 1, Math.max(0, Math.floor(ratio * beatsInMeasure)));
    beatKey = `${live.measure}_${currentBeat}`;
  }

  if (beatKey !== haloState.lastBeatKey) {
    haloState.flashStartTime = performance.now();
    haloState.flashBeat = currentBeat;
    haloState.lastBeatKey = beatKey;
  }

  const elapsedMs = performance.now() - haloState.flashStartTime;
  if (elapsedMs >= HALO_DURATION_MS || haloState.flashStartTime === 0) {
    return;
  }

  const progress = elapsedMs / HALO_DURATION_MS;
  const alphaDecay = Math.pow(1 - progress, 2);
  const isBeatOne = haloState.flashBeat === 0;
  const baseAlpha = isDark
    ? (isBeatOne ? 0.95 : 0.75) * alphaDecay
    : (isBeatOne ? 1.0 : 0.85) * alphaDecay;

  const rgb = isDark ? '250, 204, 21' : '245, 158, 11';
  const haloRadius = RIM_RADIUS + 18;

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  if (!isEco) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb}, ${(baseAlpha * 0.26).toFixed(3)})`;
    ctx.lineWidth = isBeatOne ? 30 : 20;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${rgb}, ${baseAlpha.toFixed(3)})`;
  ctx.lineWidth = isBeatOne ? 14 : 8;
  ctx.stroke();
  ctx.restore();
}
