/**
 * O Girador - Contrats IPC, Paramètres & État Pré-Alloué Zéro-GC du MasterBusWorkletProcessor (< 120 lignes)
 */

export const MASTER_LOOKAHEAD_SAMPLES = 64;
export const MASTER_TELEMETRY_INTERVAL_FRAMES = 1536;

export interface MasterBusDspParams {
  bassMonoEnabled: boolean; bassMonoCrossoverHz: number;
  transientAttackDb: number; transientSustainDb: number;
  duckingDb: number;
  compressorEnabled: boolean; scHpfHz: number; thresholdDb: number; ratio: number;
  attackMs: number; releaseMs: number; kneeDb: number; makeupDb: number; compMixPct: number;
  softClipEnabled: boolean; softClipDriveDb: number; ceilingDb: number;
  ecoBypassAesthetic: boolean;
  sumSidechainToMix?: boolean;
  masterGainLin?: number;
}

export const DEFAULT_MASTER_BUS_DSP_PARAMS: MasterBusDspParams = {
  bassMonoEnabled: true, bassMonoCrossoverHz: 110,
  transientAttackDb: 0, transientSustainDb: 0,
  duckingDb: 0,
  compressorEnabled: true, scHpfHz: 95, thresholdDb: -6, ratio: 2,
  attackMs: 15, releaseMs: 150, kneeDb: 6, makeupDb: 0, compMixPct: 100,
  softClipEnabled: true, softClipDriveDb: 1.2, ceilingDb: -0.3,
  ecoBypassAesthetic: false,
  sumSidechainToMix: true,
  masterGainLin: 1,
};

export interface MasterBusTelemetrySnapshot {
  peakL: number; peakR: number; rmsL: number; rmsR: number; grDb: number; duckDb: number;
}

export interface MasterBusTelemetryMessage extends MasterBusTelemetrySnapshot {
  type: 'TELEMETRY';
}

export interface UpdateMasterBusParamsMessage {
  type: 'UPDATE_PARAMS';
  params: Partial<MasterBusDspParams>;
}

export interface ResetMasterBusStateMessage {
  type: 'RESET_STATE';
}

export type MasterBusInboundMessage = UpdateMasterBusParamsMessage | ResetMasterBusStateMessage;

export interface MasterBusDspState {
  sampleRate: number;
  params: MasterBusDspParams;
  smoothCoeff: number;
  bmLp1L: number; bmLp2L: number; bmLp1R: number; bmLp2R: number;
  tsFastEnv: number; tsSlowEnv: number; tsTailEnv: number; tsSmoothGain: number;
  duckLp1L: number; duckLp2L: number; duckLp1R: number; duckLp2R: number;
  duckScEnv: number; currentDuckDb: number;
  scHpfX1: number; scHpfX2: number; scHpfY1: number; scHpfY2: number;
  compEnvDb: number; currentGrDb: number;
  adaaPrevL: number; adaaPrevR: number;
  lookaheadBufL: Float32Array;
  lookaheadBufR: Float32Array;
  lookaheadPeakBuf: Float32Array;
  lookaheadWriteIdx: number;
  limiterEnvGain: number;
  smoothCeilingLin: number;
  telemetryFrames: number;
  accumPeakL: number; accumPeakR: number; accumSumSqL: number; accumSumSqR: number;
  accumMaxGrDb: number; accumMaxDuckDb: number;
}

export function createMasterBusDspState(sr = 48000): MasterBusDspState {
  const safeSr = sr > 8000 ? sr : 48000;
  const params: MasterBusDspParams = { ...DEFAULT_MASTER_BUS_DSP_PARAMS };
  return {
    sampleRate: safeSr, params, smoothCoeff: 1 - Math.exp(-1 / (0.012 * safeSr)),
    bmLp1L: 0, bmLp2L: 0, bmLp1R: 0, bmLp2R: 0,
    tsFastEnv: 0, tsSlowEnv: 0, tsTailEnv: 0, tsSmoothGain: 1,
    duckLp1L: 0, duckLp2L: 0, duckLp1R: 0, duckLp2R: 0, duckScEnv: 0, currentDuckDb: 0,
    scHpfX1: 0, scHpfX2: 0, scHpfY1: 0, scHpfY2: 0, compEnvDb: 0, currentGrDb: 0,
    adaaPrevL: 0, adaaPrevR: 0,
    lookaheadBufL: new Float32Array(MASTER_LOOKAHEAD_SAMPLES),
    lookaheadBufR: new Float32Array(MASTER_LOOKAHEAD_SAMPLES),
    lookaheadPeakBuf: new Float32Array(MASTER_LOOKAHEAD_SAMPLES),
    lookaheadWriteIdx: 0, limiterEnvGain: 1,
    smoothCeilingLin: Math.pow(10, params.ceilingDb / 20),
    telemetryFrames: 0, accumPeakL: 0, accumPeakR: 0, accumSumSqL: 0, accumSumSqR: 0,
    accumMaxGrDb: 0, accumMaxDuckDb: 0,
  };
}

export function resetMasterBusDspState(s: MasterBusDspState): void {
  s.bmLp1L = 0; s.bmLp2L = 0; s.bmLp1R = 0; s.bmLp2R = 0;
  s.tsFastEnv = 0; s.tsSlowEnv = 0; s.tsTailEnv = 0; s.tsSmoothGain = 1;
  s.duckLp1L = 0; s.duckLp2L = 0; s.duckLp1R = 0; s.duckLp2R = 0; s.duckScEnv = 0; s.currentDuckDb = 0;
  s.scHpfX1 = 0; s.scHpfX2 = 0; s.scHpfY1 = 0; s.scHpfY2 = 0; s.compEnvDb = 0; s.currentGrDb = 0;
  s.adaaPrevL = 0; s.adaaPrevR = 0;
  s.lookaheadBufL.fill(0); s.lookaheadBufR.fill(0); s.lookaheadPeakBuf.fill(0);
  s.lookaheadWriteIdx = 0; s.limiterEnvGain = 1;
}

export function updateMasterBusDspParams(s: MasterBusDspState, patch: Partial<MasterBusDspParams>): void {
  Object.assign(s.params, patch);
  s.params.bassMonoCrossoverHz = Math.max(60, Math.min(160, s.params.bassMonoCrossoverHz));
  s.params.transientAttackDb = Math.max(-6, Math.min(6, s.params.transientAttackDb));
  s.params.transientSustainDb = Math.max(-6, Math.min(6, s.params.transientSustainDb));
  s.params.duckingDb = Math.max(0, Math.min(4, s.params.duckingDb));
  s.params.scHpfHz = s.params.scHpfHz <= 0 ? 0 : Math.max(60, Math.min(150, s.params.scHpfHz));
  s.params.thresholdDb = Math.max(-40, Math.min(0, s.params.thresholdDb));
  s.params.ratio = Math.max(1, Math.min(10, s.params.ratio));
  s.params.attackMs = Math.max(1, Math.min(50, s.params.attackMs));
  s.params.releaseMs = Math.max(40, Math.min(500, s.params.releaseMs));
  s.params.kneeDb = Math.max(0, Math.min(12, s.params.kneeDb));
  s.params.compMixPct = Math.max(0, Math.min(100, s.params.compMixPct));
  s.params.ceilingDb = Math.max(-3.0, Math.min(-0.1, s.params.ceilingDb));
}
