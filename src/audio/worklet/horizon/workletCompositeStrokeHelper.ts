/**
 * workletCompositeStrokeHelper.ts — Émission SOA simultanée Peau + Cerclage pour Rimshot `A`/`a` (< 70 lignes).
 */

import { StrokeMapping } from '../../../data/audioConfig';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { selectSquadPlayerFile } from '../../spatial/sectionBarulhoPhaseHelper';
import {
  BARULHO_OP_NONE,
  CHOKE_NONE,
  packWorkletEventFlags,
  VOICE_CLASS_GENERIC,
} from '../processor/workletSkinPhysics';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';

export const COMPOSITE_RIM_LAYER_VELOCITY_SCALE = 0.85;

export interface StageCompositeRimLayerArgs {
  seqId: number;
  trackId: number;
  slot: number;
  instId: string;
  primaryStroke: StrokeMapping;
  triggerFrame: number;
  trigTimeSec: number;
  finalVel: number;
  metaOrDecay: number;
  isCalibrated: boolean;
  engineDeps: HorizonPackerEngineDeps;
  stagedEvents: number[];
  playerIdx?: number;
  rimBaseIdx?: number;
}

export function stageCompositeRimLayerIfAny(a: StageCompositeRimLayerArgs): 'ok' | 'uncovered' {
  const rimSymbol = a.primaryStroke.compositeRimSymbol;
  if (!rimSymbol) return 'ok';

  const rimStroke = EngineVirtualStrokes.resolveStroke(a.engineDeps.strokesMaps, a.instId, rimSymbol);
  if (!rimStroke) return 'ok';

  const pIdx = a.playerIdx ?? 0;
  const rimFilePath = a.rimBaseIdx !== undefined && a.rimBaseIdx >= 0
    ? selectSquadPlayerFile(rimStroke.files, a.rimBaseIdx, pIdx)
    : a.engineDeps.selectRoundRobinFile(a.instId, rimStroke, a.trigTimeSec, a.trackId);
  const rimSampleId = a.engineDeps.getSampleId(rimFilePath);
  if (rimSampleId < 0) return 'uncovered';

  a.stagedEvents.push(
    a.triggerFrame,
    a.trackId,
    a.slot,
    rimSampleId,
    a.finalVel * COMPOSITE_RIM_LAYER_VELOCITY_SCALE,
    rimStroke.baseGain ?? 1.0,
    a.metaOrDecay,
    1.0,
    packWorkletEventFlags(a.seqId, CHOKE_NONE, VOICE_CLASS_GENERIC, a.isCalibrated, false, BARULHO_OP_NONE, pIdx)
  );
  return 'ok';
}
