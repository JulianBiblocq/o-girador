/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gestionnaire d'auto-suspension et de protection du contexte audio (< 75 lignes).
 */

import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';

let autoSuspendTimer: ReturnType<typeof setTimeout> | null = null;

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
    const isPlaying = useSequencerStore.getState().isPlaying;
    const isRecording = useAudioStore.getState().recordingStatus === 'recording';
    if (isPlaying || isRecording) return;
    const rawCtx = getRawAudioContext();
    if (rawCtx && rawCtx.state === 'running') {
      rawCtx.suspend().catch(() => {});
    }
  }, delayMs);
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
