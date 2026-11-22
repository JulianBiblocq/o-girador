/**
 * workletSympathyHelper.ts — Émission SOA encadrée du Snare Buzz sympathique sur coups forts d'Alfaia (< 75 lignes).
 * - Maximum 1 voix sympathique (`e_min`, `-31 dB` modulé par `rodaBreathingAmount / 0.75`, decay `80 ms`, `+3.5..5.5 ms`).
 * - Coupé à `0` si `rodaBreathingAmount <= 0` ou si la Caixa/Tarol est mutée (incluant tout Solo `[S]` Alfaia).
 */

import { BarulhoLookaheadPoint } from '../../barulho/barulhoRampPlanner';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import {
  computeSympathyAirDelaySec,
  computeSympathyStrokeBaseGain,
  hasNearbySnareStrokeInWindow,
  isSympathyTriggeringAlfaiaHit,
  SympathySnareCandidate,
} from '../../groove/snareSympathyPlanner';
import {
  BARULHO_OP_NONE,
  CHOKE_NONE,
  packWorkletEventFlags,
  VOICE_CLASS_GENERIC,
} from '../processor/workletSkinPhysics';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';

export interface StageSympathyBuzzParams {
  seqId: number;
  alfaiaTrackId: number;
  alfaiaInstId: string;
  strokeSymbol: string;
  velocity: number;
  stepSeed: number;
  swungTimeSec: number;
  triggerFrame: number;
  sampleRate: number;
  breathingAmount: number;
  snareCandidate: SympathySnareCandidate | null;
  lastBuzzTimeSecRef: { value: number };
  lookaheadPoints?: readonly BarulhoLookaheadPoint[];
  engineDeps: HorizonPackerEngineDeps;
  stagedEvents: number[];
}

export function stageWorkletSnareSympathyIfEligible(p: StageSympathyBuzzParams): void {
  const {
    seqId, alfaiaTrackId, alfaiaInstId, strokeSymbol, velocity, stepSeed, swungTimeSec,
    triggerFrame, sampleRate, breathingAmount, snareCandidate, lastBuzzTimeSecRef,
    lookaheadPoints, engineDeps, stagedEvents,
  } = p;

  if (!snareCandidate || breathingAmount <= 0) return;
  if (!isSympathyTriggeringAlfaiaHit(alfaiaInstId, strokeSymbol, velocity)) return;
  if (Math.abs(swungTimeSec - lastBuzzTimeSecRef.value) <= 0.020) return;

  const snareTrackId = snareCandidate.track.id;
  if (hasNearbySnareStrokeInWindow(lookaheadPoints, snareTrackId, swungTimeSec, 0.020)) return;

  const snareSlot = engineDeps.getTrackSlot(snareTrackId);
  if (snareSlot <= 0) return;

  const ghostStroke = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, snareCandidate.instId, 'e');
  if (!ghostStroke || ghostStroke.files.length === 0) return;

  const buzzTimeSec = swungTimeSec + computeSympathyAirDelaySec(alfaiaTrackId, stepSeed);
  const filePath = engineDeps.selectRoundRobinFile(snareCandidate.instId, ghostStroke, buzzTimeSec, snareTrackId);
  const sampleId = engineDeps.getSampleId(filePath, false);
  if (sampleId < 0) return;

  const { velocity: symVel, baseGain } = computeSympathyStrokeBaseGain(velocity, breathingAmount);
  if (baseGain <= 0.00001) return;

  const isSnareCalibrated = Boolean(engineDeps.configMap.get(snareCandidate.instId)?.calibratedStudioBank);
  const buzzFrame = Math.max(triggerFrame, Math.round(buzzTimeSec * sampleRate));
  lastBuzzTimeSecRef.value = swungTimeSec;

  stagedEvents.push(
    buzzFrame, snareTrackId, snareSlot, sampleId, symVel,
    baseGain * (ghostStroke.baseGain ?? 1.0), 1.0, 1.0,
    packWorkletEventFlags(seqId, CHOKE_NONE, VOICE_CLASS_GENERIC, isSnareCalibrated, true, BARULHO_OP_NONE, 0)
  );
}
