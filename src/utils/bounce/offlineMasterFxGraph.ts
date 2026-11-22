/**
 * offlineMasterFxGraph.ts — Retours FX Master (Réverbe IR + Lampe 4x), Slapback Toada & Master EQ 3 bandes (< 115 lignes).
 */
import { DEFAULT_STUDIO_MASTER_BUS_CONFIG } from '../../audio/effects/studioFxPresets';
import { buildStudioAcousticImpulseBuffer, mapReverbTimeKnobToDecaySec } from '../../audio/effects/studioReverbImpulse';
import { buildTubeSaturationCurve } from '../../audio/effects/studioSaturationChain';
import { resolveSlapbackDelayTimesSec } from '../../audio/effects/toadaVocalSlapback';
import { CONSOLE_HEADROOM_GAIN } from '../../audio/worklet/master-bus/masterBusWorkletTypes';
import type { MasterFX } from '../../types/store.types';
import { masterDbToLinearGain } from '../audio/channelFaderLinearRamp';
import { isMasterVolumeBypassedHelper } from '../automationBypassHelper';
import type { BaqueCycleTimingResult } from '../baqueBounceTiming';
import { sendPctToLinear } from './offlineAuxSendsHelper';

export interface OfflineMasterFxStageNodes {
  instDryInput: GainNode;
  voxDryInput: GainNode;
  revSendInput: GainNode;
  distSendInput: GainNode;
}

