/**
 * Gestionnaire d'auto-suspension et de réveil interactif du contexte audio (< 115 lignes).
 */

import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useTransportStore } from '../stores/useTransportStore';

const PREVIEW_IDLE_SUSPEND_MS = 15000;
let autoSuspendTimer: ReturnType<typeof setTimeout> | null = null;

function isTransportOrRecordingActive(): boolean {
  const isPlaying = useSequencerStore.getState().isPlaying;
  const isRecording = useAudioStore.getState().recordingStatus === 'recording';
  const isSolo = useTransportStore.getState().soloPatternPlayId !== null;
  return Boolean(isPlaying || isRecording || isSolo);
}

export function getRawAudioContext(): AudioContext | null {
  try {
    return (Tone.getContext().rawContext || Tone.context) as AudioContext;
  } catch {
    return null;
  }
}

export function cancelAudioContextAutoSuspend(): void {
  if (autoSuspendTimer !== null) {
    clearTimeout(autoSuspendTimer);
    autoSuspendTimer = null;
  }
}

export function scheduleAudioContextAutoSuspend(delayMs = 500): void {
  cancelAudioContextAutoSuspend();
  autoSuspendTimer = setTimeout(() => {
    autoSuspendTimer = null;
    if (isTransportOrRecordingActive()) return;
    const rawCtx = getRawAudioContext();
    if (rawCtx && rawCtx.state === 'running') {
      rawCtx.suspend().catch(() => {});
    }
  }, delayMs);
}

/**
 * Réveil non-bloquant lors d'un clic de pas / Dock (Écran 1 ou Écran 2) à l'arrêt,
 * avec maintien ouvert pendant 15 s d'inactivité avant relâchement doux du pilote audio.
 */
export function wakeAudioContextForNotePreview(
  ctx?: AudioContext | null,
  idleSuspendDelayMs = PREVIEW_IDLE_SUSPEND_MS
): boolean {
  cancelAudioContextAutoSuspend();
  const rawCtx = ctx || getRawAudioContext();
  const wasNotRunning = Boolean(rawCtx && rawCtx.state !== 'running');

  if (wasNotRunning) {
    try { rawCtx!.resume?.().catch(() => {}); } catch {}
  }
  if (Tone.context && Tone.context.state !== 'running') {
    try {
      if (typeof (Tone.context as any).resume === 'function') {
        (Tone.context as any).resume().catch(() => {});
      }
      (Tone as any).start?.()?.catch?.(() => {});
    } catch {}
  }
  if (!useAudioStore.getState().isAudioUnlocked) {
    useAudioStore.getState().unlockAudio();
  }
  if (!isTransportOrRecordingActive()) {
    scheduleAudioContextAutoSuspend(idleSuspendDelayMs);
  }
  return wasNotRunning;
}

export async function safeResumeAudioContext(): Promise<void> {
  cancelAudioContextAutoSuspend();
  const rawCtx = getRawAudioContext();
  if (rawCtx && rawCtx.state !== 'running') {
    try {
      await rawCtx.resume();
    } catch (_) {}
  }
  if (Tone.context && Tone.context.state !== 'running') {
    try {
      await Tone.context.resume();
    } catch (_) {}
  }
}

export async function safeSuspendAudioContext(): Promise<void> {
  cancelAudioContextAutoSuspend();
  if (isTransportOrRecordingActive()) return;
  const rawCtx = getRawAudioContext();
  if (rawCtx && rawCtx.state === 'running') {
    try {
      await rawCtx.suspend();
    } catch (_) {}
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAudioContextAutoSuspend();
    const rawCtx = getRawAudioContext();
    if (rawCtx && rawCtx.state === 'running') {
      rawCtx.suspend().catch(() => {});
    }
  });
}
