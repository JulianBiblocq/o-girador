/**
 * workletCompositeStrokeHelper.ts — Émission SOA simultanée Peau + Cerclage pour Rimshot `A`/`a` (< 65 lignes).
 * - Utilisé tant que `STUDIO_BANK_ENABLED` vaut `false` sur Caixa/Tarol (`compositeRimSymbol: 'X'`).
 * - Émet la couche cerclage à la même `triggerFrame` exacte avec `CHOKE_NONE` (zéro auto-choke, zéro 404).
 */

import { StrokeMapping } from '../../../data/audioConfig';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
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
}

export function stageCompositeRimLayerIfAny(a: StageCompositeRimLayerArgs): 'ok' | 'uncovered' {
  const rimSymbol = a.primaryStroke.compositeRimSymbol;
  if (!rimSymbol) return 'ok';

  const rimStroke = EngineVirtualStrokes.resolveStroke(a.engineDeps.strokesMaps, a.instId, rimSymbol);
  if (!rimStroke) return 'ok';

  const rimFilePath = a.engineDeps.selectRoundRobinFile(a.instId, rimStroke, a.trigTimeSec, a.trackId);
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
    packWorkletEventFlags(a.seqId, CHOKE_NONE, VOICE_CLASS_GENERIC, a.isCalibrated, false, BARULHO_OP_NONE)
  );
  return 'ok';
}
