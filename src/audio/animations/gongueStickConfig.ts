import {
  clearPersistedAoVivoConfig,
  loadPersistedAoVivoConfig,
  savePersistedAoVivoConfig,
} from './aoVivoConfigStorage';

export type GonguePosePreview = 'auto' | 'grave_impact' | 'grave_windup' | 'aigu_impact' | 'aigu_windup';
export type GongueNextStrokeKind = 'grave_strong' | 'grave_weak' | 'aigu_strong' | 'aigu_weak' | 'idle';

export interface GongueDynamicState {
  handX: number; handY: number; handScale: number;
  tipX: number; tipY: number; tipScale: number; shadowDrop: number;
}

export interface GongueHandConfig {
  baseWidth: number; graveX: number; graveY: number; graveScale: number;
  aiguX: number; aiguY: number; aiguScale: number; windUpLiftY: number; windUpScaleMult: number;
}

export interface GongueTipConfig {
  baseWidth: number; graveX: number; graveY: number; graveWindUpLiftY: number;
  graveWindUpScale: number; graveImpactScale: number; aiguX: number; aiguY: number;
  aiguWindUpLiftY: number; aiguWindUpScale: number; aiguImpactScale: number;
}

export const DEFAULT_GONGUE_STICK_CONFIG = {
  posePreview: 'auto' as GonguePosePreview,
  speedMultiplier: 1 as 1 | 0.5,
  globalOffsetX: 196,
  globalOffsetY: 0,
  hand: {
    baseWidth: 38, graveX: 360, graveY: -18, graveScale: 1.3,
    aiguX: 360, aiguY: 70, aiguScale: 1.48, windUpLiftY: -13, windUpScaleMult: 1.24,
  } as GongueHandConfig,
  tip: {
    baseWidth: 55, graveX: 46, graveY: -186, graveWindUpLiftY: 2,
    graveWindUpScale: 1.02, graveImpactScale: 0.78, aiguX: 48, aiguY: 68,
    aiguWindUpLiftY: 12, aiguWindUpScale: 1.5, aiguImpactScale: 1.08,
  } as GongueTipConfig,
  weakStrokeRatio: 0.42,
  stayLowBeforeWeakRatio: 0.22,
  liftHighBeforeStrongMult: 1.2,
  attackSpeed: 0.25,
  strikeDurationMs: 110,
  returnSpeedMult: 1,
  metalCrushMs: 68,
  reboundRatio: 0.28,
  flatBevelPx: 8,
  flancOffsetX: 114,
  flancOffsetY: 100,
  shadowDepthPx: 90,
  shadowOpacity: 0.6,
};

export const CONFIG_GONGUE_STICK = loadPersistedAoVivoConfig('gongue', DEFAULT_GONGUE_STICK_CONFIG);

type GongueConfigListener = () => void;
const listeners = new Set<GongueConfigListener>();

export function subscribeGongueStickConfig(fn: GongueConfigListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyGongueListeners(): void {
  savePersistedAoVivoConfig('gongue', CONFIG_GONGUE_STICK);
  listeners.forEach((fn) => fn());
}

export function updateGongueStickConfig(patch: Partial<typeof CONFIG_GONGUE_STICK>, autoPreview?: GonguePosePreview): void {
  if (autoPreview) CONFIG_GONGUE_STICK.posePreview = autoPreview;
  Object.assign(CONFIG_GONGUE_STICK, patch);
  notifyGongueListeners();
}

export function updateGongueHandConfig(patch: Partial<GongueHandConfig>, autoPreview?: GonguePosePreview): void {
  if (autoPreview) CONFIG_GONGUE_STICK.posePreview = autoPreview;
  Object.assign(CONFIG_GONGUE_STICK.hand, patch);
  notifyGongueListeners();
}

export function updateGongueTipConfig(patch: Partial<GongueTipConfig>, autoPreview?: GonguePosePreview): void {
  if (autoPreview) CONFIG_GONGUE_STICK.posePreview = autoPreview;
  Object.assign(CONFIG_GONGUE_STICK.tip, patch);
  notifyGongueListeners();
}

export function resetGongueStickConfig(): void {
  clearPersistedAoVivoConfig('gongue');
  Object.assign(CONFIG_GONGUE_STICK, {
    ...DEFAULT_GONGUE_STICK_CONFIG,
    hand: { ...DEFAULT_GONGUE_STICK_CONFIG.hand },
    tip: { ...DEFAULT_GONGUE_STICK_CONFIG.tip },
  });
  listeners.forEach((fn) => fn());
}
