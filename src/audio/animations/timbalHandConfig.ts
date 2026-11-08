import {
  clearPersistedAoVivoConfig,
  loadPersistedAoVivoConfig,
  savePersistedAoVivoConfig,
} from './aoVivoConfigStorage';
import { HandTransitionConfig } from './handTransitionEngine';

export type TimbalPosePreview = 'auto' | 'rest' | 'grave' | 'slap' | 'aberto';
export type TimbalNextStrokeKind = 'grave' | 'slap' | 'aberto' | 'ghost' | 'idle';

export interface TimbalAnatomyConfig {
  handScale: number; forearmWidth: number; palmWidth: number; palmLength: number;
  fingerLength: number; fingerWidth: number; thumbSpreadDeg: number;
  vShapeAngleDeg: number; handSpreadPx: number; restOffsetY: number;
}

export interface TimbalStrokesConfig {
  graveImpactY: number; graveConvergeX: number; graveWindUpScaleZ: number; graveImpactScaleZ: number; gravePalmSquash: number;
  slapImpactY: number; slapConvergeX: number; slapWindUpLiftY: number; slapWindUpScaleZ: number; slapImpactScaleZ: number;
  slapFingerSplayDeg: number; slapSnapBackMs: number; slapHandRotateDeg: number; slapThumbLift: number; slapEntryOutsideX: number;
  abertoImpactY: number; abertoConvergeX: number; abertoWindUpScaleZ: number; abertoImpactScaleZ: number; abertoFingerFlex: number;
  presoHoldMs: number; ghostAmplitudePx: number; flaGraceDelayMs: number; weakStrokeRatio: number;
  clapImpactY: number; clapConvergeX: number; clapProfileScaleX: number; clapVerticalTiltDeg: number; clapRecoilPx: number;
  barulhoPhaseOffset: number;
}

export interface TimbalTransitionConfig extends HandTransitionConfig {
  zoneAnticipationRatio: number;
}

export const DEFAULT_TIMBAL_HANDS_CONFIG = {
  posePreview: 'auto' as TimbalPosePreview,
  speedMultiplier: 1 as 1 | 0.5,
  anatomy: {
    handScale: 2.2, forearmWidth: 1.15, palmWidth: 1.15, palmLength: 1.05,
    fingerLength: 1.1, fingerWidth: 1, thumbSpreadDeg: 2,
    vShapeAngleDeg: 33, handSpreadPx: 136, restOffsetY: 208,
  } as TimbalAnatomyConfig,
  strokes: {
    graveImpactY: 144, graveConvergeX: -130, graveWindUpScaleZ: 1.22, graveImpactScaleZ: 1.12, gravePalmSquash: 1.13,
    slapImpactY: 340, slapConvergeX: -34, slapWindUpLiftY: -32, slapWindUpScaleZ: 0.58, slapImpactScaleZ: 1.08,
    slapFingerSplayDeg: 9, slapSnapBackMs: 148, slapHandRotateDeg: -6, slapThumbLift: 0.16, slapEntryOutsideX: -38,
    abertoImpactY: 376, abertoConvergeX: -70, abertoWindUpScaleZ: 0.74, abertoImpactScaleZ: 0.98, abertoFingerFlex: 1.14,
    presoHoldMs: 85, ghostAmplitudePx: 3, flaGraceDelayMs: 32, weakStrokeRatio: 0.4,
    clapImpactY: 142, clapConvergeX: -72, clapProfileScaleX: 0.55, clapVerticalTiltDeg: 42, clapRecoilPx: 22,
    barulhoPhaseOffset: 0.5,
  } as TimbalStrokesConfig,
  transitions: {
    stayLowAfterStrongY: -34,
    stayLowScaleZ: 0.96,
    liftHighAfterWeakY: 55,
    liftHighScaleZ: 1.28,
    liftWhipDeg: 7,
    transitionRiseCurve: 0.45,
    zoneAnticipationRatio: 0.85,
  } as TimbalTransitionConfig,
  attackSpeed: 0.14,
  wristWhipDeg: 9.5,
  shadowDepthPx: 26,
  shadowOpacity: 0.68,
};

export const CONFIG_TIMBAL_HANDS = loadPersistedAoVivoConfig('timbal', DEFAULT_TIMBAL_HANDS_CONFIG);

type TimbalConfigListener = () => void;
const listeners = new Set<TimbalConfigListener>();

export function subscribeTimbalHandsConfig(fn: TimbalConfigListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyTimbalListeners(): void {
  savePersistedAoVivoConfig('timbal', CONFIG_TIMBAL_HANDS);
  listeners.forEach((fn) => fn());
}

export function updateTimbalHandsConfig(patch: Partial<typeof CONFIG_TIMBAL_HANDS>, autoPreview?: TimbalPosePreview): void {
  if (autoPreview) CONFIG_TIMBAL_HANDS.posePreview = autoPreview;
  Object.assign(CONFIG_TIMBAL_HANDS, patch);
  notifyTimbalListeners();
}

export function updateTimbalAnatomyConfig(patch: Partial<TimbalAnatomyConfig>, autoPreview?: TimbalPosePreview): void {
  if (autoPreview) CONFIG_TIMBAL_HANDS.posePreview = autoPreview;
  Object.assign(CONFIG_TIMBAL_HANDS.anatomy, patch);
  notifyTimbalListeners();
}

export function updateTimbalStrokesConfig(patch: Partial<TimbalStrokesConfig>, autoPreview?: TimbalPosePreview): void {
  if (autoPreview) CONFIG_TIMBAL_HANDS.posePreview = autoPreview;
  Object.assign(CONFIG_TIMBAL_HANDS.strokes, patch);
  notifyTimbalListeners();
}

export function updateTimbalTransitions(patch: Partial<TimbalTransitionConfig>): void {
  Object.assign(CONFIG_TIMBAL_HANDS.transitions, patch);
  notifyTimbalListeners();
}

export function resetTimbalHandsConfig(): void {
  clearPersistedAoVivoConfig('timbal');
  Object.assign(CONFIG_TIMBAL_HANDS, {
    ...DEFAULT_TIMBAL_HANDS_CONFIG,
    anatomy: { ...DEFAULT_TIMBAL_HANDS_CONFIG.anatomy },
    strokes: { ...DEFAULT_TIMBAL_HANDS_CONFIG.strokes },
    transitions: { ...DEFAULT_TIMBAL_HANDS_CONFIG.transitions },
  });
  listeners.forEach((fn) => fn());
}
