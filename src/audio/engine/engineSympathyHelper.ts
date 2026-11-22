/**
 * engineSympathyHelper.ts — Déclenchement Web Audio Fallback du Snare Buzz sympathique sur coup fort d'Alfaia (< 65 lignes).
 */

import { instrumentsConfig } from '../../data';
import { getEffectiveRodaBreathingAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import type { TrackGroup } from '../../types';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import {
  computeSympathyAirDelaySec,
  computeSympathyStrokeBaseGain,
  isSympathyTriggeringAlfaiaHit,
  resolveAudibleSympathySnareTrack,
} from '../groove/snareSympathyPlanner';
import type { NotePlayerDeps } from './enginePlayerTypes';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { EngineTuning } from './engineTuning';

let lastFallbackSympathyTimeSec = -10;

export function triggerWebAudioSnareSympathyIfEligible(
  deps: NotePlayerDeps,
  alfaiaTrackId: number | null,
  alfaiaInstId: string,
  effectiveSymbol: string,
  velocity: number,
  time: number,
  stepSeed: number,
  allTracks: TrackGroup[]
): void {
  if (!isSympathyTriggeringAlfaiaHit(alfaiaInstId, effectiveSymbol, velocity)) return;
  if (Math.abs(time - lastFallbackSympathyTimeSec) <= 0.020) return;

  const storeState = useSequencerStore.getState();
  const breathing = getEffectiveRodaBreathingAmount(storeState);
  if (breathing <= 0) return;

  const soloId = useTransportStore.getState().soloPatternPlayId;
  const familyCache = new Set<string>();
  const cand = resolveAudibleSympathySnareTrack(allTracks, breathing, soloId, (tId) =>
    isTrackMutedByPracticeMode(tId, allTracks, storeState, familyCache)
  );
  if (!cand) return;

  const snareVoices = deps.voiceGuard.trackVoices.get(String(cand.track.id));
  if (snareVoices?.some((v) => v && Math.abs(v.time - time) <= 0.020)) return;

  const snareCfg = deps.configMap.get(cand.instId);
  const ghostStroke = snareCfg?.strokes.find((s) => s.symbol === 'e');
  if (!snareCfg || !ghostStroke || ghostStroke.files.length === 0) return;

  const buzzTime = time + computeSympathyAirDelaySec(Number(alfaiaTrackId) || 0, stepSeed);
  const filePath = deps.roundRobin.selectFile(cand.instId, ghostStroke, buzzTime, cand.track.id);
  const entry = deps.sampleLoader.bufferPool.get(filePath);
  if (!entry?.loaded) return;

  const { velocity: symVel, baseGain } = computeSympathyStrokeBaseGain(velocity, breathing);
  if (baseGain <= 0.00001) return;

  lastFallbackSympathyTimeSec = time;
  const pitch = EngineTuning.calculatePitch(cand.instId, snareCfg, cand.track, undefined, allTracks, 0);
  const instLabel = instrumentsConfig[cand.track.instrumentIdx]?.id || cand.instId;
  EngineStrokePlayback.play(
    deps.playbackCtx, cand.track.id, instLabel,
    { ...ghostStroke, baseGain: baseGain * (ghostStroke.baseGain ?? 1.0) },
    entry.get() as AudioBuffer, pitch, buzzTime, symVel, 1.0, false,
    { isStudioCalibrated: Boolean(snareCfg.calibratedStudioBank), forceShort80ms: true, strokeSymbol: 'e', skipVoiceGuard: true }
  );
}
