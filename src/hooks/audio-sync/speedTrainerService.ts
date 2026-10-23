import * as Tone from 'tone';
import { SpeedTrainerConfig } from '../../types';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { playCountInBeep } from '../../audio/nativeSynths';
import { AudioEngine } from '../../AudioEngine';
import { getBeatsCount, getBeatDurationSec } from '../../utils/meterTiming';

export interface SpeedTrainerContext {
  speedTrainerTimeoutsRef: { current: number[] };
  speedTrainerCurrentBpmRef: { current: number };
  speedTrainerConsolidationLapsDoneRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  measureCountRef: { current: number };
  currentStepIndexRef: { current: number };
  audioEngine: AudioEngine | null;
  handleStop: () => void;
  setCurrentMeasure: (m: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

export function stopSpeedTrainerAudio(ctx: SpeedTrainerContext): void {
  ctx.speedTrainerTimeoutsRef.current.forEach(t => clearTimeout(t));
  ctx.speedTrainerTimeoutsRef.current = [];
  if (useSequencerStore.getState().isSpeedTrainerActive) {
    useSequencerStore.getState().stopSpeedTrainer();
    Tone.Transport.bpm.value = useSequencerStore.getState().bpm;
  }
  ctx.handleStop();
}

export async function launchSpeedTrainer(config: SpeedTrainerConfig, ctx: SpeedTrainerContext): Promise<void> {
  ctx.handleStop();

  if (!useAudioStore.getState().isAudioUnlocked) {
    useAudioStore.getState().unlockAudio();
  }
  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  if (rawCtx && rawCtx.state !== 'running') {
    try { await rawCtx.resume(); } catch (_) {}
  }
  if (Tone.start) {
    try { await Tone.start(); } catch (_) {}
  }

  const startMeasureSig = ctx.measureTimeSigsRef.current?.[config.startMeasure] || '4/4';
  const beatsCount = getBeatsCount(startMeasureSig);
  const beatDurationSec = getBeatDurationSec(startMeasureSig, config.startBpm);

  const store = useSequencerStore.getState();
  store.startSpeedTrainer(config);
  ctx.speedTrainerCurrentBpmRef.current = config.startBpm;
  ctx.speedTrainerConsolidationLapsDoneRef.current = 0;
  Tone.Transport.bpm.value = config.startBpm;

  const t0 = rawCtx.currentTime + 0.06;
  const countInDurationSec = beatsCount * beatDurationSec;
  const targetStartTime = t0 + countInDurationSec;

  for (let i = 0; i < beatsCount; i++) {
    const beepTime = t0 + i * beatDurationSec;
    const isAccent = i === beatsCount - 1;
    let freq = 800;
    if (beatsCount === 4) freq = [600, 800, 1000, 1200][i];
    else if (beatsCount === 3) freq = [700, 900, 1200][i];
    else if (beatsCount === 2) freq = [800, 1200][i];
    else freq = isAccent ? 1200 : 800;
    playCountInBeep(beepTime, freq, isAccent);
  }

  store.setSpeedTrainerCountdown(beatsCount);
  const timeouts: number[] = [];
  ctx.speedTrainerTimeoutsRef.current = timeouts;

  for (let step = 1; step < beatsCount; step++) {
    const delayMs = (step * beatDurationSec + 0.06) * 1000;
    const t = window.setTimeout(() => {
      store.setSpeedTrainerCountdown(beatsCount - step);
    }, delayMs);
    timeouts.push(t);
  }

  const clearCdTimeout = window.setTimeout(() => {
    store.setSpeedTrainerCountdown(null);
  }, (countInDurationSec + 0.06) * 1000);
  timeouts.push(clearCdTimeout);

  ctx.measureCountRef.current = config.startMeasure;
  ctx.currentStepIndexRef.current = -1;
  ctx.setCurrentMeasure(config.startMeasure);

  if (ctx.audioEngine) {
    ctx.audioEngine.currentMeasure = config.startMeasure;
    ctx.audioEngine.currentStep = 0;
  }

  Tone.Transport.position = 0;
  Tone.Transport.start(targetStartTime);
  ctx.audioEngine?.start(targetStartTime);
  ctx.setIsPlaying(true);
}
