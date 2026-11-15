import { getTone } from '../../../ToneLoader';
import { masterVolumeNode, reverbBusReceive } from '../../../hooks/audio-sync/audioEngineNodes';
import { computeProgressiveDecayEnvelope } from '../../../audio/engine/strokeEnvelopeHelper';
import { computeWizardSpatialMix } from '../wizardSpatialMixMath';

export interface ActivePreviewVoice {
  source: AudioBufferSourceNode;
  envGain: GainNode;
  panner: StereoPannerNode;
  dryGain: GainNode;
  wetGain: GainNode | null;
}

const activeVoices = new Set<ActivePreviewVoice>();
let arpeggioTimers: number[] = [];

export function pushArpeggioTimer(timerId: number): void {
  arpeggioTimers.push(timerId);
}

export function stopAllWizardSpatialNodes(): void {
  arpeggioTimers.forEach((id) => window.clearTimeout(id));
  arpeggioTimers = [];
  activeVoices.forEach((v) => {
    try { v.source.onended = null; v.source.stop(); } catch {}
    try { v.source.disconnect(); v.envGain.disconnect(); v.panner.disconnect(); v.dryGain.disconnect(); v.wetGain?.disconnect(); } catch {}
  });
  activeVoices.clear();
}

export function triggerSpatialBufferLayer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  rate: number,
  peakGain: number,
  decayMult: number,
  x: number,
  y: number,
  instType: string,
  startTime: number,
  forceShort80ms = false
): void {
  if (peakGain <= 0.0001) return;
  const Tone = getTone();
  const mix = computeWizardSpatialMix(x, y, instType);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;

  const envGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  panner.pan.value = mix.panNorm;
  const dryGain = ctx.createGain();
  dryGain.gain.value = mix.linearGain;

  const wetRatio = Math.pow(mix.reverbSend / 100, 2);
  const wetGain = reverbBusReceive && wetRatio > 0.001 ? ctx.createGain() : null;
  if (wetGain) wetGain.gain.value = mix.linearGain * wetRatio;

  source.connect(envGain);
  envGain.connect(panner);
  panner.connect(dryGain);
  try { Tone.connect(dryGain, masterVolumeNode || Tone.getDestination()); } catch {}
  if (wetGain && reverbBusReceive) {
    panner.connect(wetGain);
    try { Tone.connect(wetGain, reverbBusReceive); } catch {}
  }

  const realDur = buffer.duration / rate;
  const env = computeProgressiveDecayEnvelope(realDur, decayMult, forceShort80ms);
  const holdEnd = startTime + env.holdSec;
  const relEnd = env.isFullBuffer ? startTime + realDur : holdEnd + env.releaseSec;
  const stopAt = env.isFullBuffer ? relEnd + 0.01 : relEnd + 0.015;

  envGain.gain.setValueAtTime(Math.max(0.0001, peakGain), startTime);
  envGain.gain.setValueAtTime(Math.max(0.0001, peakGain), holdEnd);
  if (!env.isFullBuffer) {
    envGain.gain.linearRampToValueAtTime(peakGain * 0.35, holdEnd + env.releaseSec * 0.5);
    envGain.gain.exponentialRampToValueAtTime(0.0001, relEnd);
  }
  envGain.gain.linearRampToValueAtTime(0, stopAt);

  const rec: ActivePreviewVoice = { source, envGain, panner, dryGain, wetGain };
  activeVoices.add(rec);
  source.onended = () => {
    activeVoices.delete(rec);
    try { source.disconnect(); envGain.disconnect(); panner.disconnect(); dryGain.disconnect(); wetGain?.disconnect(); } catch {}
  };
  source.start(startTime);
  source.stop(stopAt + 0.005);
}
