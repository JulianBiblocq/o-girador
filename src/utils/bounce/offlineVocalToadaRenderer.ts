/**
 * offlineVocalToadaRenderer.ts — Rendu hors-ligne des pistes vocales Toada (Puxador / Coro / Synthé) (< 138 lignes).
 */
import { BUTTERWORTH_Q, resolveLowCutTargetHz } from '../../audio/effects/lowCutTarget';
import { computeEffectiveAuxSendLinearGain } from '../../audio/effects/postBusSendRouter';
import { VocalRehydration } from '../../audio/vocal/vocalRehydration';
import { VocalTimingCalculator } from '../../audio/vocal/vocalTimingCalculator';
import { getOrComputeVocalPatternDspSync } from '../../audio/vocalDsp/vocalPatternBufferCache';
import { base64ToBlob } from '../../contexts/audio/audioVocalBase64';
import { instrumentsConfig } from '../../data';
import { getVocalBufferForPattern, isSamplePlaybackAllowed, isVocalSamplePattern } from '../../hooks/audio-sync/vocalSampleHelpers';
import { useAudioStore } from '../../stores/useAudioStore';
import { getEffectiveMuteState, getEffectiveVolume, isToadaBus } from '../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../audio/monoCompatiblePan';
import { multiplyPolarity } from '../audio/polarityGain';
import { CONSOLE_HEADROOM_GAIN, faderPositionToDb, faderPositionToGain } from '../audioMath';
import { isAutomationBypassed } from '../automationBypassHelper';
import { hasActiveTrackAutomation } from '../automationDetectHelper';
import type { BaqueCycleTimingResult } from '../baqueBounceTiming';
import { getBeatsPerMeasure } from '../measureHelpers';
import { resolveVocalPhraseInfo } from '../vocalPhraseBlock';
import { scheduleOfflineVocalSynthForMeasure } from './offlineVocalSynthRenderer';

async function resolveOfflinePatternVocalBuffer(ctx: BaseAudioContext, trackId: number | string, pattern: any): Promise<AudioBuffer | undefined> {
  const existing = getVocalBufferForPattern(trackId, pattern);
  if (existing) return existing;
  const store = useAudioStore.getState(), key = `${trackId}_${pattern.id}`;
  const blob = store.vocalBlobs?.[key] || store.vocalBlobs?.[pattern.id];
  if (blob) { try { return await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0)); } catch { /* ignore */ } }
  if (typeof pattern.vocalAudioData === 'string' && pattern.vocalAudioData.length > 32) {
    try { return await ctx.decodeAudioData((await base64ToBlob(pattern.vocalAudioData).arrayBuffer()).slice(0)); } catch { /* ignore */ }
  }
  return undefined;
}

function connectCoroHaasIfNeeded(ctx: OfflineAudioContext, src: AudioNode, dest: AudioNode, isCoro: boolean, disableFx: boolean): void {
  if (!isCoro || disableFx) { src.connect(dest); return; }
  const monoIn = ctx.createGain(); monoIn.channelCount = 1; monoIn.channelCountMode = 'explicit';
  const delay = ctx.createDelay(0.05); delay.delayTime.value = 0.018;
  const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 280;
  const sL = ctx.createGain(), sR = ctx.createGain(), merge = ctx.createChannelMerger(2);
  sL.gain.value = 0.38; sR.gain.value = -0.38;
  src.connect(monoIn); monoIn.connect(merge, 0, 0); monoIn.connect(merge, 0, 1);
  monoIn.connect(delay); delay.connect(hpf); hpf.connect(sL); hpf.connect(sR);
  sL.connect(merge, 0, 0); sR.connect(merge, 0, 1); merge.connect(dest);
}

