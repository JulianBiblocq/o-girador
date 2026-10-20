import { Track } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { isPhraseBlockStart } from '../../utils/vocalPhraseBlock';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './vocalSampleHelpers';
import { useAudioStore } from '../../stores/useAudioStore';

export function checkStartingVocalAnacrusis(
  startTracks: Track[],
  targetM: number,
  measureTimeSigs: Record<number, string>,
  soloPatternPlayId: number | null
): boolean {
  for (let tIdx = 0; tIdx < startTracks.length; tIdx++) {
    const trk = startTracks[tIdx];
    const inst = instrumentsConfig[trk.instrumentIdx];
    if (!inst || inst.type !== 'voice') continue;
    const ptn = trk.patterns.find(p => p.measureAssignments[targetM]);
    if (!ptn) continue;
    if (!isPhraseBlockStart(ptn, targetM, getBeatsPerMeasure(measureTimeSigs[targetM] || '4/4'), soloPatternPlayId !== null)) continue;
    const vocalBuf = getVocalBufferForPattern(trk.id, ptn);
    const hasVocalSample = Boolean(vocalBuf && isVocalSamplePattern(ptn) && isSamplePlaybackAllowed(useAudioStore.getState().vocalMode));
    const clip = ptn.vocalClip;
    const isClipAnacrusis = clip?.startOffsetSec !== undefined
      ? (clip.startOffsetSec < -0.02)
      : Boolean(((clip?.anacrusisSec ?? 0) > 0.02) || ((clip?.anacrusisBeats ?? 0) > 0.02));
    if ((hasVocalSample && isClipAnacrusis) || (ptn.preRollActiveSteps && ptn.preRollActiveSteps.some(Boolean))) {
      return true;
    }
  }
  return false;
}
