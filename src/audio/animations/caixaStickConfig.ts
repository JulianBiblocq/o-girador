import {
  clearPersistedAoVivoConfig,
  loadPersistedAoVivoConfig,
  savePersistedAoVivoConfig,
} from './aoVivoConfigStorage';
import { HandTransitionConfig } from './handTransitionEngine';

export type CaixaStickFamily = 'caixa' | 'tarol';
export type CaixaPreviewMode = 'auto' | CaixaStickFamily;
export type CaixaNextStrokeKind = 'strong' | 'weak' | 'rufada' | 'idle';

export interface CaixaStickProfile {
  scale: number;
  shaftWidth: number;
  neckTaper: number;
  oliveWidth: number;
  oliveLength: number;
  flexibility: number;
}

const UNIFIED_STICK: CaixaStickProfile = {
  scale: 1.7,
  shaftWidth: 1.05,
  neckTaper: 0.58,
  oliveWidth: 0.8,
  oliveLength: 0.7,
  flexibility: 0.3,
};

export const DEFAULT_CAIXA_STICKS_CONFIG = {
  previewMode: 'auto' as CaixaPreviewMode,
  speedMultiplier: 1 as 1 | 0.5,
  stick: { ...UNIFIED_STICK } as CaixaStickProfile,
  caixa: { ...UNIFIED_STICK } as CaixaStickProfile,
  tarol: { ...UNIFIED_STICK } as CaixaStickProfile,
  transitions: {
    stayLowAfterStrongY: -114,
    stayLowScaleZ: 0.78,
    liftHighAfterWeakY: 56,
    liftHighScaleZ: 1.44,
    liftWhipDeg: 10.5,
    transitionRiseCurve: 0.45,
  } as HandTransitionConfig,
  rufadaBounces: 4,
  rufadaBouncePx: 9,
  rufadaPressScaleZ: 0.72,
  flaGraceDelayMs: 16,
  flaGraceScaleZ: 0.88,
  ghostLiftScaleZ: 0.92,
  ghostReachRatio: 0.96,
  stickAngleDeg: 31,
  stickSpreadPx: 166,
  restOffsetY: 24,
  impactReachY: -112,
  impactConvergeX: 8,
  windUpScaleZ: 1.36,
  impactScaleZ: 0.76,
  attackSpeed: 0.1,
  wristWhipDeg: 5.5,
  shadowDepthPx: 20,
  shadowOpacity: 0.68,
  crossClickY: 58,
  crossClickCenterX: 0,
  crossClickConvergeX: 52,
  crossClickAngleDeg: 9,
  crossClickScaleZ: 1.28,
  rimshotImpactY: 134,
  rimshotOffsetX: -35,
  rimshotAngleDeg: 2,
  rimshotScaleZ: 0.82,
  barulhoImpactY: -44,
  barulhoJitterPx: 2,
  barulhoBounces: 8,
  barulhoPhaseOffset: 0.5,
};

export const CONFIG_CAIXA_STICKS = loadPersistedAoVivoConfig('caixa', DEFAULT_CAIXA_STICKS_CONFIG);

type CaixaConfigListener = () => void;
const listeners = new Set<CaixaConfigListener>();

export function subscribeCaixaSticksConfig(fn: CaixaConfigListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(): void {
  savePersistedAoVivoConfig('caixa', CONFIG_CAIXA_STICKS);
  listeners.forEach((fn) => fn());
}

export function updateCaixaSticksConfig(patch: Partial<typeof CONFIG_CAIXA_STICKS>): void {
  Object.assign(CONFIG_CAIXA_STICKS, patch);
  notifyListeners();
}

export function updateCaixaProfile(patch: Partial<CaixaStickProfile>): void {
  Object.assign(CONFIG_CAIXA_STICKS.stick, patch);
  Object.assign(CONFIG_CAIXA_STICKS.caixa, patch);
  Object.assign(CONFIG_CAIXA_STICKS.tarol, patch);
  notifyListeners();
}

export const updateTarolProfile = updateCaixaProfile;

export function updateCaixaTransitions(patch: Partial<HandTransitionConfig>): void {
  Object.assign(CONFIG_CAIXA_STICKS.transitions, patch);
  notifyListeners();
}

export function resetCaixaSticksConfig(): void {
  clearPersistedAoVivoConfig('caixa');
  Object.assign(CONFIG_CAIXA_STICKS, {
    ...DEFAULT_CAIXA_STICKS_CONFIG,
    stick: { ...UNIFIED_STICK },
    caixa: { ...UNIFIED_STICK },
    tarol: { ...UNIFIED_STICK },
    transitions: { ...DEFAULT_CAIXA_STICKS_CONFIG.transitions },
  });
  listeners.forEach((fn) => fn());
}

export function resolveCaixaActiveFamily(instId: string): CaixaStickFamily {
  if (CONFIG_CAIXA_STICKS.previewMode !== 'auto') return CONFIG_CAIXA_STICKS.previewMode;
  return instId === 'tarol' ? 'tarol' : 'caixa';
}
