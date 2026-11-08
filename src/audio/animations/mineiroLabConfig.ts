import {
  clearPersistedAoVivoConfig,
  loadPersistedAoVivoConfig,
  savePersistedAoVivoConfig,
} from './aoVivoConfigStorage';

export interface MineiroLabConfig {
  speedMultiplier: 1 | 0.5;
  pushStrongY: number;
  pushStrongScaleZ: number;
  pushStrongTiltDeg: number;
  pushWeakY: number;
  pushWeakScaleZ: number;
  pullStrongY: number;
  pullStrongScaleZ: number;
  pullStrongTiltDeg: number;
  pullWeakY: number;
  pullWeakScaleZ: number;
  ladoOffsetX: number;
  ladoOffsetY: number;
  ladoAngleDeg: number;
  ladoTwistSkewDeg: number;
  ladoScaleZ: number;
  fluidity: number;
  recoilReturnRatio: number;
  dampingSoftness: number;
  beadImpactOffset: number;
  cycleDurationMs: number;
  barulhoJitterPx: number;
  barulhoFreq: number;
}

export const DEFAULT_MINEIRO_LAB_CONFIG: MineiroLabConfig = {
  speedMultiplier: 1,
  pushStrongY: -26,
  pushStrongScaleZ: 0.9,
  pushStrongTiltDeg: 1.5,
  pushWeakY: -20,
  pushWeakScaleZ: 0.93,
  pullStrongY: 6,
  pullStrongScaleZ: 0.99,
  pullStrongTiltDeg: -2.5,
  pullWeakY: 2,
  pullWeakScaleZ: 0.96,
  ladoOffsetX: -66,
  ladoOffsetY: -6,
  ladoAngleDeg: 4,
  ladoTwistSkewDeg: 3,
  ladoScaleZ: 1.05,
  fluidity: 0.3,
  recoilReturnRatio: 0.18,
  dampingSoftness: 1,
  beadImpactOffset: 0.29,
  cycleDurationMs: 380,
  barulhoJitterPx: 6,
  barulhoFreq: 5,
};

export const CONFIG_MINEIRO_LAB: MineiroLabConfig = loadPersistedAoVivoConfig('mineiro', DEFAULT_MINEIRO_LAB_CONFIG);

type MineiroListener = () => void;
const listeners = new Set<MineiroListener>();

export function subscribeMineiroLabConfig(fn: MineiroListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateMineiroLabConfig(patch: Partial<MineiroLabConfig>): void {
  Object.assign(CONFIG_MINEIRO_LAB, patch);
  savePersistedAoVivoConfig('mineiro', CONFIG_MINEIRO_LAB);
  listeners.forEach((fn) => fn());
}

export function resetMineiroLabConfig(): void {
  clearPersistedAoVivoConfig('mineiro');
  Object.assign(CONFIG_MINEIRO_LAB, DEFAULT_MINEIRO_LAB_CONFIG);
  listeners.forEach((fn) => fn());
}

