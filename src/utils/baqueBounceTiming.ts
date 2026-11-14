/**
 * baqueBounceTiming.ts
 * Calcul pur à l'échantillon près (N * measureDurationSec * sampleRate)
 * et résolution de déclenchement avec Tempérament de Section & Balanço esclave en parité Live (< 115 lignes).
 */

import {
  NEUTRAL_SECTION_TEMPERAMENT, resolveTrackSectionTemperament, type SectionTrackTemperament,
} from '../audio/groove/sectionTemperament';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../hooks/audio-sync/percussionSwingHelper';
import type { GlobalSwing } from '../types';

export interface BaqueCycleTimingParams {
  totalMeasures: number;
  bpm: number;
  measureBpms?: number[];
  measureTimeSigs?: string[];
  timeSig?: string;
  sampleRate?: number;
}

export interface BaqueCycleTimingResult {
  totalMeasures: number;
  bpm: number;
  sampleRate: number;
  totalDurationSec: number;
  exactTotalSamples: number;
  measureStartsSec: number[];
  measureDurationsSec: number[];
  measureTicks: number[];
}

export function formatBaqueBounceFilename(rhythmName: string | undefined, bpm: number): string {
  const slug = (rhythmName || 'baque').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'baque';
  return `${slug}_${Math.max(20, Math.round(Number(bpm) || 88))}bpm.wav`;
}

export function computeBaqueCycleTiming(params: BaqueCycleTimingParams): BaqueCycleTimingResult {
  const totalMeasures = Math.max(1, Math.round(Number(params.totalMeasures) || 1));
  const bpm = Math.max(20, Number(params.bpm) || 88);
  const sampleRate = Math.max(8000, Math.round(Number(params.sampleRate) || 44100));
  const measureStartsSec: number[] = [], measureDurationsSec: number[] = [], measureTicks: number[] = [];
  let accumSec = 0;

  for (let m = 0; m < totalMeasures; m++) {
    const sig = params.measureTimeSigs?.[m] || params.timeSig || '4/4';
    const [bStr, uStr] = String(sig).split('/');
    const beats = parseInt(bStr, 10) || 4, unit = parseInt(uStr, 10) || 4;
    const mBpm = Number(params.measureBpms?.[m]) > 0 ? Number(params.measureBpms![m]) : bpm;
    const durSec = (beats * (4 / unit)) * (60 / mBpm);
    measureStartsSec.push(accumSec);
    measureDurationsSec.push(durSec);
    measureTicks.push(beats * (96 / unit));
    accumSec += durSec;
  }

  return {
    totalMeasures, bpm, sampleRate, totalDurationSec: accumSec,
    exactTotalSamples: Math.round(accumSec * sampleRate),
    measureStartsSec, measureDurationsSec, measureTicks,
  };
}

export function tickToTimeSec(absTick: number, timing: BaqueCycleTimingResult): number {
  let rem = Math.max(0, absTick);
  for (let m = 0; m < timing.totalMeasures; m++) {
    const mTicks = timing.measureTicks[m] || 96;
    if (rem < mTicks || m === timing.totalMeasures - 1) {
      return timing.measureStartsSec[m] + (rem / mTicks) * timing.measureDurationsSec[m];
    }
    rem -= mTicks;
  }
  return timing.totalDurationSec;
}

export function resolveMeasureIndexAtTick(absTick: number, timing: BaqueCycleTimingResult): number {
  let rem = Math.max(0, absTick);
  for (let m = 0; m < timing.totalMeasures; m++) {
    const mTicks = timing.measureTicks[m] || 96;
    if (rem < mTicks || m === timing.totalMeasures - 1) return m;
    rem -= mTicks;
  }
  return 0;
}

export function resolveBounceNoteTrigger(
  absTick: number, packed: number, microPct: number, track: any, allTracks: any[],
  _instId: string, timing: BaqueCycleTimingResult, globalSwing: GlobalSwing,
  temperamentMap?: ReadonlyMap<number, SectionTrackTemperament>
): { mIdx: number; circleStepIdx: number; triggerSec: number } {
  const mIdx = resolveMeasureIndexAtTick(absTick, timing);
  const mTicks = timing.measureTicks[mIdx] || 96, tick96nSec = (timing.measureDurationsSec[mIdx] || 2) / mTicks;
  const activePattern = resolveActivePatternForMeasure(track, allTracks, mIdx, null);
  const circleStepIdx = (packed >>> 16) & 0x3F, isTuplet = ((packed >>> 1) & 1) === 1;
  const temp = temperamentMap
    ? (temperamentMap.get(Number(track.id)) ?? NEUTRAL_SECTION_TEMPERAMENT)
    : resolveTrackSectionTemperament(track, allTracks);
  const swingSec = computePercussionNoteSwing({
    activePattern, liveTrack: track, circleStepIdx, isTuplet, swingJitter: 0,
    globalMode: globalSwing.mode, globalSwing, stepDurationSec: tick96nSec * 6,
    balancoAdherence: temp.balancoAdherence,
  });
  const microSec = (microPct / 100) * (tick96nSec * (mTicks / (activePattern ? activePattern.steps : 16))) * 0.5;
  return {
    mIdx, circleStepIdx,
    triggerSec: tickToTimeSec(absTick, timing) + swingSec + microSec + temp.attackSpreadSec,
  };
}
