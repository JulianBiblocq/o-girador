import * as Tone from 'tone';
import { metroChannel } from '../effectsChain';
import { activeNativeOscillators } from './nativeOscillatorRegistry';
import { sanitizePitchHz } from '../../utils/pitchHzContract';

export const playNativeMetroClick = (time: number, isAccent: boolean, soundType: string, volume: number, referencePitchHz?: unknown) => {
  const basePitchHz = sanitizePitchHz(referencePitchHz);
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const clickGain = rawCtx.createGain();
  osc.connect(clickGain);

  if (metroChannel) {
    Tone.connect(clickGain, metroChannel as any);
  } else if (Tone.getDestination()) {
    Tone.connect(clickGain, Tone.getDestination() as any);
  } else {
    clickGain.connect(rawCtx.destination);
  }

  const freq = isAccent ? basePitchHz * 2 : basePitchHz;
  const volumeMultiplier = isAccent ? 1.0 : 0.6;
  const finalVol = volume * volumeMultiplier;

  clickGain.gain.setValueAtTime(0.0001, time);
  clickGain.gain.exponentialRampToValueAtTime(finalVol, time + 0.002);

  if (soundType === 'clave') {
    osc.type = 'sine';
    const targetFreq = isAccent ? 1200 : 800;
    osc.frequency.setValueAtTime(targetFreq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.01);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.09);
  } else if (soundType === 'cowbell') {
    osc.type = 'triangle';
    osc.frequency.value = isAccent ? basePitchHz * Math.pow(2, 5 / 12) : basePitchHz;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.07);
  } else {
    osc.type = 'square';
    osc.frequency.value = freq;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      clickGain.disconnect();
    } catch (_) {}
  };
};

export const playCountInBeep = (time: number, freq: number, isAccent: boolean = false) => {
  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  if (!rawCtx) return;

  if (rawCtx.state === 'suspended') {
    rawCtx.resume().catch(() => {});
  }

  const osc = rawCtx.createOscillator();
  const clickGain = rawCtx.createGain();
  osc.connect(clickGain);

  if (metroChannel) {
    Tone.connect(clickGain, metroChannel as any);
  } else if (Tone.getDestination()) {
    Tone.connect(clickGain, Tone.getDestination() as any);
  } else {
    clickGain.connect(rawCtx.destination);
  }

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  const duration = 0.085;
  const finalVol = isAccent ? 0.95 : 0.75;

  clickGain.gain.setValueAtTime(0.0001, time);
  clickGain.gain.exponentialRampToValueAtTime(finalVol, time + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.start(time);
  osc.stop(time + duration + 0.01);

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      clickGain.disconnect();
    } catch (_) {}
  };
};
