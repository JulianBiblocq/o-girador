/**
 * busCompressorWorkletTypes.ts — Protocole de messages Main Thread <-> BusCompressorWorkletProcessor (< 40 lignes).
 */
import type { BusCompressorDspParams } from './busCompressorDspState';

export const BUS_COMP_PROCESSOR_NAME = 'bus-compressor-processor';
/** ~30 Hz de télémétrie à 48 kHz (zéro re-render React : lecture par polling RAF côté UI). */
export const BUS_COMP_TELEMETRY_INTERVAL_FRAMES = 1600;

export interface UpdateBusCompParamsMessage {
  type: 'UPDATE_PARAMS';
  params: Partial<BusCompressorDspParams>;
}

export interface ResetBusCompStateMessage {
  type: 'RESET_STATE';
}

export type BusCompInboundMessage = UpdateBusCompParamsMessage | ResetBusCompStateMessage;

export interface BusCompTelemetryMessage {
  type: 'GR';
  grDb: number;
}

export interface BusCompProcessorOptions {
  params?: Partial<BusCompressorDspParams>;
}

