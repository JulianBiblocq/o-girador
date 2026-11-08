import {
  clearPersistedAoVivoConfig,
  loadPersistedAoVivoConfig,
  savePersistedAoVivoConfig,
} from './aoVivoConfigStorage';

export interface AgbeLabConfig {
  speedMultiplier: 1 | 0.5;
  pivotYPercent: number;
  strongTranslateX: number;
  strongRotateZ: number;
  weakTranslateX: number;
  weakRotateZ: number;
  beadInertiaPx: number;
  saltoJumpY: number;
  saltoSquash: number;
  voltaDropY: number;
  voltaSquash: number;
  voltaRotationDeg: number;
  voltaScaleZ: number;
  attackOffset: number;
  pendulumDurationMs: number;
  nextAnticipationRatio: number;
  barulhoJitterPx: number;
  barulhoFreq: number;
}

export const DEFAULT_AGBE_LAB_CONFIG: AgbeLabConfig = {
  speedMultiplier: 1,
  pivotYPercent: 27,
  strongTranslateX: 66,
  strongRotateZ: 29,
  weakTranslateX: 24,
  weakRotateZ: 7,
  beadInertiaPx: 14,
  saltoJumpY: -54,
  saltoSquash: 1.11,
  voltaDropY: 38,
  voltaSquash: 1.12,
  voltaRotationDeg: 0,
  voltaScaleZ: 1.1,
  attackOffset: 0.19,
  pendulumDurationMs: 260,
  nextAnticipationRatio: 0.7,
  barulhoJitterPx: 10,
  barulhoFreq: 10,
};

export const CONFIG_AGBE_LAB: AgbeLabConfig = loadPersistedAoVivoConfig('agbe', DEFAULT_AGBE_LAB_CONFIG);

type AgbeListener = () => void;
const listeners = new Set<AgbeListener>();

export function subscribeAgbeLabConfig(fn: AgbeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateAgbeLabConfig(patch: Partial<AgbeLabConfig>): void {
  Object.assign(CONFIG_AGBE_LAB, patch);
  savePersistedAoVivoConfig('agbe', CONFIG_AGBE_LAB);
  listeners.forEach((fn) => fn());
}

export function resetAgbeLabConfig(): void {
  clearPersistedAoVivoConfig('agbe');
  Object.assign(CONFIG_AGBE_LAB, DEFAULT_AGBE_LAB_CONFIG);
  listeners.forEach((fn) => fn());
}

