import * as Tone from 'tone';
import { Track } from '../../types';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { getMaxTicks } from '../../data';
import { scheduleCountInBeepsAndTicks } from './audioSyncCountInBeeps';
import { schedulePreRollVocals } from './audioSyncPreRollVocals';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { tickSubscribers } from './audioSyncTypes';

export interface PreRollPlannerParams {
  targetM: number;
  measuresCount: number;
  targetSig: string;
  targetBpm: number;
  startTracks: Track[];
  soloPatternPlayId: number | null;
  measureTimeSigs: Record<number, string>;
  isPreRollActiveRef: { current: boolean };
  engineTimeoutsRef: { current: Set<number> };
  tickEventDetailRef: { current: any };
  anticipatedMeasures: Set<string>;
  activeSequencerVocals: Map<string, any>;
  trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
}

export function executePreRollCountdown(p: PreRollPlannerParams): number {
  const {
    targetM, measuresCount, targetSig, targetBpm, startTracks,
    soloPatternPlayId, measureTimeSigs, isPreRollActiveRef,
    engineTimeoutsRef, tickEventDetailRef, anticipatedMeasures,
    activeSequencerVocals, trackInputs, channels, busChannels
  } = p;

  const beatsCount = getBeatsPerMeasure(targetSig);
  const isCompound = targetSig === '6/8' || targetSig === '9/8' || targetSig === '12/8';
  const beatDurationSec = isCompound ? (90 / targetBpm) : (60 / targetBpm);
  const measureCycleDurationSec = beatsCount * beatDurationSec;
  const totalBeats = measuresCount * beatsCount;

  isPreRollActiveRef.current = true;
  useSequencerStore.getState().setIsPreRolling(true);

  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  const t0 = (rawCtx ? rawCtx.currentTime : Tone.context.currentTime) + 0.06;
  const scheduledMusicStartTime = t0 + (totalBeats * beatDurationSec);

  Tone.Draw.schedule(() => {
    useSequencerStore.getState().setIsPreRolling(false);
    isPreRollActiveRef.current = false;
  }, scheduledMusicStartTime);

  const nowSec = rawCtx ? rawCtx.currentTime : Tone.context.currentTime;
  const delayToMusicStartMs = Math.max(0, (scheduledMusicStartTime - nowSec) * 1000);
  const preRollTimer = window.setTimeout(() => {
    useSequencerStore.getState().setIsPreRolling(false);
    isPreRollActiveRef.current = false;
  }, delayToMusicStartMs);
  engineTimeoutsRef.current.add(preRollTimer);

  scheduleCountInBeepsAndTicks({
    t0, measuresCount, beatsCount, beatDurationSec,
    measureCycleDurationSec, targetM, targetSig
  });

  schedulePreRollVocals({
    startTracks, targetM, scheduledMusicStartTime,
    measureCycleDurationSec, targetBpm, soloPatternPlayId,
    measureTimeSigs, anticipatedMeasures, activeSequencerVocals,
    trackInputs, channels, busChannels
  });

  const detail = tickEventDetailRef.current;
  detail.step = 0;
  detail.measure = targetM;
  detail.maxTicks = getMaxTicks(targetSig as any);
  detail.ratio = 0;
  detail.visualStep16 = 0;
  detail.visualStep12 = 0;
  detail.time = t0;
  detail.iteration = 1;
  detail.isPreRoll = true;
  detail.preRollBeat = 0;
  detail.preRollMeasureIndex = 0;
  detail.preRollTotalMeasures = measuresCount;
  detail.isPaused = false;
  detail.isNavigation = false;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });

  return scheduledMusicStartTime;
}
