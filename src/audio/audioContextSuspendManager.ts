/**
 * Gestionnaire d'auto-suspension et de réveil synchrone universel du contexte audio (< 128 lignes).
 * - Réveille simultanément le wrapper Tone (`standardized-audio-context`) ET le `window.AudioContext` natif
 *   sous-jacent (y compris l'état WebKit `'interrupted'` sur iPhone/iPad).
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useTransportStore } from '../stores/useTransportStore';
import {
  activateMultimediaAudioSession,
  deactivateMultimediaAudioSession,
  primeNativeAudioContextHardwareSync,
} from './iosAudioSessionUnlock';
import { unwrapNativeAudioContext } from './worklet/percussionWorkletSlotRouter';

const PREVIEW_IDLE_SUSPEND_MS = 15000;
let autoSuspendTimer: ReturnType<typeof setTimeout> | null = null;

function isTransportOrRecordingActive(): boolean {
  return Boolean(
    useSequencerStore.getState().isPlaying ||
    useAudioStore.getState().recordingStatus === 'recording' ||
    useTransportStore.getState().soloPatternPlayId !== null
  );
}

export function getRawAudioContext(): AudioContext | null {
  try { return (Tone.getContext().rawContext || Tone.context) as AudioContext; } catch { return null; }
}

export function cancelAudioContextAutoSuspend(): void {
  if (autoSuspendTimer !== null) { clearTimeout(autoSuspendTimer); autoSuspendTimer = null; }
}

export function scheduleAudioContextAutoSuspend(delayMs = 500): void {
  cancelAudioContextAutoSuspend();
  autoSuspendTimer = setTimeout(() => {
    autoSuspendTimer = null;
    if (isTransportOrRecordingActive()) return;
    deactivateMultimediaAudioSession();
    const rawCtx = getRawAudioContext();
    if (rawCtx && rawCtx.state === 'running') rawCtx.suspend().catch(() => {});
  }, delayMs);
}

export function unlockAudioOnUserGestureSync(explicitCtx?: AudioContext | null): boolean {
  activateMultimediaAudioSession();
  cancelAudioContextAutoSuspend();
  const rawCtx = explicitCtx || getRawAudioContext();
  const nativeCtx = unwrapNativeAudioContext(rawCtx) || rawCtx;
  const wasNativeWoken = primeNativeAudioContextHardwareSync(nativeCtx);
  const wasRawNotRunning = Boolean(rawCtx && String((rawCtx as any).state) !== 'running');

  if (wasRawNotRunning && rawCtx !== nativeCtx) {
    try { rawCtx!.resume?.()?.catch?.(() => {}); } catch {}
  }
  if (Tone.context && String((Tone.context as any).state) !== 'running') {
    try {
      if (typeof (Tone.context as any).resume === 'function') (Tone.context as any).resume().catch(() => {});
      (Tone as any).start?.()?.catch?.(() => {});
    } catch {}
  }
  if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();
  return wasNativeWoken || wasRawNotRunning;
}

export function wakeAudioContextForNotePreview(
  ctx?: AudioContext | null,
  idleSuspendDelayMs = PREVIEW_IDLE_SUSPEND_MS
): boolean {
  const wasNotRunning = unlockAudioOnUserGestureSync(ctx);
  if (!isTransportOrRecordingActive()) scheduleAudioContextAutoSuspend(idleSuspendDelayMs);
  return wasNotRunning;
}

export async function safeResumeAudioContext(): Promise<void> {
  activateMultimediaAudioSession();
  cancelAudioContextAutoSuspend();
  const pending: Promise<unknown>[] = [];
  const track = (p: unknown) => {
    if (p && typeof (p as Promise<unknown>).catch === 'function') pending.push((p as Promise<unknown>).catch(() => {}));
  };
  const rawCtx = getRawAudioContext();
  const nativeCtx = unwrapNativeAudioContext(rawCtx);
  if (nativeCtx && String((nativeCtx as any).state) !== 'running') {
    try { track(nativeCtx.resume?.()); } catch (_) {}
  }
  if (rawCtx && rawCtx !== nativeCtx && String((rawCtx as any).state) !== 'running') {
    try { track(rawCtx.resume?.()); } catch (_) {}
  }
  if (Tone.context && String((Tone.context as any).state) !== 'running') {
    try { track((Tone.context as any).resume?.()); } catch (_) {}
    try { track((Tone as any).start?.()); } catch (_) {}
  }
  if (pending.length > 0) await Promise.allSettled(pending);
}

export async function safeSuspendAudioContext(): Promise<void> {
  cancelAudioContextAutoSuspend();
  if (isTransportOrRecordingActive()) return;
  deactivateMultimediaAudioSession();
  const rawCtx = getRawAudioContext();
  if (rawCtx && rawCtx.state === 'running') {
    try { await rawCtx.suspend(); } catch (_) {}
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAudioContextAutoSuspend();
    const rawCtx = getRawAudioContext();
    if (rawCtx && rawCtx.state === 'running') rawCtx.suspend().catch(() => {});
  });
}
