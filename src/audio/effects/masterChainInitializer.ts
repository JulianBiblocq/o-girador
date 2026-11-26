/**
 * masterChainInitializer.ts — Chaîne Master Studio Zéro-GC avec repli automatique anti-silence (< 122 lignes).
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';
import { createDualAudioParam } from './dualAudioParam';
import { initMasterMonoNodes, setMasterMonoWorkletActive } from './masterMonoHandler';
import { createStudioConvolverReverb } from './studioReverbImpulse';
import { createStudioSaturationChain } from './studioSaturationChain';
import { createToadaVocalSlapback } from './toadaVocalSlapback';
import { initSpeakerProfileStage } from './speakerProfileFilter';
import { resetMasterCompressorCache } from './masterBypassHandler';
import { MasterBusWorkletManager } from '../worklet/master-bus/MasterBusWorkletManager';
import { CONSOLE_MAKEUP_GAIN } from '../worklet/master-bus/masterBusWorkletTypes';

export function initMasterEffectsChain(
  masterVol: number, masterEQ: { low: number; mid: number; high: number },
  _isEco: boolean, masterReverbVol: number, metroVolume: number, isMetroOn: boolean
) {
  if (nodes.masterVolumeNode) return;
  if (!Tone.context || Tone.getContext().state === 'closed') Tone.setContext(new Tone.Context());
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const disableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);

  const clampedDb = masterVol === -40 ? -Infinity : Math.max(-100, Math.min(12, masterVol));
  const initialMasterGain = clampedDb <= -60 ? 0 : Tone.dbToGain(clampedDb);
  const vol = new Tone.Gain(initialMasterGain), voxInput = new Tone.Gain(1.0);
  const voxVolGain = rawCtx.createGain(); voxVolGain.gain.value = initialMasterGain;
  try { vol.channelCount = 2; vol.channelCountMode = 'explicit'; } catch (_) {}

  const rawInstGainParam: AudioParam | undefined = (vol.gain as any)?._param;
  if (rawInstGainParam && voxVolGain.gain) {
    (vol.gain as any)._param = createDualAudioParam(rawCtx, rawInstGainParam, voxVolGain.gain);
  }
  nodes.setMasterVolumeNode(vol); nodes.setMasterVocalInputNode(voxInput);

  const makeEq = () => {
    const subHpf = rawCtx.createBiquadFilter(); subHpf.type = 'highpass'; subHpf.frequency.value = 30; subHpf.Q.value = Math.SQRT1_2;
    const low = rawCtx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 100; low.gain.value = masterEQ.low;
    const mid = rawCtx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.7; mid.gain.value = masterEQ.mid;
    const high = rawCtx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4500; high.gain.value = masterEQ.high;
    const out = rawCtx.createGain(); subHpf.connect(low); low.connect(mid); mid.connect(high); high.connect(out);
    return { subHpf, low, mid, high, out };
  };
  const instEq = makeEq(), voxEq = makeEq();
  nodes.setMasterEQNode({
    low: createDualAudioParam(rawCtx, instEq.low.gain, voxEq.low.gain),
    mid: createDualAudioParam(rawCtx, instEq.mid.gain, voxEq.mid.gain),
    high: createDualAudioParam(rawCtx, instEq.high.gain, voxEq.high.gain),
    midFreq: createDualAudioParam(rawCtx, instEq.mid.frequency, voxEq.mid.frequency),
    midQ: createDualAudioParam(rawCtx, instEq.mid.Q, voxEq.mid.Q),
    input: instEq.subHpf, output: instEq.out,
  });

  const slapback = createToadaVocalSlapback(rawCtx, 'off', 0, disableFx);
  Tone.connect(vol, instEq.subHpf); Tone.connect(voxInput, voxVolGain);
  Tone.connect(voxInput, slapback.input); slapback.output.connect(voxVolGain); voxVolGain.connect(voxEq.subHpf);

  try {
    if (typeof rawCtx.createConstantSource === 'function') {
      const sacKeepAlive = rawCtx.createConstantSource();
      sacKeepAlive.offset.value = 0; sacKeepAlive.start(0);
      Tone.connect(sacKeepAlive, vol); Tone.connect(sacKeepAlive, voxInput);
    }
  } catch (_) {}

  const postLimiterTap = new Tone.Gain(1.0);
  try { postLimiterTap.channelCount = 2; postLimiterTap.channelCountMode = 'explicit'; } catch (_) {}
  nodes.setMasterPostLimiterTap(postLimiterTap);

  const fallbackBridge = rawCtx.createGain();
  fallbackBridge.gain.value = CONSOLE_MAKEUP_GAIN;
  instEq.out.connect(fallbackBridge); voxEq.out.connect(fallbackBridge);
  Tone.connect(fallbackBridge, postLimiterTap);

  const workletMgr = new MasterBusWorkletManager();
  workletMgr.onProcessorError = () => {
    fallbackBridge.gain.value = CONSOLE_MAKEUP_GAIN;
    setMasterMonoWorkletActive(false);
  };
  nodes.setMasterBusWorkletManager(workletMgr);
  resetMasterCompressorCache();
  void workletMgr.init(rawCtx, { monoCheck: Boolean(useSequencerStore.getState().isMasterMono) }).then((ok) => {
    if (!ok) return;
    try {
      const c0 = workletMgr.connectSourceToInput(instEq.out, 0);
      const c1 = workletMgr.connectSourceToInput(voxEq.out, 1);
      const cOut = workletMgr.connectOutputToTarget(postLimiterTap);
      if (c0 && c1 && cOut) {
        fallbackBridge.gain.value = 0;
        setMasterMonoWorkletActive(true);
      }
      resetMasterCompressorCache();
    } catch (_) {}
  });

  try { Tone.Destination.channelCount = 2; Tone.Destination.channelCountMode = 'explicit'; } catch (_) {}
  const speakerOut = initSpeakerProfileStage(postLimiterTap);
  initMasterMonoNodes(speakerOut);

  const metro = new Tone.Channel({ volume: Tone.gainToDb(metroVolume / 100) }).toDestination();
  metro.mute = !isMetroOn; nodes.setMetroChannel(metro);

  const initialRevGain = disableFx ? 0 : Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol);
  const revVol = new Tone.Gain(Number.isFinite(initialRevGain) ? initialRevGain : 0).connect(vol);
  nodes.setMasterReverbVolumeNode(revVol);
  const revBus = new Tone.Channel(); revBus.receive('reverb'); nodes.setReverbBusReceive(revBus);
  const rev = createStudioConvolverReverb(); rev.connect(revVol); revBus.connect(rev); nodes.setReverbNode(rev);

  const dist = createStudioSaturationChain(disableFx);
  const distVol = new Tone.Gain(0.0).connect(vol);
  dist.connect(distVol); nodes.setDistortionNode(dist); nodes.setMasterDistortionVolumeNode(distVol);
  const distBus = new Tone.Channel(); distBus.receive('distortion'); distBus.connect(dist); nodes.setDistortionBusReceive(distBus);
}

export function initInstrumentNodes() {}
