// @ts-ignore — exécuté via npx vitest
import { describe, it, expect } from 'vitest';
import {
  APITO_NATURAL_STOP_FADE_SEC,
  APITO_SAFETY_CHOKE_SEC,
  APITO_TONGUE_FADE_SEC,
  computeApitoPreCutSpec,
  planApitoBreathCutsFromLookahead,
} from '../apitoBreathCutPlanner';
import { resolveFallbackApitoHoldSpec, stageWorkletApitoPreCutEvents } from '../apitoFallbackHoldResolver';
import { analyzeBarulhoLoopRegion, bakeBarulhoChannelPcm } from '../barulhoLoopRegionAnalyzer';
import { BarulhoLookaheadPoint, packBarulhoOriginCoord, resolveSlashFadeOutRampSec } from '../barulhoRampPlanner';
import { resolveFrankStrokeBarulhoChokeSec } from '../../engine/selectiveTrackChokePhysics';
import { VOICE_STATE_FREE, WorkletSampleEntry } from '../../worklet/percussionWorkletTypes';
import { processWorkletDspBlock } from '../../worklet/processor/workletDspKernel';
import { WorkletEventQueue } from '../../worklet/processor/workletEventQueue';
import { BARULHO_OP_ATTACK_B, CHOKE_APITO_20MS, VOICE_CLASS_GENERIC, packWorkletEventFlags } from '../../worklet/processor/workletEventFlags';
import { WorkletVoicePoolSoa } from '../../worklet/processor/workletVoicePoolSoa';
import { evalOfflineBarulhoGainAt, scheduleApitoOfflinePreCutIfAny } from '../../../utils/baqueBounceBarulhoHelpers';

const SR = 48000;

function makeApitoLongSample(): WorkletSampleEntry {
  const len = Math.round(1.6 * SR), raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = Math.sin(2 * Math.PI * 2800 * (i / SR)) * 0.7;
  const reg = analyzeBarulhoLoopRegion(raw, SR), baked = bakeBarulhoChannelPcm(raw, reg);
  return {
    ch0: baked, ch1: null, length: baked.length, sampleRate: SR,
    bodyStartFrame: reg.bodyStartFrame, loopResumeFrame: reg.loopResumeFrame, loopWrapFrame: reg.loopWrapFrame,
  };
}

