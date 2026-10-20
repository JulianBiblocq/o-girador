import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';

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

  const eq = new Tone.EQ3({ low: masterEQ.low, mid: masterEQ.mid, high: masterEQ.high });
  nodes.setMasterEQNode(eq);

  const disableFx = useSequencerStore.getState().ecoConfig?.disableFx ?? isEco;
  const isCompActive = useSequencerStore.getState().masterEffectsActive?.compressor ?? true;
  const isCompBypassed = disableFx || !isCompActive;

  const comp = new Tone.Compressor({
    threshold: isCompBypassed ? 0 : -12,
    ratio: isCompBypassed ? 1 : 2,
    attack: 0.015,
    release: 0.15
  });
  nodes.setMasterCompressorNode(comp);

  const vol = new Tone.Gain(1.0);
  try {
    vol.channelCount = 2;
    vol.channelCountMode = "explicit";
  } catch (_) {}
  nodes.setMasterVolumeNode(vol);

  vol.connect(eq);
  eq.connect(comp);

  const masterLimiterNode = new Tone.Limiter(-2);
  comp.connect(masterLimiterNode);

  const clipper = new Tone.WaveShaper();
  const curveSize = 8192;
  const clipperCurve = new Float32Array(curveSize);
  for (let i = 0; i < curveSize; i++) {
    const x = (2 * i) / (curveSize - 1) - 1;
    let y = (3 * x - Math.pow(x, 3)) / 2;
    if (x <= -1) y = -1.0;
    else if (x >= 1) y = 1.0;
    clipperCurve[i] = y;
  }
  clipper.curve = clipperCurve;
  clipper.oversample = '4x';
  nodes.setMasterSoftClipperNode(clipper);

  try {
    Tone.Destination.channelCount = 2;
    Tone.Destination.channelCountMode = "explicit";
  } catch (_) {}
  masterLimiterNode.toDestination();

  const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
  const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
  vol.gain.value = baseGain * multiplier;

  const meter = new Tone.Meter();
  nodes.setMasterMeterNode(meter);
  (window as any).masterMeterNode = meter;
  masterLimiterNode.connect(meter);

  const masterSplit = new Tone.Split(2);
  Tone.getDestination().connect(masterSplit);

  const leftMeter = new Tone.Meter();
  const rightMeter = new Tone.Meter();
  nodes.setMasterLeftMeterNode(leftMeter);
  nodes.setMasterRightMeterNode(rightMeter);
  masterSplit.connect(leftMeter, 0);
  masterSplit.connect(rightMeter, 1);
  (window as any).masterLeftMeterNode = leftMeter;
  (window as any).masterRightMeterNode = rightMeter;

  const metro = new Tone.Channel({ volume: Tone.gainToDb(metroVolume / 100) }).connect(vol);
  metro.mute = !isMetroOn;
  nodes.setMetroChannel(metro);

  const revVol = new Tone.Gain(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol)).connect(vol);
  nodes.setMasterReverbVolumeNode(revVol);

  const revBus = new Tone.Channel();
  revBus.receive("reverb");
  nodes.setReverbBusReceive(revBus);

  if (!disableFx) {
    const rev = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 1 }).connect(revVol);
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
  distBus.receive("distortion");
  distBus.connect(dist);
  nodes.setDistortionBusReceive(distBus);
}

export function initInstrumentNodes() {}
