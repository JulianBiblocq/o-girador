/**
 * workletStrokeEventStager.ts — Résolution de sample anti-collision d'escouade, Barulho décorrélé et tuple SOA (< 138 lignes).
 */
import {
  BarulhoLookaheadPoint, DEFAULT_BARULHO_DOT_STOP_SEC, findBarulhoLookaheadIndex,
  packBarulhoOriginCoord, resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec,
} from '../../barulho/barulhoRampPlanner';
import { ALFAIA_INSTRUMENTS, TUNEABLE_INSTRUMENTS } from '../../engine/engineTypes';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { computeLivePlayerVelocityBreathing } from '../../groove/strokeHumanizationDsp';
import { computeBarulhoPartnerEntrySpreadSec, selectSquadPlayerFile } from '../../spatial/sectionBarulhoPhaseHelper';
import { computeDeterministicStrokeJitterSec } from '../../spatial/sectionSpatialAcoustics';
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../../../universes/maracatu/instruments/studioBankRegistry';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_NONE, BARULHO_OP_PARTNER_B, BARULHO_OP_SOFT_B,
  packWorkletEventFlags, resolveBarulhoOpForSymbol, resolveTrackPhysicsSpec,
} from '../processor/workletSkinPhysics';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';
import { stageCompositeRimLayerIfAny } from './workletCompositeStrokeHelper';

