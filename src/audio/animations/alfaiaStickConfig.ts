import { bindAoVivoDualProfile } from './aoVivoMobileStrokeConfigs';
import { HandTransitionConfig } from './handTransitionEngine';

export type AlfaiaSecondaryStickFamily = 'macaneta' | 'fina' | 'bacalhau';
export type AlfaiaLeftStickMode = 'auto' | AlfaiaSecondaryStickFamily;
export type AlfaiaNextStrokeKind = 'strong' | 'weak' | 'idle';

export interface AlfaiaMacanetaProfile {
  scale: number; shaftWidth: number; oliveWidth: number; oliveLength: number; flexibility: number;
}

export interface AlfaiaBacalhauProfile {
  scale: number; shaftWidth: number; tipTaper: number; impactBendDeg: number; impactSquashX: number; bendSnapMs: number;
}

export const DEFAULT_ALFAIA_STICKS_CONFIG = {
  leftStickMode: 'auto' as AlfaiaLeftStickMode,
  speedMultiplier: 1 as 1 | 0.5,
  macaneta: { scale: 1.65, shaftWidth: 1.2, oliveWidth: 1.25, oliveLength: 1.05, flexibility: 0.1 } as AlfaiaMacanetaProfile,
  fina: { scale: 1.65, shaftWidth: 0.85, oliveWidth: 0.4, oliveLength: 1.4, flexibility: 0.15 } as AlfaiaMacanetaProfile,
  bacalhau: { scale: 1.7, shaftWidth: 0.35, tipTaper: 1.1, impactBendDeg: 26, impactSquashX: 1.52, bendSnapMs: 35 } as AlfaiaBacalhauProfile,
  transitions: {
    stayLowAfterStrongY: -96,
    stayLowScaleZ: 0.82,
    liftHighAfterWeakY: 36,
    liftHighScaleZ: 1.42,
    liftWhipDeg: 11,
    transitionRiseCurve: 0.5,
  } as HandTransitionConfig,
  stickAngleDeg: 33,
  stickSpreadPx: 168,
  restOffsetY: 28,
  impactReachY: -110,
  impactConvergeX: 2,
  windUpScaleZ: 1.42,
  impactScaleZ: 0.74,
  attackSpeed: 0.1,
  wristWhipDeg: 6.5,
  shadowDepthPx: 29,
  shadowOpacity: 0.7,
  crossClickY: -30,
  crossClickCenterX: 2,
  crossClickConvergeX: 58,
  crossClickAngleDeg: 2,
  crossClickScaleZ: 1.28,
  rimshotImpactY: 158,
  rimshotOffsetX: -48,
  rimshotAngleDeg: -9,
  rimshotScaleZ: 0.92,
  barulhoImpactY: -16,
  barulhoJitterPx: 4,
  barulhoBounces: 8,
  barulhoPhaseOffset: 0.5,
  stickScale: 1.65,
  shaftWidth: 1.2,
  oliveWidth: 1.25,
  oliveLength: 1.05,
  flexibility: 0.1,
};

type ConfigListener = () => void;
const listeners = new Set<ConfigListener>();
const alfaiaChannel = bindAoVivoDualProfile('alfaia', DEFAULT_ALFAIA_STICKS_CONFIG, () => listeners.forEach((fn) => fn()));

export const CONFIG_ALFAIA_STICKS = alfaiaChannel.live;

export function subscribeAlfaiaSticksConfig(fn: ConfigListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateAlfaiaSticksConfig(patch: Partial<typeof CONFIG_ALFAIA_STICKS>): void {
  Object.assign(CONFIG_ALFAIA_STICKS, patch);
  alfaiaChannel.commitSave();
}

export function updateMacanetaProfile(patch: Partial<AlfaiaMacanetaProfile>): void {
  Object.assign(CONFIG_ALFAIA_STICKS.macaneta, patch);
  alfaiaChannel.commitSave();
}

export function updateFinaProfile(patch: Partial<AlfaiaMacanetaProfile>): void {
  Object.assign(CONFIG_ALFAIA_STICKS.fina, patch);
  alfaiaChannel.commitSave();
}

export function updateBacalhauProfile(patch: Partial<AlfaiaBacalhauProfile>): void {
  Object.assign(CONFIG_ALFAIA_STICKS.bacalhau, patch);
  alfaiaChannel.commitSave();
}

export function updateAlfaiaTransitions(patch: Partial<HandTransitionConfig>): void {
  Object.assign(CONFIG_ALFAIA_STICKS.transitions, patch);
  alfaiaChannel.commitSave();
}

export function resetAlfaiaSticksConfig(): void {
  alfaiaChannel.resetActive();
}

export function getProfileScale(family: AlfaiaSecondaryStickFamily): number {
  return CONFIG_ALFAIA_STICKS[family].scale;
}

export function getProfileFlexibility(family: AlfaiaSecondaryStickFamily): number {
  return family === 'bacalhau' ? 0.95 : CONFIG_ALFAIA_STICKS[family].flexibility;
}
