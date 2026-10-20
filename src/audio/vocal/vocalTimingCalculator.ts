/**
 * O Girador - Vocal Timing & Nudge Calculation Helpers
 */

import { getBalancoOffsetSec } from '../../utils/balancoUtils';

export interface VocalTimingParams {
  clip: any;
  ptnRef: any;
  voiceTrack: any;
  effectiveBpm: number;
  measureStartTime: number;
  sequencerStore: any;
}

export interface VocalTimingResult {
  triggerOffsetSec: number;
  nudgeMs: number;
  balancoOffset: number;
  triggerTime: number;
  actualStartTime: number;
}

export class VocalTimingCalculator {
  public static calculateAnchorBpm(ptnRef: any, sequencerStore: any): number {
    let initialMeasureIdx = 0;
    if (Array.isArray(ptnRef.measureAssignments)) {
      const foundIdx = ptnRef.measureAssignments.indexOf(true);
      if (foundIdx !== -1) initialMeasureIdx = foundIdx;
    } else if (ptnRef.measureAssignments && typeof ptnRef.measureAssignments === 'object') {
      const keys = Object.keys(ptnRef.measureAssignments).map(k => parseInt(k, 10)).filter(k => !isNaN(k)).sort((a, b) => a - b);
      if (keys.length > 0) initialMeasureIdx = keys[0];
    }
    return sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;
  }

  public static calculateTiming(p: VocalTimingParams): VocalTimingResult {
    const beatDurationSec = 60 / p.effectiveBpm;
    let triggerOffsetSec = 0;
    if (p.clip?.startOffsetSec !== undefined) {
      triggerOffsetSec = p.clip.startOffsetSec;
    } else if (p.clip?.anacrusisSec !== undefined) {
      triggerOffsetSec = -p.clip.anacrusisSec;
    } else if (p.clip?.anacrusisBeats !== undefined) {
      triggerOffsetSec = -(p.clip.anacrusisBeats * beatDurationSec);
    }

    const nudgeMs = p.clip?.nudgeMs ?? (p.ptnRef.vocalNudge ?? 0);

    let balancoOffset = 0;
    if (Math.abs(triggerOffsetSec) <= 0.02) {
      const activeSteps = p.ptnRef.activeSteps || [];
      const firstStepIdx = activeSteps.findIndex((s: any) => s !== undefined && s !== null && s !== 0 && s !== '0');
      if (firstStepIdx > 0) {
        balancoOffset = getBalancoOffsetSec({
          stepIdx: firstStepIdx,
          steps: p.ptnRef.steps || 16,
          beatResolutions: p.ptnRef.beatResolutions,
          track: p.voiceTrack,
          pattern: p.ptnRef,
          globalSwing: p.sequencerStore.globalSwing,
          bpm: p.effectiveBpm,
          isPreRoll: false,
        });
      }
    }

    const triggerTime = p.measureStartTime + triggerOffsetSec + (nudgeMs / 1000) + balancoOffset;
    const actualStartTime = triggerTime >= 0 ? triggerTime : 0;

    return { triggerOffsetSec, nudgeMs, balancoOffset, triggerTime, actualStartTime };
  }
}