export interface StageStrokeEventArgs {
  seqId: number; measureIdx: number; trackId: number; instId: string; strokeSymbol: string;
  circleStepIdx: number; isSecondStroke: boolean; isBeatHead?: boolean; velocity: number; decayPct: number;
  triggerFrame: number; swungTimeSec: number; sampleRate: number;
  engineDeps: HorizonPackerEngineDeps; lookaheadPoints?: readonly BarulhoLookaheadPoint[];
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
    stagedEvents.push(triggerFrame, trackId, slot, 0, 0, 1.0, rampSec, 1.0, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, false, barOp, 0));
    return 'ok';
  }

  let stroke = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, instId, strokeSymbol);
  if (!stroke) return 'skip';

  const trigTimeSec = triggerFrame / sampleRate;
  const spatial = engineDeps.getTrackSpatialProfile?.(trackId);
  const rawSynthCount = spatial && !spatial.isNeutralSolo ? spatial.synthesizedCount : 1;
  const synthCount = stroke.isBarulho ? rawSynthCount : Math.min(rawSynthCount, Math.max(1, stroke.files.length));
  const hasSquadRR = typeof engineDeps.selectRoundRobinSquadIndices === 'function';
  const useIndexedRR = !hasSquadRR && synthCount > 1 && typeof engineDeps.selectRoundRobinFileIndex === 'function';

  let squadIndices = hasSquadRR ? engineDeps.selectRoundRobinSquadIndices!(instId, stroke, trigTimeSec, synthCount, trackId) : undefined;
  let baseIdx = useIndexedRR ? engineDeps.selectRoundRobinFileIndex!(instId, stroke, trigTimeSec, trackId) : -1;
  let firstPath = squadIndices
    ? (stroke.files[squadIndices[0]] || stroke.files[0] || '')
    : baseIdx >= 0 ? selectSquadPlayerFile(stroke.files, baseIdx, 0) : engineDeps.selectRoundRobinFile(instId, stroke, trigTimeSec, trackId);
  let firstSampleId = engineDeps.getSampleId(firstPath, Boolean(stroke.isBarulho));
  let isFallback80ms = false;

  if (firstSampleId < 0 && isAlfaia && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
    const fbE = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, instId, 'e');
    if (fbE) {
      stroke = fbE; isFallback80ms = true;
      squadIndices = hasSquadRR ? engineDeps.selectRoundRobinSquadIndices!(instId, fbE, trigTimeSec, synthCount, trackId) : undefined;
      baseIdx = useIndexedRR ? engineDeps.selectRoundRobinFileIndex!(instId, fbE, trigTimeSec, trackId) : -1;
      firstPath = squadIndices
        ? (fbE.files[squadIndices[0]] || fbE.files[0] || '')
        : baseIdx >= 0 ? selectSquadPlayerFile(fbE.files, baseIdx, 0) : engineDeps.selectRoundRobinFile(instId, fbE, trigTimeSec, trackId);
      firstSampleId = engineDeps.getSampleId(firstPath);
    }
  }
  if (firstSampleId < 0) return 'uncovered';

  const barOp = resolveBarulhoOpForSymbol(strokeSymbol, Boolean(stroke.isBarulho), instId);
  const isLegacyRufada = strokeSymbol === 'r' && !STUDIO_BANK_ENABLED[instId as PendingStudioInstrumentId];
  let finalVel = isLegacyRufada ? velocity * 0.88 : velocity;
  let metaOrDecay = decayPct / 100;
  if (barOp === BARULHO_OP_ATTACK_B) {
    metaOrDecay = packBarulhoOriginCoord(measureIdx, circleStepIdx, isSecondStroke);
  } else if (barOp === BARULHO_OP_SOFT_B) {
    const ptIdx = findBarulhoLookaheadIndex(lookaheadPoints, trackId, swungTimeSec, strokeSymbol);
    const spec = ptIdx >= 0 && lookaheadPoints ? resolveSoftBarulhoRampSpec(lookaheadPoints, ptIdx) : { rampSec: 0.140, targetVelocity: finalVel };
    metaOrDecay = spec.rampSec; finalVel = spec.targetVelocity;
  }

  const headNuance = isLegacyRufada ? 0.985 : (stroke.compositeRimSymbol && strokeSymbol === 'a' ? 0.992 : 1.0);
  const pitchNuance = stroke.isBarulho
    ? (TUNEABLE_INSTRUMENTS.has(instId) ? 1.0 : 1.0 / (engineDeps.getTrackPitchRatio(trackId) || 1.0))
    : headNuance;
  const { chokeMode, voiceClass } = resolveTrackPhysicsSpec(instId, strokeSymbol, barOp !== BARULHO_OP_NONE);

  const rimStroke = stroke.compositeRimSymbol ? EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, instId, stroke.compositeRimSymbol) : undefined;
  const rimIndices = rimStroke && hasSquadRR ? engineDeps.selectRoundRobinSquadIndices!(instId, rimStroke, trigTimeSec, synthCount, trackId) : undefined;
  const rimBaseIdx = rimStroke && useIndexedRR ? engineDeps.selectRoundRobinFileIndex!(instId, rimStroke, trigTimeSec, trackId) : undefined;
  const prevLen = stagedEvents.length;
  const stepSeed = measureIdx * 64 + circleStepIdx * 2 + (isSecondStroke ? 1 : 0);

  const partnerRank = engineDeps.getTrackPartnerRank?.(trackId) ?? 0;
  for (let k = 0; k < synthCount; k++) {
    const pathK = squadIndices ? (stroke.files[squadIndices[k] ?? squadIndices[0]] || firstPath) : (baseIdx >= 0 ? selectSquadPlayerFile(stroke.files, baseIdx, k) : firstPath);
    const sampleId = k === 0 ? firstSampleId : engineDeps.getSampleId(pathK, Boolean(stroke.isBarulho));
    if (sampleId < 0) { stagedEvents.length = prevLen; return 'uncovered'; }

    const isSoloPartnerB = barOp === BARULHO_OP_ATTACK_B && k === 0 && synthCount === 1 && partnerRank > 0;
    const effBarOp = isSoloPartnerB ? BARULHO_OP_PARTNER_B : barOp;
    let trigFrameK = triggerFrame;
    if (spatial && !spatial.isNeutralSolo) {
      const pSpec = spatial.players[k] || spatial.players[0];
      const jitter = barOp !== BARULHO_OP_NONE ? 0 : computeDeterministicStrokeJitterSec(trackId, k, stepSeed, synthCount, instId);
      const barSpread = barOp !== BARULHO_OP_NONE ? computeBarulhoPartnerEntrySpreadSec(k, synthCount) : 0;
      trigFrameK = Math.max(triggerFrame, Math.round((swungTimeSec + pSpec.baseDelaySec + jitter + barSpread) * sampleRate));
    } else if (isSoloPartnerB) {
      trigFrameK = Math.max(triggerFrame, Math.round((swungTimeSec + computeBarulhoPartnerEntrySpreadSec(partnerRank, partnerRank + 1)) * sampleRate));
    }

    const velK = barOp !== BARULHO_OP_NONE ? finalVel : computeLivePlayerVelocityBreathing(finalVel, seqId, trackId, k, stepSeed, Boolean(a.isBeatHead));
    stagedEvents.push(
      trigFrameK, trackId, slot, sampleId, velK, stroke.baseGain ?? 1.0,
      metaOrDecay, pitchNuance, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, isFallback80ms, effBarOp, k)
    );

    if (stroke.compositeRimSymbol) {
      const rimRes = stageCompositeRimLayerIfAny({
        seqId, trackId, slot, instId, primaryStroke: stroke, triggerFrame: trigFrameK, trigTimeSec,
        finalVel: velK, metaOrDecay, isCalibrated, engineDeps, stagedEvents, playerIdx: k, rimBaseIdx, rimIndices,
      });
      if (rimRes === 'uncovered') { stagedEvents.length = prevLen; return 'uncovered'; }
    }
  }
  return 'ok';
}
