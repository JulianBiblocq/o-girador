/**
 * workletStrokeEventStager.ts — Résolution de sample, Barulho et empaquetage de tuple SOA pour une frappe (< 115 lignes).
 * - Préserve l'accordage tonal sur les Barulhos d'instruments accordables (`Gonguê B`, fûts) et verrouille `1.0` sur `agbe`/`mineiro`/`apito`.
 */

import {
  BarulhoLookaheadPoint, DEFAULT_BARULHO_DOT_STOP_SEC, findBarulhoLookaheadIndex,
  packBarulhoOriginCoord, resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec,
} from '../../barulho/barulhoRampPlanner';
import { ALFAIA_INSTRUMENTS, TUNEABLE_INSTRUMENTS } from '../../engine/engineTypes';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_NONE, BARULHO_OP_SOFT_B,
  packWorkletEventFlags, resolveBarulhoOpForSymbol, resolveTrackPhysicsSpec,
} from '../processor/workletSkinPhysics';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';
import { stageCompositeRimLayerIfAny } from './workletCompositeStrokeHelper';

export interface StageStrokeEventArgs {
  seqId: number;
  measureIdx: number;
  trackId: number;
  instId: string;
  strokeSymbol: string;
  circleStepIdx: number;
  isSecondStroke: boolean;
  velocity: number;
  decayPct: number;
  triggerFrame: number;
  swungTimeSec: number;
  sampleRate: number;
  engineDeps: HorizonPackerEngineDeps;
  lookaheadPoints?: readonly BarulhoLookaheadPoint[];
  stagedEvents: number[];
}

export function stageMeasureStrokeEvent(a: StageStrokeEventArgs): 'ok' | 'skip' | 'uncovered' {
  const {
    seqId, measureIdx, trackId, instId, strokeSymbol, circleStepIdx, isSecondStroke,
    velocity, decayPct, triggerFrame, swungTimeSec, sampleRate, engineDeps, lookaheadPoints, stagedEvents,
  } = a;

  const isAlfaia = ALFAIA_INSTRUMENTS.has(instId);
  const isCalibrated = Boolean(engineDeps.configMap.get(instId)?.calibratedStudioBank);
  const slot = engineDeps.getTrackSlot(trackId);

  if (strokeSymbol === '/' || strokeSymbol === '.') {
    const barOp = resolveBarulhoOpForSymbol(strokeSymbol, false, instId);
    const ptIdx = strokeSymbol === '/' ? findBarulhoLookaheadIndex(lookaheadPoints, trackId, swungTimeSec, '/') : -1;
    const rampSec = strokeSymbol === '/'
      ? (ptIdx >= 0 && lookaheadPoints ? resolveSlashFadeOutRampSec(lookaheadPoints, ptIdx) : 0.450)
      : DEFAULT_BARULHO_DOT_STOP_SEC;
    const { chokeMode, voiceClass } = resolveTrackPhysicsSpec(instId, strokeSymbol, true);
    stagedEvents.push(triggerFrame, trackId, slot, 0, 0, 1.0, rampSec, 1.0, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, false, barOp));
    return 'ok';
  }

  let stroke = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, instId, strokeSymbol);
  if (!stroke) return 'skip';

  const trigTimeSec = triggerFrame / sampleRate;
  let filePath = engineDeps.selectRoundRobinFile(instId, stroke, trigTimeSec, trackId);
  let sampleId = engineDeps.getSampleId(filePath, Boolean(stroke.isBarulho));
  let isFallback80ms = false;

  if (sampleId < 0 && isAlfaia && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
    const fbE = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, instId, 'e');
    if (fbE) {
      stroke = fbE;
      isFallback80ms = true;
      filePath = engineDeps.selectRoundRobinFile(instId, fbE, trigTimeSec, trackId);
      sampleId = engineDeps.getSampleId(filePath);
    }
  }
  if (sampleId < 0) return 'uncovered';

  const barOp = resolveBarulhoOpForSymbol(strokeSymbol, Boolean(stroke.isBarulho), instId);
  let finalVel = strokeSymbol === 'r' ? velocity * 0.88 : velocity;
  let metaOrDecay = decayPct / 100;
  if (barOp === BARULHO_OP_ATTACK_B) {
    metaOrDecay = packBarulhoOriginCoord(measureIdx, circleStepIdx, isSecondStroke);
  } else if (barOp === BARULHO_OP_SOFT_B) {
    const ptIdx = findBarulhoLookaheadIndex(lookaheadPoints, trackId, swungTimeSec, strokeSymbol);
    const spec = ptIdx >= 0 && lookaheadPoints ? resolveSoftBarulhoRampSpec(lookaheadPoints, ptIdx) : { rampSec: 0.140, targetVelocity: finalVel };
    metaOrDecay = spec.rampSec;
    finalVel = spec.targetVelocity;
  }

  const headNuance = strokeSymbol === 'r' ? 0.985 : (stroke.compositeRimSymbol && strokeSymbol === 'a' ? 0.992 : 1.0);
  const pitchNuance = stroke.isBarulho
    ? (TUNEABLE_INSTRUMENTS.has(instId) ? 1.0 : 1.0 / (engineDeps.getTrackPitchRatio(trackId) || 1.0))
    : headNuance;
  const { chokeMode, voiceClass } = resolveTrackPhysicsSpec(instId, strokeSymbol, barOp !== BARULHO_OP_NONE);

  const prevLen = stagedEvents.length;
  stagedEvents.push(
    triggerFrame, trackId, slot, sampleId, finalVel, stroke.baseGain ?? 1.0,
    metaOrDecay, pitchNuance, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, isFallback80ms, barOp)
  );

  if (stroke.compositeRimSymbol) {
    const rimRes = stageCompositeRimLayerIfAny({
      seqId, trackId, slot, instId, primaryStroke: stroke, triggerFrame, trigTimeSec,
      finalVel, metaOrDecay, isCalibrated, engineDeps, stagedEvents,
    });
    if (rimRes === 'uncovered') {
      stagedEvents.length = prevLen;
      return 'uncovered';
    }
  }
  return 'ok';
}
