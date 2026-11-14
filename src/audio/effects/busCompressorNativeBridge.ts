/**
 * busCompressorNativeBridge.ts — Ponts natifs SAC <-> AudioWorklet du Compresseur de Bus (< 60 lignes).
 * - `sacKeepAlive` partagé (ConstantSource offset 0) : aucun nœud SAC aval ne tombe en Passive Mode.
 * - Fondu croisé repli -> Worklet à gain constant (signaux cohérents, 0 latence => 0 clic).
 */
import * as Tone from 'tone';
import { unwrapNativeAudioNode } from '../worklet/percussionWorkletSlotRouter';

export const BUS_COMP_CROSSFADE_SEC = 0.02;

const hmrStore: Record<string, any> = ((globalThis as any).__OGIRADOR_AUDIO_NODES__ ||= {});

export function ensureBusCompSacKeepAlive(rawCtx: any, target: unknown): void {
  try {
    if (!hmrStore.busCompKeepAlive || hmrStore.busCompKeepAliveCtx !== rawCtx) {
      if (typeof rawCtx?.createConstantSource !== 'function') return;
      const ks = rawCtx.createConstantSource();
      ks.offset.value = 0; ks.start(0);
      hmrStore.busCompKeepAlive = ks; hmrStore.busCompKeepAliveCtx = rawCtx;
    }
    Tone.connect(hmrStore.busCompKeepAlive, target as any);
  } catch (_) {}
}

/** Relie la sortie native du Worklet à l'entrée du Fader du Bus (déballage SAC identique au Master). */
export function connectBridgeToBusChannel(outBridge: GainNode, channel: unknown): boolean {
  const nativeTarget = unwrapNativeAudioNode(channel);
  if (!nativeTarget) return false;
  ensureBusCompSacKeepAlive(Tone.getContext().rawContext, channel);
  try { outBridge.disconnect(); } catch (_) {}
  outBridge.connect(nativeTarget);
  return true;
}

/** outBridge 0 -> 1 et pont de repli 1 -> 0 sur la même horloge : somme constante = signal d'entrée. */
export function crossfadeToWorklet(nativeCtx: AudioContext, outBridge: GainNode, fallback: Tone.Gain): void {
  const t = nativeCtx.currentTime;
  outBridge.gain.setValueAtTime(0, t);
  outBridge.gain.linearRampToValueAtTime(1, t + BUS_COMP_CROSSFADE_SEC);
  try {
    fallback.gain.cancelScheduledValues(t);
    fallback.gain.setValueAtTime(1, t);
    fallback.gain.linearRampToValueAtTime(0, t + BUS_COMP_CROSSFADE_SEC);
  } catch (err) { outBridge.gain.cancelScheduledValues(t); outBridge.gain.value = 0; throw err; }
}

