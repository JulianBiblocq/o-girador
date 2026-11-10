/**
 * masterChainInitializer.ts
 * Initialisation de la chaîne Master Studio Zéro-GC (< 140 lignes) :
 * - Supprime les 11 nœuds `Tone.*` Master (`Compressor`, `Limiter`, `Split`, 3x `Meter`, `Distortion`, `BiquadFilter`).
 * - Route le sous-mix instrumental vers `MasterBusWorklet.inputs[0]` et `TOADA` vers `inputs[1]` (ducking spectral sans auto-atténuation),
 *   tout en appliquant `masterVolumeNode` et `masterEQNode` à 100 % sur l'instrumental ET sur la voix (via `_param` dual sans muter `vol.gain` read-only).
 * - Maintient le graphe `standardized-audio-context` actif via `sacKeepAlive` et `fallbackBridge.gain = 0`.
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';
import { initMasterMonoNodes } from './masterMonoHandler';
import { createStudioConvolverReverb } from './studioReverbImpulse';
import { createStudioSaturationChain } from './studioSaturationChain';
import { createToadaVocalSlapback } from './toadaVocalSlapback';
import { initSpeakerProfileStage } from './speakerProfileFilter';
import { resetMasterCompressorCache } from './masterBypassHandler';
import { MasterBusWorkletManager } from '../worklet/master-bus/MasterBusWorkletManager';

function createDualAudioParam(rawCtx: BaseAudioContext, a: AudioParam, b: AudioParam) {
  return {
    context: rawCtx,
    get defaultValue() { return a.defaultValue; },
    get minValue() { return a.minValue; },
    get maxValue() { return a.maxValue; },
    get value() { return a.value; },
    set value(v: number) { a.value = v; b.value = v; },
    rampTo(v: number, dur = 0.02) {
      const now = rawCtx.currentTime ?? 0, tau = Math.max(0.005, dur / 3);
      a.cancelScheduledValues?.(now); b.cancelScheduledValues?.(now);
      a.setTargetAtTime(v, now, tau); b.setTargetAtTime(v, now, tau);
    },
    setValueAtTime(v: number, t: number) { a.setValueAtTime(v, t); b.setValueAtTime(v, t); return a; },
    linearRampToValueAtTime(v: number, t: number) { a.linearRampToValueAtTime(v, t); b.linearRampToValueAtTime(v, t); return a; },
    exponentialRampToValueAtTime(v: number, t: number) { a.exponentialRampToValueAtTime(v, t); b.exponentialRampToValueAtTime(v, t); return a; },
    setTargetAtTime(v: number, t: number, tau: number) { a.setTargetAtTime(v, t, tau); b.setTargetAtTime(v, t, tau); return a; },
    setValueCurveAtTime(c: number[] | Float32Array, t: number, d: number) { a.setValueCurveAtTime(c, t, d); b.setValueCurveAtTime(c, t, d); return a; },
    cancelScheduledValues(t: number) { a.cancelScheduledValues(t); b.cancelScheduledValues(t); return a; },
    cancelAndHoldAtTime(t: number) {
      if (typeof (a as any).cancelAndHoldAtTime === 'function') (a as any).cancelAndHoldAtTime(t); else a.cancelScheduledValues(t);
      if (typeof (b as any).cancelAndHoldAtTime === 'function') (b as any).cancelAndHoldAtTime(t); else b.cancelScheduledValues(t);
      return a;
    },
  };
}

export function initMasterEffectsChain(
  masterVol: number, masterEQ: { low: number; mid: number; high: number },
  isEco: boolean, masterReverbVol: number, metroVolume: number, isMetroOn: boolean
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
    const low = rawCtx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 100; low.gain.value = masterEQ.low;
    const mid = rawCtx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.7; mid.gain.value = masterEQ.mid;
    const high = rawCtx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4500; high.gain.value = masterEQ.high;
    const out = rawCtx.createGain(); low.connect(mid); mid.connect(high); high.connect(out);
    return { low, mid, high, out };
  };
  const instEq = makeEq(), voxEq = makeEq();
  nodes.setMasterEQNode({
    low: createDualAudioParam(rawCtx, instEq.low.gain, voxEq.low.gain),
    mid: createDualAudioParam(rawCtx, instEq.mid.gain, voxEq.mid.gain),
    high: createDualAudioParam(rawCtx, instEq.high.gain, voxEq.high.gain),
    input: instEq.low, output: instEq.out,
  });

  const slapback = createToadaVocalSlapback(rawCtx, 'off', 0, disableFx);
  Tone.connect(vol, instEq.low); Tone.connect(voxInput, voxVolGain);
  Tone.connect(voxInput, slapback.input); slapback.output.connect(voxVolGain); voxVolGain.connect(voxEq.low);

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
  instEq.out.connect(fallbackBridge); voxEq.out.connect(fallbackBridge);
  Tone.connect(fallbackBridge, postLimiterTap);

  const workletMgr = new MasterBusWorkletManager();
  nodes.setMasterBusWorkletManager(workletMgr);
  resetMasterCompressorCache();
  void workletMgr.init(rawCtx).then((ok) => {
    if (!ok) return;
    try {
      const c0 = workletMgr.connectSourceToInput(instEq.out, 0);
      const c1 = workletMgr.connectSourceToInput(voxEq.out, 1);
      const cOut = workletMgr.connectOutputToTarget(postLimiterTap);
      if (c0 && c1 && cOut) fallbackBridge.gain.value = 0;
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

  const dist = createStudioSaturationChain(isEco);
  const distVol = new Tone.Gain(0.0).connect(vol);
  dist.connect(distVol); nodes.setDistortionNode(dist); nodes.setMasterDistortionVolumeNode(distVol);
  const distBus = new Tone.Channel(); distBus.receive('distortion'); distBus.connect(dist); nodes.setDistortionBusReceive(distBus);
}

export function initInstrumentNodes() {}