export async function scheduleOfflineVocalTracks(params: {
  fxCtx: OfflineAudioContext; allTracks: any[]; unrolledTracks: any[]; timing: BaqueCycleTimingResult;
  unrolledBpms: number[]; unrolledTimeSigs: string[]; voxTarget: AudioNode; revSendTarget: AudioNode;
  distSendTarget: AudioNode; globalSwing: any; vocalTransposeSteps: number; disableEq: boolean;
  disableFx: boolean; globalBypass: any; referencePitchHz?: number; ignoreGlobalPitch?: boolean;
}): Promise<void> {
  const {
    fxCtx, allTracks, unrolledTracks, timing, unrolledBpms, unrolledTimeSigs, voxTarget,
    revSendTarget, distSendTarget, globalSwing, vocalTransposeSteps, disableEq, disableFx, globalBypass,
    referencePitchHz, ignoreGlobalPitch,
  } = params;

  const voiceTracks = unrolledTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder || t.id === 999901 || String(t.id) === '999901') return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    return Boolean(inst && inst.type === 'voice' && !getEffectiveMuteState(allTracks, t.id));
  });
  if (voiceTracks.length === 0) return;

  try { await VocalRehydration.rehydrateVocalBuffers(allTracks); } catch { /* ignore */ }
  const audioState = useAudioStore.getState(), vocalMode = audioState.vocalMode || 'audio';
  const allowSamples = isSamplePlaybackAllowed(vocalMode), presetId = audioState.vocalPreset || 'guide';
  const toadaBus = allTracks.find((b) => isToadaBus(b));

  for (const track of voiceTracks) {
    const isCoro = instrumentsConfig[track.instrumentIdx]?.id === 'coro';
    const parents = toadaBus && String(toadaBus.id) !== String(track.id) ? [toadaBus] : [];
    const input = fxCtx.createGain(); input.gain.value = CONSOLE_HEADROOM_GAIN * multiplyPolarity(track, ...parents);
    const lowCut = fxCtx.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.Q.value = BUTTERWORTH_Q; lowCut.frequency.value = resolveLowCutTargetHz(track, disableEq);
    const eq = track.eqBands;
    const eqL = fxCtx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = eq?.low?.f ?? 100; eqL.gain.value = disableEq ? 0 : (eq?.low?.g ?? 0);
    const eqM = fxCtx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = eq?.mid?.f ?? 1000; eqM.Q.value = eq?.mid?.q === 'narrow' ? 2.5 : BUTTERWORTH_Q; eqM.gain.value = disableEq ? 0 : (eq?.mid?.g ?? 0);
    const eqH = fxCtx.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = eq?.high?.f ?? 8000; eqH.gain.value = disableEq ? 0 : (eq?.high?.g ?? 0);

    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(track.panVal ?? track.pan ?? 0);
    const panner = fxCtx.createStereoPanner(); panner.pan.value = acousticPan;
    const effDb = faderPositionToDb(getEffectiveVolume(allTracks, track.id));
    const fader = fxCtx.createGain();
    fader.gain.value = Number.isFinite(effDb) && effDb > -90 ? Math.pow(10, Math.min(12, effDb + panCompensationDb) / 20) : 0;

    if (!isAutomationBypassed(track, 'volume', globalBypass) && hasActiveTrackAutomation(track, 'volume') && track.measureVols?.length) {
      const busScale = (track.volumeVal ?? 75) > 0 ? faderPositionToGain(getEffectiveVolume(allTracks, track.id)) / Math.max(0.0001, faderPositionToGain(track.volumeVal ?? 75)) : 1;
      for (let m = 0; m < timing.totalMeasures; m++) {
        const db = faderPositionToDb(track.measureVols[m] ?? (track.volumeVal ?? 75));
        fader.gain.setValueAtTime(Number.isFinite(db) && db > -90 ? Math.pow(10, Math.min(12, db + panCompensationDb) / 20) * busScale : 0, timing.measureStartsSec[m]);
      }
    }

    input.connect(lowCut); lowCut.connect(eqL); lowCut.connect(eqM); eqM.connect(eqH); eqH.connect(panner); panner.connect(fader); fader.connect(voxTarget);
    if (!disableFx) {
      const revG = computeEffectiveAuxSendLinearGain(allTracks, track.id, 'reverb', false);
      if (revG > 1e-6) { const rs = fxCtx.createGain(); rs.gain.value = revG; input.connect(rs); rs.connect(revSendTarget); }
      const distG = computeEffectiveAuxSendLinearGain(allTracks, track.id, 'distortion', false);
      if (distG > 1e-6) { const ds = fxCtx.createGain(); ds.gain.value = distG; input.connect(ds); ds.connect(distSendTarget); }
    }

    for (let m = 0; m < timing.totalMeasures; m++) {
      const ptn = track.patterns?.find((p: any) => p.measureAssignments?.[m]);
      if (!ptn) continue;
      const sig = unrolledTimeSigs[m] || '4/4', curBpm = unrolledBpms[m] || timing.bpm;
      const phrase = resolveVocalPhraseInfo({ pattern: ptn, measureIdx: m, beatsPerMeasure: getBeatsPerMeasure(sig), isSolo: false, soloMeasureCounter: 0 });
      const rawBuf = allowSamples && isVocalSamplePattern(ptn) ? await resolveOfflinePatternVocalBuffer(fxCtx, track.id, ptn) : undefined;

      if (rawBuf && phrase.isBlockStart) {
        const clip = ptn.vocalClip, recBpm = Number(clip?.recordedBpm || clip?.sampleBpm || clip?.baseBpm || ptn.vocalBaseBpm || curBpm);
        const packTr = Number(ptn.packTranspositionSemitones ?? clip?.packTranspositionSemitones ?? 0);
        const targetTr = Math.round(Number((ptn as any).vocalTransposeSteps ?? vocalTransposeSteps ?? 0) + Math.round((track.tuning ?? 0) * 12));
        const dsp = getOrComputeVocalPatternDspSync(`${track.id}_${ptn.id}`, rawBuf, recBpm, curBpm, targetTr, packTr, {
          t1OffsetSec: clip?.t1OffsetSec, trimStartSec: clip?.trimStartSec, trimEndSec: clip?.trimEndSec,
        });
        const tCalc = VocalTimingCalculator.calculateTiming({
          clip, ptnRef: ptn, voiceTrack: track, effectiveBpm: curBpm, measureStartTime: timing.measureStartsSec[m], sequencerStore: { bpm: curBpm, measureBpms: unrolledBpms, globalSwing },
        });
        const when = clip?.t1OffsetSec !== undefined
          ? timing.measureStartsSec[m] + (dsp.scaledTrimStartSec - dsp.scaledT1OffsetSec) + (tCalc.nudgeMs / 1000) + tCalc.balancoOffset
          : tCalc.triggerTime;
        const trimStart = Math.max(0, dsp.scaledTrimStartSec);
        const trimEnd = dsp.scaledTrimEndSec > trimStart && dsp.scaledTrimEndSec <= dsp.audioBuffer.duration ? dsp.scaledTrimEndSec : dsp.audioBuffer.duration;
        const src = fxCtx.createBufferSource(); src.buffer = dsp.audioBuffer;
        connectCoroHaasIfNeeded(fxCtx, src, input, isCoro, disableFx);
        if (when >= 0) src.start(when, trimStart, Math.max(0.05, trimEnd - trimStart));
        else {
          const offset = Math.min(trimStart + Math.abs(when), Math.max(trimStart, trimEnd - 0.05));
          if (trimEnd - offset > 0.01) src.start(0, offset, trimEnd - offset);
        }
      }
      if (vocalMode === 'synth' || vocalMode === 'both' || !rawBuf) {
        scheduleOfflineVocalSynthForMeasure({ ctx: fxCtx, dest: input, track, pattern: ptn, measureIdx: m, timing, timeSig: sig, bpm: curBpm, globalSwing, presetId, referencePitchHz, ignoreGlobalPitch });
      }
    }
  }
}
