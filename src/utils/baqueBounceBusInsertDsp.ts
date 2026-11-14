/**
 * baqueBounceBusInsertDsp.ts — Chaîne d'insert d'un Bus pour le Bounce hors-ligne, en Float32 pur (< 125 lignes).
 * Ordre identique au moteur Live : Polarité Ø -> Coupe-Bas (80 Hz / Subsonic 30 Hz) -> EQ 3 bandes
 * -> BusCompressor (post-EQ, pré-fader) -> Fader & Panoramique stéréo (StereoPannerNode equal-power).
 * Coefficients biquad strictement identiques à la spécification W3C `BiquadFilterNode`.
 */
import { BUTTERWORTH_Q, resolveLowCutTargetHz } from '../audio/effects/lowCutTarget';
import { applyMonoCompatiblePan } from './audio/monoCompatiblePan';
import { processBusCompressorOffline } from '../audio/worklet/bus-compressor/busCompressorDspCore';
import { toBusCompressorDspParams } from '../audio/effects/busCompressorSanitizer';
import type { BusCompressorSettings } from '../audio/effects/busCompressorTypes';

export type BiquadKind = 'highpass' | 'lowshelf' | 'peaking' | 'highshelf';
export interface BiquadCoefs { b0: number; b1: number; b2: number; a1: number; a2: number }

export interface BusInsertTrackLike {
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  lowCut?: boolean;
  phaseInverted?: boolean;
  pan?: number;
  panVal?: number;
  busCompressor?: BusCompressorSettings;
  eqBands?: {
    low?: { f?: number; g?: number };
    mid?: { f?: number; g?: number; q?: 'wide' | 'narrow' };
    high?: { f?: number; g?: number };
  };
}

/** Formules W3C Audio EQ Cookbook (Q en dB pour le passe-haut, comme `BiquadFilterNode`). */
export function computeWebAudioBiquad(kind: BiquadKind, freqHz: number, q: number, gainDb: number, sr: number): BiquadCoefs {
  const f = Math.max(0, Math.min(sr / 2, freqHz));
  const w0 = (2 * Math.PI * f) / sr, cos = Math.cos(w0), sin = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (kind === 'highpass') {
    const alpha = sin / (2 * Math.pow(10, q / 20));
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (kind === 'peaking') {
    const alpha = sin / (2 * q);
    b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
  } else {
    const s = 2 * Math.sqrt(A) * (sin / Math.SQRT2), ap = A + 1, am = A - 1;
    if (kind === 'lowshelf') {
      b0 = A * (ap - am * cos + s); b1 = 2 * A * (am - ap * cos); b2 = A * (ap - am * cos - s);
      a0 = ap + am * cos + s; a1 = -2 * (am + ap * cos); a2 = ap + am * cos - s;
    } else {
      b0 = A * (ap + am * cos + s); b1 = -2 * A * (am + ap * cos); b2 = A * (ap + am * cos - s);
      a0 = ap - am * cos + s; a1 = 2 * (am - ap * cos); a2 = ap - am * cos - s;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Biquad Transposée Directe II en place (état local, aucune allocation par échantillon). */
export function processBiquadInPlace(buf: Float32Array, c: BiquadCoefs): void {
  let z1 = 0, z2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i], y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    buf[i] = y;
  }
}

/** Polarité Ø + Coupe-Bas + EQ 3 bandes du Bus, en place sur la paire stéréo du stem. */
export function applyBusInsertEqInPlace(L: Float32Array, R: Float32Array, sr: number, bus: BusInsertTrackLike, disableEq: boolean): void {
  if (bus.phaseInverted) for (let i = 0; i < L.length; i++) { L[i] = -L[i]; R[i] = -R[i]; }
  const eq = bus.eqBands;
  const stages: BiquadCoefs[] = [
    computeWebAudioBiquad('highpass', resolveLowCutTargetHz(bus, disableEq), BUTTERWORTH_Q, 0, sr),
    computeWebAudioBiquad('lowshelf', eq?.low?.f ?? 100, 1, disableEq ? 0 : (eq?.low?.g ?? 0), sr),
    computeWebAudioBiquad('peaking', eq?.mid?.f ?? 1000, eq?.mid?.q === 'narrow' ? 2.5 : BUTTERWORTH_Q, disableEq ? 0 : (eq?.mid?.g ?? 0), sr),
    computeWebAudioBiquad('highshelf', eq?.high?.f ?? 8000, 1, disableEq ? 0 : (eq?.high?.g ?? 0), sr),
  ];
  for (const c of stages) { processBiquadInPlace(L, c); processBiquadInPlace(R, c); }
}

/** BusCompressor post-EQ / pré-fader (noyau partagé avec le Worklet Live). Retourne le pic de réduction (dB). */
export function applyBusCompressorInPlace(L: Float32Array, R: Float32Array, sr: number, bus: BusInsertTrackLike, disableFx: boolean): number {
  if (!bus.busCompressor?.enabled || disableFx) return 0;
  return processBusCompressorOffline(L, R, sr, toBusCompressorDspParams(bus.busCompressor, disableFx), true).maxGrDb;
}

/**
 * Fader x Panoramique `StereoPannerNode` (entrée stéréo, loi equal-power W3C) puis sommation dans la cible.
 * Pan 0 = identité stricte (gainL = 0 sur le repli, gainR = 1).
 */
export function sumBusStemWithPanInto(
  L: Float32Array, R: Float32Array, tL: Float32Array, tR: Float32Array, gain: number, rawPan: number | undefined
): void {
  if (gain === 0) return;
  const p = Math.max(-1, Math.min(1, applyMonoCompatiblePan(rawPan).acousticPan));
  const x = p <= 0 ? p + 1 : p;
  const gL = Math.cos((x * Math.PI) / 2), gR = Math.sin((x * Math.PI) / 2);
  if (p <= 0) {
    for (let i = 0; i < L.length; i++) { tL[i] += (L[i] + R[i] * gL) * gain; tR[i] += R[i] * gR * gain; }
  } else {
    for (let i = 0; i < L.length; i++) { tL[i] += L[i] * gL * gain; tR[i] += (R[i] + L[i] * gR) * gain; }
  }
}

