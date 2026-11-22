/**
 * baqueBounceSympathyHelper.ts — Émission Offline Bounce du Snare Buzz sympathique sur coup fort d'Alfaia (< 70 lignes).
 * - Verrouillé par `effectiveBreathingAmount > 0` et `!getEffectiveMuteState` (zéro buzz en Solo `[S]` Alfaia).
 */

import { EngineRoundRobin } from '../audio/engine/engineRoundRobin';
import { EngineTuning } from '../audio/engine/engineTuning';
import { EngineVirtualStrokes } from '../audio/engine/engineVirtualStrokes';
import {
  computeSympathyAirDelaySec,
  computeSympathyStrokeBaseGain,
  hasNearbySnareStrokeInWindow,
  isSympathyTriggeringAlfaiaHit,
  SympathySnareCandidate,
} from '../audio/groove/snareSympathyPlanner';
import { InstrumentAudioConfig, StrokeMapping } from '../data/audioConfig';
import type { BarulhoLookaheadPoint } from '../audio/barulho/barulhoRampPlanner';
import type { Track } from '../types';
import { OfflineTrackGraph, scheduleOfflineStrokeHit } from './baqueBounceTrackGraph';
import { decodeSampleForOffline } from './baqueBounceStrokeScheduler';

export interface ScheduleOfflineSympathyArgs {
  offlineCtx: OfflineAudioContext;
  graph: OfflineTrackGraph;
  alfaiaTrackId: number;
  alfaiaInstId: string;
  strokeSymbol: string;
  stepVol: number;
  stepSeed: number;
  triggerSec: number;
  totalDurationSec: number;
  breathingAmount: number;
  snareCandidate: SympathySnareCandidate | null;
  lastBuzzTimeSecRef: { value: number };
  lookaheadPoints: readonly BarulhoLookaheadPoint[];
  allTracks?: readonly Track[];
  configMap: Map<string, InstrumentAudioConfig>;
  strokesMaps: Map<string, Map<string, StrokeMapping>>;
  sampleCache: Map<string, AudioBuffer>;
  offlineRR: EngineRoundRobin;
}

export async function scheduleOfflineSnareSympathyIfEligible(a: ScheduleOfflineSympathyArgs): Promise<void> {
  if (!a.snareCandidate || a.breathingAmount <= 0) return;
  if (!isSympathyTriggeringAlfaiaHit(a.alfaiaInstId, a.strokeSymbol, a.stepVol)) return;
  if (Math.abs(a.triggerSec - a.lastBuzzTimeSecRef.value) <= 0.020) return;

  const snareTrack = a.snareCandidate.track;
  if (!a.graph.trackInputs.has(snareTrack.id)) return;
  if (hasNearbySnareStrokeInWindow(a.lookaheadPoints, snareTrack.id, a.triggerSec, 0.020)) return;

  const ghostStroke = EngineVirtualStrokes.resolveStroke(a.strokesMaps, a.snareCandidate.instId, 'e');
  const snareCfg = a.configMap.get(a.snareCandidate.instId);
  if (!ghostStroke || !ghostStroke.files.length || !snareCfg) return;

  const buzzSec = Math.max(0, a.triggerSec + computeSympathyAirDelaySec(a.alfaiaTrackId, a.stepSeed));
  const filePath = a.offlineRR.selectFile(a.snareCandidate.instId, ghostStroke, buzzSec, snareTrack.id);
  const buf = await decodeSampleForOffline(a.offlineCtx, filePath, a.sampleCache);
  if (!buf) return;

  const { velocity: symVel, baseGain } = computeSympathyStrokeBaseGain(a.stepVol, a.breathingAmount);
  if (baseGain <= 0.00001) return;

  a.lastBuzzTimeSecRef.value = a.triggerSec;
  const pitch = EngineTuning.calculatePitch(a.snareCandidate.instId, snareCfg, snareTrack as any, undefined, a.allTracks as any, 0);
  scheduleOfflineStrokeHit(
    a.offlineCtx, a.graph, snareTrack, a.snareCandidate.instId, 'e', buf, pitch,
    buzzSec, symVel, 1.0, a.totalDurationSec,
    {
      isStudioCalibrated: Boolean(snareCfg.calibratedStudioBank),
      forceShort80ms: true,
      strokeBaseGain: baseGain * (ghostStroke.baseGain ?? 1.0),
      skipVoiceGuard: true,
    }
  );
}
