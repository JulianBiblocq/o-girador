/**
 * O Girador - Percussion AudioWorklet IPC Contracts & Constants (< 100 lignes)
 * Zéro allocation d'objets JS sur le chemin critique (`PUSH_EVENTS` par `Float64Array` plat).
 */

export const MAX_WORKLET_OUTPUTS = 24;
export const MAX_WORKLET_VOICES = 128;
export const MAX_WORKLET_EVENTS = 4096;
export const MAX_WORKLET_SAMPLES = 2048;

/**
 * Stride fixe de 9 nombres (`Float64Array`) par événement dans `PUSH_EVENTS` :
 * [0] triggerFrame      : Indice d'échantillon absolu (`Math.round(triggerTimeSec * sampleRate)`)
 * [1] trackId           : Identifiant numérique de la piste (`-1` pour preview sans piste)
 * [2] slot              : Index de sortie stéréo du Worklet (`0..23`)
 * [3] sampleId          : Identifiant du sample dans la banque PCM (`0..2047`)
 * [4] velocity          : Vélocité brute (`0..2.0` ou `0..200`)
 * [5] strokeBaseGain    : Gain de base du coup issu d'`audioConfig` (défaut `1.0`)
 * [6] stepDecayNorm     : Multiplicateur de decay du pas normalisé (`0.15..1.0`)
 * [7] eventPitchNuance  : Nuance de pitch de l'événement (ex: `0.985` sur `'r'`, `1.0` sinon)
 * [8] flags             : Bit 0 = `isChoke` (`1` si `'p'`/`'P'`), `(flags >>> 1)` = `measureSeqId`
 */
export const WORKLET_EVENT_STRIDE = 9;

export const VOICE_STATE_FREE = 0;
export const VOICE_STATE_ACTIVE = 1;
export const VOICE_STATE_CHOKING = 2;

export interface WorkletSampleEntry {
  ch0: Float32Array;
  ch1: Float32Array | null;
  sampleRate: number;
  length: number;
}

export interface LoadSampleMessage {
  type: 'LOAD_SAMPLE';
  sampleId: number;
  ch0: Float32Array;
  ch1: Float32Array | null;
  sampleRate: number;
}

export interface PushEventsMessage {
  type: 'PUSH_EVENTS';
  eventsData: Float64Array;
  eventCount: number;
}

export interface UpdateTrackSlotMessage {
  type: 'UPDATE_TRACK_SLOT';
  slot: number;
  trackId: number;
  isMuted: boolean;
  pitchRatio: number;
  decayNorm: number;
}

export interface PurgeAllMessage {
  type: 'PURGE_ALL';
}

export interface PurgeFromFrameMessage {
  type: 'PURGE_FROM_FRAME';
  fromFrame: number;
  measureSeqId?: number;
}

export interface PurgeTrackMessage {
  type: 'PURGE_TRACK';
  trackId: number;
}

export type PercussionWorkletInboundMessage =
  | LoadSampleMessage
  | PushEventsMessage
  | UpdateTrackSlotMessage
  | PurgeAllMessage
  | PurgeFromFrameMessage
  | PurgeTrackMessage;

