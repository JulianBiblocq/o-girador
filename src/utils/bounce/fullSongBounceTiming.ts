/**
 * fullSongBounceTiming.ts — Déroulé complet (sections, boucles, 1ª VEZ, rampes BPM + queue 1.8 s) (< 130 lignes).
 */
import { getVariationSculptArrays } from '../../utils/soloVariationMatcher';
import { getBeatsPerMeasure, getExpandedMeasures } from '../measureHelpers';
import type { BaqueCycleTimingResult } from '../baqueBounceTiming';

export const FULL_BOUNCE_TAIL_SEC = 1.8;

export interface FullSongUnrolledTimeline {
  expanded: Array<{ baseMeasure: number; iteration: number }>;
  timing: BaqueCycleTimingResult;
  musicalDurationSec: number;
  totalDurationSec: number;
  totalSamples: number;
  unrolledBpms: number[];
  unrolledTimeSigs: string[];
  unrolledMasterVols: number[];
}

export function formatFullSongBounceFilename(title: string | undefined, bpm: number): string {
  const slug = (title || 'morceau_complet').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'morceau_complet';
  return `${slug}_${Math.max(20, Math.round(Number(bpm) || 88))}bpm_complet.wav`;
}

export function buildFullSongUnrolledTimeline(
  source: Record<string, any>,
  sampleRate = 44100,
  precomputedExpanded?: Array<{ baseMeasure: number; iteration: number }>
): FullSongUnrolledTimeline {
  const sr = Math.max(8000, Math.round(Number(sampleRate) || 44100));
  const totalBase = Math.max(1, Number(source.totalMeasures) || 1);
  const baseBpm = Math.max(20, Number(source.bpm) || 88);
  const rawLoop = source.loopMode;
  const numLoops = typeof rawLoop === 'number' && rawLoop > 0
    ? rawLoop
    : (rawLoop === 'infinite' ? 1 : (parseInt(String(rawLoop), 10) > 0 ? parseInt(String(rawLoop), 10) : 1));

  let expanded = precomputedExpanded && precomputedExpanded.length > 0
    ? precomputedExpanded
    : getExpandedMeasures(totalBase, source.songSections || [], {
        isLoopRegionActive: Boolean(source.isLoopRegionActive),
        loopStartMeasure: source.loopStartMeasure ?? null,
        loopEndMeasure: source.loopEndMeasure ?? null,
        loopMode: numLoops,
      });
  if (!expanded || expanded.length === 0) {
    expanded = Array.from({ length: totalBase }, (_, i) => ({ baseMeasure: i, iteration: 1 }));
  }

  const measureStartsSec: number[] = [], measureDurationsSec: number[] = [], measureTicks: number[] = [];
  const unrolledBpms: number[] = [], unrolledTimeSigs: string[] = [], unrolledMasterVols: number[] = [];
  let accumSec = 0;

  for (let i = 0; i < expanded.length; i++) {
    const m = expanded[i].baseMeasure;
    const rawB = source.measureBpms?.[m];
    const curBpm = typeof rawB === 'number' && Number.isFinite(rawB) && rawB > 20 ? rawB : baseBpm;
    const nextM = i + 1 < expanded.length ? expanded[i + 1].baseMeasure : m;
    const rawNextB = source.measureBpms?.[nextM];
    const nextBpm = typeof rawNextB === 'number' && Number.isFinite(rawNextB) && rawNextB > 20 ? rawNextB : curBpm;
    const tr = source.measureBpmTransitions?.[m] || 'immediate';
    const sig = String(source.measureTimeSigs?.[m] || source.timeSig || '4/4');
    const unit = parseInt(sig.split('/')[1], 10) || 4;
    const beats = getBeatsPerMeasure(sig);
    const durSec = tr !== 'immediate' && curBpm !== nextBpm
      ? (120 * beats) / (curBpm + nextBpm)
      : (beats * (4 / unit)) * (60 / curBpm);

    measureStartsSec.push(accumSec); measureDurationsSec.push(durSec); measureTicks.push(beats * (96 / unit));
    unrolledBpms.push(curBpm); unrolledTimeSigs.push(sig); unrolledMasterVols.push(source.measureVols?.[m] ?? 100);
    accumSec += durSec;
  }

  const musicalDurationSec = accumSec;
  const totalDurationSec = musicalDurationSec + FULL_BOUNCE_TAIL_SEC;
  const totalSamples = Math.max(1, Math.ceil(totalDurationSec * sr));

  return {
    expanded, musicalDurationSec, totalDurationSec, totalSamples, unrolledBpms, unrolledTimeSigs, unrolledMasterVols,
    timing: {
      totalMeasures: expanded.length, bpm: unrolledBpms[0] || baseBpm, sampleRate: sr,
      totalDurationSec, exactTotalSamples: totalSamples, measureStartsSec, measureDurationsSec, measureTicks,
      measureTimeSigs: unrolledTimeSigs, measureBpms: unrolledBpms,
    },
  };
}

export function unrollTracksForFullSong(tracks: any[], expanded: Array<{ baseMeasure: number; iteration: number }>): any[] {
  let syntheticPatId = 900000;
  return tracks.map((t) => {
    const mapArr = <T>(arr: T[] | undefined): T[] | undefined =>
      Array.isArray(arr) && arr.length > 0 ? expanded.map((e) => arr[e.baseMeasure] as T) : arr;
    const nextPatterns: any[] = [];
    for (const p of t.patterns || []) {
      const assignAll = expanded.map((e) => Boolean(p.measureAssignments?.[e.baseMeasure]));
      const firstVar = Array.isArray(p.variations) ? p.variations.find((v: any) => v?.playFirstTimeOnly) : null;
      const hasIter1 = assignAll.some((on, idx) => on && expanded[idx].iteration === 1);
      const hasIterLater = assignAll.some((on, idx) => on && expanded[idx].iteration > 1);
      if (firstVar && hasIter1) {
        const s = getVariationSculptArrays(p, firstVar);
        const varPat = {
          ...p, id: hasIterLater ? ++syntheticPatId : p.id, activeSteps: s.steps, volumes: s.volumes,
          decays: s.decays, microtimings: s.microtimings, beatResolutions: s.beatResolutions,
          notes: firstVar.notes || p.notes, lyrics: firstVar.lyrics || p.lyrics, variations: [],
          measureAssignments: assignAll.map((on, idx) => on && expanded[idx].iteration === 1),
        };
        nextPatterns.push(varPat);
        if (hasIterLater) nextPatterns.push({ ...p, variations: [], measureAssignments: assignAll.map((on, idx) => on && expanded[idx].iteration > 1) });
      } else {
        nextPatterns.push({ ...p, measureAssignments: assignAll });
      }
    }
    return {
      ...t, patternOverrides: undefined, measureVols: mapArr(t.measureVols),
      measurePans: mapArr(t.measurePans), measureReverbSends: mapArr(t.measureReverbSends), patterns: nextPatterns,
    };
  });
}
