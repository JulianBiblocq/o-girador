import * as Tone from 'tone';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { normalizeAudioBuffer, audioBufferToWav } from '../../utils/audioBufferUtils';

export function calculateBounceDuration(state: any): { dureeTotaleSec: number; isFiniteLoop: boolean } {
  const {
    totalMeasures, measureBpms, measureTimeSigs, bpm, timeSig,
    songSections, measureBpmTransitions, isLoopRegionActive,
    loopStartMeasure, loopEndMeasure, loopMode
  } = state;

  const isFiniteLoop = Boolean(
    isLoopRegionActive && typeof loopMode === 'number' && loopMode > 0 &&
    loopStartMeasure !== null && loopEndMeasure !== null
  );

  const expandedMeasures = getExpandedMeasures(totalMeasures, songSections, {
    isLoopRegionActive, loopStartMeasure, loopEndMeasure, loopMode
  });

  let dureeTotaleSec = 0;
  for (let i = 0; i < expandedMeasures.length; i++) {
    const m = expandedMeasures[i].baseMeasure;
    const currentMeasureBpm = measureBpms[m] || bpm || 120;
    const nextM = (i + 1 < expandedMeasures.length) ? expandedMeasures[i + 1].baseMeasure : m;
    const nextMeasureBpm = measureBpms[nextM] || currentMeasureBpm;
    const transition = measureBpmTransitions[m] || 'immediate';
    const timeSigStr = measureTimeSigs[m] || timeSig || '4/4';
    const beatsPerMeasure = parseInt(timeSigStr.split('/')[0], 10) || 4;

    if (transition === 'immediate' || currentMeasureBpm === nextMeasureBpm) {
      dureeTotaleSec += (60 / currentMeasureBpm) * beatsPerMeasure;
    } else {
      dureeTotaleSec += (120 * beatsPerMeasure) / (currentMeasureBpm + nextMeasureBpm);
    }
  }

  if (isNaN(dureeTotaleSec) || !isFinite(dureeTotaleSec) || dureeTotaleSec <= 0) {
    throw new Error(`Erreur Audio Render: Durée invalide (${dureeTotaleSec}s)`);
  }

  return { dureeTotaleSec, isFiniteLoop };
}

export async function normalizeAudioBlob(rawBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await rawBlob.arrayBuffer();
    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    if (rawCtx && typeof rawCtx.decodeAudioData === 'function') {
      const decoded = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
      normalizeAudioBuffer(decoded, -0.5);
      return audioBufferToWav(decoded);
    }
  } catch (normErr) {
    console.warn("[Audio Bounce] Normalisation non bloquante ignorée sur erreur :", normErr);
  }
  return rawBlob;
}
