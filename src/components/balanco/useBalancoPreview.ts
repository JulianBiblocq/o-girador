import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { safeResumeAudioContext, scheduleAudioContextAutoSuspend } from '../../audio/audioContextSuspendManager';

export function useBalancoPreview(
  customOffsets: [number, number, number, number],
  swingIntensity: number = 100,
  activeMode: 'maracatu' | 'custom',
  isCaptureModalOpen: boolean
) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const currentBpm = useSequencerStore((state) => state.measureBpms[0] || 100);
  const bpmRef = useRef(currentBpm);
  const customOffsetsRef = useRef(customOffsets);
  const swingIntensityRef = useRef(swingIntensity);
  const timerRef = useRef<number | null>(null);
  const activeOscsRef = useRef<OscillatorNode[]>([]);
  const nextStepTimeRef = useRef<number>(0);
  const stepIndexRef = useRef<number>(0);

  useEffect(() => {
    bpmRef.current = currentBpm;
  }, [currentBpm]);

  useEffect(() => {
    customOffsetsRef.current = customOffsets;
    swingIntensityRef.current = swingIntensity;
  }, [customOffsets, swingIntensity]);

  const schedulePreviewBeep = (
    ctx: AudioContext,
    timeSec: number,
    frequency: number,
    durationSec: number,
    gainLevel: number
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, timeSec);

    gain.gain.setValueAtTime(gainLevel, timeSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, timeSec + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(timeSec);
    osc.stop(timeSec + durationSec + 0.01);

    activeOscsRef.current.push(osc);
    osc.onended = () => {
      const idx = activeOscsRef.current.indexOf(osc);
      if (idx !== -1) activeOscsRef.current.splice(idx, 1);
    };
  };

  const stopPreview = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    activeOscsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    activeOscsRef.current = [];
    setIsPreviewPlaying(false);
    scheduleAudioContextAutoSuspend(500);
  };

  const startPreview = async () => {
    stopPreview();
    await safeResumeAudioContext();
    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;

    const now = rawCtx.currentTime;
    nextStepTimeRef.current = now + 0.05;
    stepIndexRef.current = 0;
    setIsPreviewPlaying(true);

    const timer = window.setInterval(() => {
      const ctx = Tone.getContext().rawContext as AudioContext;
      const currentTime = ctx.currentTime;
      const bpm = bpmRef.current > 0 ? bpmRef.current : 100;
      const stepSec = 60 / bpm / 4;

      while (nextStepTimeRef.current < currentTime + 0.12) {
        const step = stepIndexRef.current % 16;
        const posInGroup = step % 4;

        if (posInGroup === 0) {
          schedulePreviewBeep(ctx, nextStepTimeRef.current, 600, 0.035, 0.25);
        }

        const offsetPct = customOffsetsRef.current[posInGroup] ?? 0;
        const intensityRatio = (swingIntensityRef.current ?? 100) / 100;
        const offsetSec = (offsetPct / 100) * (stepSec * 0.5) * intensityRatio;
        const ticTime = Math.max(currentTime, nextStepTimeRef.current + offsetSec);

        schedulePreviewBeep(ctx, ticTime, 1200, 0.025, 0.35);

        nextStepTimeRef.current += stepSec;
        stepIndexRef.current = (stepIndexRef.current + 1) % 16;
      }
    }, 25);

    timerRef.current = timer;
  };

  const togglePreview = () => {
    if (isPreviewPlaying) stopPreview();
    else startPreview();
  };

  useEffect(() => () => stopPreview(), []);
  useEffect(() => {
    if (activeMode !== 'custom' && isPreviewPlaying) stopPreview();
  }, [activeMode, isPreviewPlaying]);
  useEffect(() => {
    if (isCaptureModalOpen && isPreviewPlaying) stopPreview();
  }, [isCaptureModalOpen, isPreviewPlaying]);

  return { isPreviewPlaying, togglePreview, stopPreview };
}
