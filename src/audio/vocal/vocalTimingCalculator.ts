/**
 * vocalTimingCalculator.ts
 * Calcul canonique de l'alignement temporel vocal (Anacrouse M-1 et Temps 1) :
 * `when = slotMeasureT1Time + (trimStartSec - t1OffsetSec) * (recordedBpm / currentBpm)` (< 90 lignes).
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

export function computeCanonicalVocalTriggerTime(
  slotMeasureT1Time: number,
  trimStartSec: number,
  t1OffsetSec: number,
  recordedBpm: number,
  currentBpm: number,
  nudgeMs: number = 0,
  balancoOffsetSec: number = 0
): { triggerOffsetSec: number; when: number } {
  const safeRecordedBpm = recordedBpm > 0 ? recordedBpm : 88;
  const safeCurrentBpm = currentBpm > 0 ? currentBpm : safeRecordedBpm;
  const triggerOffsetSec = (trimStartSec - t1OffsetSec) * (safeRecordedBpm / safeCurrentBpm);
  const when = slotMeasureT1Time + triggerOffsetSec + (nudgeMs / 1000) + balancoOffsetSec;
  return { triggerOffsetSec, when };
}

export class VocalTimingCalculator {
  public static calculateAnchorBpm(ptnRef: any, sequencerStore: any): number {
    let initialMeasureIdx = 0;
    if (Array.isArray(ptnRef?.measureAssignments)) {
      const foundIdx = ptnRef.measureAssignments.indexOf(true);
      if (foundIdx !== -1) initialMeasureIdx = foundIdx;
    } else if (ptnRef?.measureAssignments && typeof ptnRef.measureAssignments === 'object') {
      const keys = Object.keys(ptnRef.measureAssignments).map((k) => parseInt(k, 10)).filter((k) => !isNaN(k)).sort((a, b) => a - b);
      if (keys.length > 0) initialMeasureIdx = keys[0];
    }
    return sequencerStore.measureBpms?.[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;
  }

  public static calculateTiming(p: VocalTimingParams): VocalTimingResult {
    const currentBpm = Number(p.effectiveBpm || p.sequencerStore?.bpm || 88);
    const beatDurationSec = 60 / currentBpm;
    const recordedBpm = Number(p.clip?.recordedBpm || p.clip?.sampleBpm || p.clip?.baseBpm || p.ptnRef?.vocalBaseBpm || currentBpm);
    const tempoRatio = currentBpm > 0 ? (recordedBpm / currentBpm) : 1;

    let triggerOffsetSec = 0;
    const rawT1 = p.clip?.t1OffsetSec !== undefined ? Number(p.clip.t1OffsetSec) : undefined;
    const rawStartOffset = p.clip?.startOffsetSec !== undefined ? Number(p.clip.startOffsetSec) : undefined;
    const trimStartSec = Number(p.clip?.trimStartSec ?? 0);

    if (rawT1 !== undefined && (Math.abs(trimStartSec - rawT1) > 1e-4 || !rawStartOffset)) {
      triggerOffsetSec = (trimStartSec - rawT1) * tempoRatio;
    } else if (rawStartOffset !== undefined) {
      triggerOffsetSec = rawStartOffset * tempoRatio;
    } else if (p.clip?.anacrusisSec !== undefined) {
      triggerOffsetSec = -Number(p.clip.anacrusisSec) * tempoRatio;
    } else if (p.clip?.anacrusisBeats !== undefined) {
      triggerOffsetSec = -(Number(p.clip.anacrusisBeats) * beatDurationSec);
    }

    const nudgeMs = p.clip?.nudgeMs ?? (p.ptnRef?.vocalNudge ?? 0);

    let balancoOffset = 0;
    if (Math.abs(triggerOffsetSec) <= 0.02 && p.ptnRef) {
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
          bpm: currentBpm,
          isPreRoll: false,
        });
      }
    }

    const triggerTime = p.measureStartTime + triggerOffsetSec + (nudgeMs / 1000) + balancoOffset;
    const actualStartTime = triggerTime >= 0 ? triggerTime : 0;

    return { triggerOffsetSec, nudgeMs, balancoOffset, triggerTime, actualStartTime };
  }
}
