import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';
import { initMasterMonoNodes } from './masterMonoHandler';
import { createStudioConvolverReverb } from './studioReverbImpulse';
import { safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';

export function initMasterEffectsChain(
  masterVol: number,
  masterEQ: { low: number; mid: number; high: number },
  isEco: boolean,
  masterReverbVol: number,
  metroVolume: number,
  isMetroOn: boolean
) {
  if (nodes.masterVolumeNode) return;

  if (!Tone.context || Tone.getContext().state === 'closed') {
    Tone.setContext(new Tone.Context());
  }

  const lowFilter = new Tone.BiquadFilter(100, 'lowshelf');
  safeRampGainDb(lowFilter.gain, masterEQ.low, 0.02);
  const midFilter = new Tone.BiquadFilter({ frequency: 1000, type: 'peaking', Q: 0.7 });
  safeRampGainDb(midFilter.gain, masterEQ.mid, 0.02);
  const highFilter = new Tone.BiquadFilter(4500, 'highshelf');
  safeRampGainDb(highFilter.gain, masterEQ.high, 0.02);

  nodes.setMasterEQNode({
    low: lowFilter.gain,
    mid: midFilter.gain,
    high: highFilter.gain,
    lowFilter,
    midFilter,
    highFilter,
    input: lowFilter,
    output: highFilter,
  });

  const disableFx = useSequencerStore.getState().ecoConfig?.disableFx ?? isEco;
  const isCompActive = useSequencerStore.getState().masterEffectsActive?.compressor ?? true;
  const isCompBypassed = !isCompActive;

  const comp = new Tone.Compressor({
    threshold: isCompBypassed ? 0 : -6,
    ratio: isCompBypassed ? 1 : 2,
    attack: 0.03,
    release: 0.15,
    knee: 6,
  });
  nodes.setMasterCompressorNode(comp);

  const vol = new Tone.Gain(1.0);
  try {
    vol.channelCount = 2;
    vol.channelCountMode = 'explicit';
  } catch (_) {}
  nodes.setMasterVolumeNode(vol);

  vol.connect(lowFilter);
  lowFilter.connect(midFilter);
  midFilter.connect(highFilter);
  highFilter.connect(comp);

  const masterLimiterNode = new Tone.Limiter(-0.5);
  comp.connect(masterLimiterNode);

  try {
    Tone.Destination.channelCount = 2;
    Tone.Destination.channelCountMode = 'explicit';
  } catch (_) {}
  initMasterMonoNodes(masterLimiterNode);

  const clampedDb = masterVol === -40 ? -Infinity : Math.max(-100, Math.min(12, masterVol));
  const baseGain = clampedDb <= -60 ? 0 : Tone.dbToGain(clampedDb);
  vol.gain.rampTo(baseGain, 0.02);

  const meter = new Tone.Meter();
  nodes.setMasterMeterNode(meter);
  masterLimiterNode.connect(meter);

  const masterSplit = new Tone.Split(2);
  Tone.getDestination().connect(masterSplit);

  const leftMeter = new Tone.Meter();
  const rightMeter = new Tone.Meter();
  nodes.setMasterLeftMeterNode(leftMeter);
  nodes.setMasterRightMeterNode(rightMeter);
  masterSplit.connect(leftMeter, 0);
  masterSplit.connect(rightMeter, 1);

  const metro = new Tone.Channel({ volume: Tone.gainToDb(metroVolume / 100) }).connect(vol);
  metro.mute = !isMetroOn;
  nodes.setMetroChannel(metro);

  const revVol = new Tone.Gain(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol)).connect(vol);
  nodes.setMasterReverbVolumeNode(revVol);

  const revBus = new Tone.Channel();
  revBus.receive('reverb');
  nodes.setReverbBusReceive(revBus);

  if (!disableFx) {
    const rev = createStudioConvolverReverb();
    rev.connect(revVol);
    revBus.connect(rev);
    nodes.setReverbNode(rev);
  } else {
    nodes.setReverbNode(null);
  }

  const dist = new Tone.Distortion({ distortion: 0.15, wet: 1 });
  const distVol = new Tone.Gain(0.0).connect(vol);
  dist.connect(distVol);
  nodes.setDistortionNode(dist);
  nodes.setMasterDistortionVolumeNode(distVol);

  const distBus = new Tone.Channel();
  distBus.receive('distortion');
  distBus.connect(dist);
  nodes.setDistortionBusReceive(distBus);
}

export function initInstrumentNodes() {}