describe('LOT 3.2 — Pré-Coupure « Coup de Langue » du Sifflet Long L d’Apito (Worklet, Fallback & Bounce)', () => {
  it('calcule preCutSec = min(0.044, stepDur * 0.32), fondu 12 ms (~32 ms de silence avant c/C/L), 14 ms sur / et 6 ms safety choke', () => {
    // Tempo 96 BPM (double-croche = 0.15625 s) : preCutSec = 0.044 s, fondu 12 ms -> silence complet 32 ms avant c
    const normal = computeApitoPreCutSpec(0, 0.3125, 0.15625);
    expect(normal.preCutSec).toBeCloseTo(0.044, 6);
    expect(normal.fadeDurationSec).toBeCloseTo(APITO_TONGUE_FADE_SEC, 6);
    expect(normal.fadeStartSec).toBeCloseTo(0.3125 - 0.044, 6);
    expect(normal.silentBeforeAttackSec).toBeCloseTo(0.032, 6);

    // Tempo rapide (pas = 0.100 s) : preCutSec = 0.032 s sans manger l'attaque de L
    const fast = computeApitoPreCutSpec(0, 0.100, 0.100);
    expect(fast.preCutSec).toBeCloseTo(0.032, 6);
    expect(fast.fadeStartSec).toBeCloseTo(0.068, 6);
    expect(fast.silentBeforeAttackSec).toBeCloseTo(0.020, 6);

    // Arrêt sur '/' = 14 ms, choke de sécurité = 6 ms
    const slashPts: BarulhoLookaheadPoint[] = [
      { trackId: 9, instId: 'apito', timeSec: 0, symbol: 'L', velocity: 0.9 },
      { trackId: 9, instId: 'apito', timeSec: 0.30, symbol: '/', velocity: 0 },
    ];
    expect(resolveSlashFadeOutRampSec(slashPts, 1)).toBeCloseTo(APITO_NATURAL_STOP_FADE_SEC, 6);
    expect(resolveFrankStrokeBarulhoChokeSec('apito', 'C')).toBeCloseTo(APITO_SAFETY_CHOKE_SEC, 6);

    // Fallback Web Audio : L suivi de C au pas suivant -> fondu 12 ms avant C ; L suivi de / -> fondu 14 ms
    const fbBeforeC = resolveFallbackApitoHoldSpec(['L', 'C', 0, 0], 0, 0.15625);
    expect(fbBeforeC.fadeOutSec).toBeCloseTo(0.012, 6);
    expect(0.15625 - (fbBeforeC.holdDurSec + fbBeforeC.fadeOutSec)).toBeCloseTo(0.032, 6);
    const fbBeforeSlash = resolveFallbackApitoHoldSpec(['L', 0, '/', 0], 0, 0.15625);
    expect(fbBeforeSlash.fadeOutSec).toBeCloseTo(0.014, 6);
  });

  it('éteint totalement L ~32 ms avant C dans le noyau DSP AudioWorklet ET dans l’enveloppe Offline Bounce', () => {
    const tNext = 0.3125;
    const pts: BarulhoLookaheadPoint[] = [
      { trackId: 7, instId: 'apito', timeSec: 0, symbol: 'L', velocity: 0.9, stepDurationSec: 0.15625, originCoord: packBarulhoOriginCoord(0, 0), seqId: 1 },
      { trackId: 7, instId: 'apito', timeSec: tNext, symbol: 'C', velocity: 0.95, stepDurationSec: 0.15625, originCoord: packBarulhoOriginCoord(0, 2), seqId: 1 },
    ];

    // 1. AudioWorklet DSP : L démarre à t=0, pré-coupure planifiée automatiquement avant C
    const staged: number[] = [
      0, 7, 0, 0, 0.9, 1.0, packBarulhoOriginCoord(0, 0), 1.0,
      packWorkletEventFlags(1, CHOKE_APITO_20MS, VOICE_CLASS_GENERIC, true, false, BARULHO_OP_ATTACK_B),
    ];
    stageWorkletApitoPreCutEvents({
      seqId: 1, measureStartSec: 0, measureEndSec: 1.0, sampleRate: SR, currentFrame: 0, minRebuildFrame: 0,
      lookaheadPoints: pts, coveredTrackIds: new Set([7]), getTrackSlot: () => 0, stagedEvents: staged,
    });
    expect(staged.length).toBe(18); // 2 événements Worklet (L puis pré-coupure 12 ms)

    const queue = new WorkletEventQueue(), pool = new WorkletVoicePoolSoa(), samples = [makeApitoLongSample()];
    queue.pushPackedEvents(new Float64Array(staged), 2);
    const outL = new Float32Array(128), outR = new Float32Array(128), outputs = [[outL, outR]];
    const muted = new Uint8Array(4), pitch = new Float32Array([1, 1, 1, 1]), decay = new Float32Array([1, 1, 1, 1]);

    // Avance jusqu'à tNext - 25 ms (après la fin du fondu à tNext - 32 ms, bien avant l'attaque de C à tNext)
    const targetCheckFrame = Math.floor((tNext - 0.025) * SR);
    let frame = 0;
    while (frame < targetCheckFrame) {
      outL.fill(0); outR.fill(0);
      processWorkletDspBlock(outputs, frame, SR, queue, pool, samples, muted, pitch, decay);
      frame += 128;
    }
    expect(pool.voiceState.every((s) => s === VOICE_STATE_FREE)).toBe(true);

    // 2. Bounce Offline : enveloppe linéaire GainNode atteint 0.0 à tNext - 32 ms
    const cuts = planApitoBreathCutsFromLookahead(pts);
    const mockVoice: any = {
      trackId: 7, instId: 'apito', segs: [{ t: 0, g: 0.85 }], originCoord: packBarulhoOriginCoord(0, 0), zeroStopTime: null,
      gainNode: { gain: { cancelScheduledValues: () => {}, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } },
    };
    scheduleApitoOfflinePreCutIfAny(mockVoice, cuts, 0, 2.0);
    expect(evalOfflineBarulhoGainAt(mockVoice.segs, tNext - 0.050)).toBeCloseTo(0.85, 4);
    expect(evalOfflineBarulhoGainAt(mockVoice.segs, tNext - 0.031)).toBeCloseTo(0, 5);
  });
});