export function buildOfflineMasterFxStage(
  fxCtx: OfflineAudioContext,
  params: {
    masterVolDb: number;
    masterEQ: { low: number; mid: number; high: number };
    masterFX?: MasterFX;
    masterEffectsActive?: { compressor: boolean; reverb: boolean; disto: boolean };
    disableFx: boolean;
    disableEq: boolean;
    isMasterVolBypassed: boolean;
    globalBypass: any;
    unrolledMasterVols: number[];
    timing: BaqueCycleTimingResult;
  }
): OfflineMasterFxStageNodes {
  const { masterVolDb, masterEQ, masterFX, masterEffectsActive, disableFx, disableEq, isMasterVolBypassed, globalBypass, unrolledMasterVols, timing } = params;
  try { fxCtx.destination.channelInterpretation = 'discrete'; } catch (_) {}
  const merger = fxCtx.createChannelMerger(4);
  merger.connect(fxCtx.destination);

  const baseMasterLin = masterDbToLinearGain(masterVolDb);
  const hasMasterAuto = !isMasterVolumeBypassedHelper(isMasterVolBypassed, globalBypass) && unrolledMasterVols.some((v) => v !== 100);
  const applyMasterVolAuto = (g: GainNode) => {
    g.gain.value = baseMasterLin;
    if (!hasMasterAuto) return;
    for (let m = 0; m < timing.totalMeasures; m++) {
      g.gain.setValueAtTime(baseMasterLin * (Math.max(0, Math.min(100, unrolledMasterVols[m] ?? 100)) / 100), timing.measureStartsSec[m]);
    }
  };

  const busCfg = { ...DEFAULT_STUDIO_MASTER_BUS_CONFIG, ...(masterFX?.masterBus || {}) };
  const makeMasterEq = (outChOffset: number): GainNode => {
    const vol = fxCtx.createGain(); vol.channelCount = 2; vol.channelCountMode = 'explicit';
    applyMasterVolAuto(vol);
    const sub = fxCtx.createBiquadFilter(); sub.type = 'highpass'; sub.frequency.value = 30; sub.Q.value = Math.SQRT1_2;
    const low = fxCtx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 100; low.gain.value = disableEq ? 0 : masterEQ.low;
    const mid = fxCtx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = busCfg.eqMidFreqHz || 1000;
    mid.Q.value = busCfg.eqMidQMode === 'narrow' ? 2.5 : 0.7; mid.gain.value = disableEq ? 0 : masterEQ.mid;
    const high = fxCtx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4500; high.gain.value = disableEq ? 0 : masterEQ.high;
    const split = fxCtx.createChannelSplitter(2);
    vol.connect(sub); sub.connect(low); low.connect(mid); mid.connect(high); high.connect(split);
    split.connect(merger, 0, outChOffset); split.connect(merger, 1, outChOffset + 1);
    return vol;
  };

  const instVol = makeMasterEq(0), voxVol = makeMasterEq(2);
  const instDryInput = fxCtx.createGain(), voxDryInput = fxCtx.createGain();
  instDryInput.connect(instVol); voxDryInput.connect(voxVol);

  if (!disableFx && busCfg.toadaSlapbackMode !== 'off' && (busCfg.toadaSlapbackWet ?? 0) > 0) {
    const { leftSec, rightSec } = resolveSlapbackDelayTimesSec(busCfg.toadaSlapbackMode);
    const dL = fxCtx.createDelay(0.25), dR = fxCtx.createDelay(0.25), sMerge = fxCtx.createChannelMerger(2);
    dL.delayTime.value = leftSec; dR.delayTime.value = rightSec;
    const hpf = fxCtx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 220; hpf.Q.value = Math.SQRT1_2;
    const lpf = fxCtx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 4200; lpf.Q.value = Math.SQRT1_2;
    const wet = fxCtx.createGain(); wet.gain.value = Math.max(0, Math.min(35, busCfg.toadaSlapbackWet)) / 100;
    voxDryInput.connect(dL); voxDryInput.connect(dR); dL.connect(sMerge, 0, 0); dR.connect(sMerge, 0, 1);
    sMerge.connect(hpf); hpf.connect(lpf); lpf.connect(wet); wet.connect(voxVol);
  }

  const revSendInput = fxCtx.createGain(), distSendInput = fxCtx.createGain();
  const revCfg = masterFX?.reverb;
  if (!disableFx && (masterEffectsActive?.reverb ?? true) && !revCfg?.isMuted && sendPctToLinear(revCfg?.returnVolume ?? 70) > 1e-6) {
    const conv = fxCtx.createConvolver(); conv.normalize = false;
    conv.buffer = buildStudioAcousticImpulseBuffer(fxCtx, {
      decaySec: mapReverbTimeKnobToDecaySec(revCfg?.time ?? 30), spaceType: revCfg?.spaceType ?? 'wood_studio',
      preDelayMs: revCfg?.preDelayMs ?? 12, lowCutHz: revCfg?.lowCutHz ?? 140, dampHz: revCfg?.dampHz ?? 7500, stereoWidth: revCfg?.stereoWidth ?? 100,
    });
    const revRet = fxCtx.createGain(); revRet.gain.value = sendPctToLinear(revCfg?.returnVolume ?? 70);
    revSendInput.connect(conv); conv.connect(revRet); revRet.connect(instVol);
  }

  const distCfg = masterFX?.distortion;
  if (!disableFx && (masterEffectsActive?.disto ?? true) && !distCfg?.isMuted && sendPctToLinear(distCfg?.returnVolume ?? 0) > 1e-6) {
    const drivePct = distCfg?.drive ?? 20;
    const preG = fxCtx.createGain(); preG.gain.value = 1 / CONSOLE_HEADROOM_GAIN;
    const preHpf = fxCtx.createBiquadFilter(); preHpf.type = 'highpass'; preHpf.frequency.value = distCfg?.preHpfHz ?? 180; preHpf.Q.value = Math.SQRT1_2;
    const shaper = fxCtx.createWaveShaper(); shaper.curve = buildTubeSaturationCurve(drivePct, distCfg?.character ?? 'soft_tube'); shaper.oversample = '4x';
    const postLpf = fxCtx.createBiquadFilter(); postLpf.type = 'lowpass'; postLpf.frequency.value = distCfg?.toneHz ?? 6500; postLpf.Q.value = Math.SQRT1_2;
    const compG = fxCtx.createGain(); compG.gain.value = (CONSOLE_HEADROOM_GAIN / (1 + 0.28 * (drivePct / 100))) * sendPctToLinear(distCfg?.returnVolume ?? 0);
    distSendInput.connect(preG); preG.connect(preHpf); preG.connect(shaper); shaper.connect(postLpf); postLpf.connect(compG); compG.connect(instVol);
  }

  return { instDryInput, voxDryInput, revSendInput, distSendInput };
}
