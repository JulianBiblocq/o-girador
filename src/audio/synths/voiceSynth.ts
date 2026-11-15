import * as Tone from 'tone';
import type { VoiceMelismaGlide } from '../../utils/musicTheory';
import { masterVolumeNode } from '../effectsChain';
import { activeNativeOscillators } from './nativeOscillatorRegistry';

export const playNativeVoiceSynth = (
  freq: number,
  time: number,
  duration: number,
  volume: number,
  channelNode: any,
  melismaGlides?: VoiceMelismaGlide[]
) => {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const voiceGain = rawCtx.createGain();
  osc.connect(voiceGain);

  if (channelNode) {
    Tone.connect(voiceGain, channelNode);
  } else if (masterVolumeNode) {
    Tone.connect(voiceGain, masterVolumeNode as any);
  } else {
    voiceGain.connect(rawCtx.destination);
  }

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  if (melismaGlides && melismaGlides.length > 0) {
    let curFreq = freq;
    for (const g of melismaGlides) {
      if (!(g.freq > 0) || g.offsetSec <= 0 || g.offsetSec >= duration) continue;
      const t0 = time + g.offsetSec;
      const ramp = Math.min(0.022, Math.max(0.005, (duration - g.offsetSec) * 0.35));
      osc.frequency.setValueAtTime(curFreq, t0);
      osc.frequency.exponentialRampToValueAtTime(g.freq, t0 + ramp);
      curFreq = g.freq;
    }
  }

  const attack = 0.05;
  voiceGain.gain.setValueAtTime(0.0001, time);
  voiceGain.gain.exponentialRampToValueAtTime(volume * 0.3, time + attack);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.start(time);
  osc.stop(time + duration);

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      voiceGain.disconnect();
    } catch (_) {}
  };
};
