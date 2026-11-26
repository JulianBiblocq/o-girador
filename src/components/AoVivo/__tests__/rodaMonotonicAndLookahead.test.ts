// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it } from 'vitest';
import {
  drainVisualLoopAtTime,
  flushVisualBuffers,
  getLockedOutputLatencySec,
  getLockedVisualDelaySec,
  lockVisualOutputLatency,
  purgeVisualTickBuffer,
  pushVisualTick,
  subscribeToLookaheadTick,
  subscribeToTick,
  subscribeToVisualFrame,
  unsubscribeFromLookaheadTick,
  unsubscribeFromTick,
  unsubscribeFromVisualFrame,
} from '../../../audio/visualTickBuffer';
import { clearFreeze, freezeAt } from '../../../hooks/audio-sync/frozenPlaybackState';
import { computeMonotonicMeasureProgress, createMonotonicProgressTracker } from '../../circle-sequencer/computeStickAngle';

describe('Roda Fluidité — Verrouillage outputLatency, Monotonie Intra-Mesure & Canal 85ms', () => {
  beforeEach(() => {
    flushVisualBuffers();
    clearFreeze();
  });

  it('verrouille outputLatency au Play et garantit une progression Roda strictement monotone sans saut mi-mesure', () => {
    let hwLat = 0.042;
    const mockCtx = { get outputLatency() { return hwLat; } } as AudioContext;
    expect(lockVisualOutputLatency(mockCtx)).toBeCloseTo(0.042, 5);
    hwLat = 0.068; // oscillation matérielle WASAPI/AAudio en plein jeu -> ignorée tant qu'on ne relock pas
    expect(getLockedOutputLatencySec()).toBeCloseTo(0.042, 5);
    expect(getLockedVisualDelaySec()).toBeGreaterThanOrEqual(0.042);

    const tracker = createMonotonicProgressTracker();
    const live = {
      step: 12, measure: 0, maxTicks: 96, ratio: 12 / 96, iteration: 1,
      time: 10.3, measureStartTime: 10.0, measureDuration: 2.0, measureSeqId: 1,
    };
    const p1 = computeMonotonicMeasureProgress(live, true, 10.50, tracker);
    const pJitterBack = computeMonotonicMeasureProgress(live, true, 10.48, tracker);
    expect(p1).toBeCloseTo(0.25, 5);
    expect(pJitterBack).toBe(p1);

    // Changement de BPM mi-mesure (2.0s -> 1.6s à progress = 0.5) : 0 saut d'angle
    const pMid = computeMonotonicMeasureProgress(live, true, 11.0, tracker);
    expect(pMid).toBeCloseTo(0.5, 5);
    live.measureDuration = 1.6;
    live.measureStartTime = 11.0 - pMid * 1.6;
    expect(computeMonotonicMeasureProgress(live, true, 11.0, tracker)).toBeCloseTo(0.5, 5);

    // Pause Hard Freeze & Stop 12h
    freezeAt({ measure: 2, step: 6, totalSteps: 16, progress: 0.375, tick: 36, maxTicks: 96, iteration: 1, loopIteration: 1 });
    expect(computeMonotonicMeasureProgress(live, false, 11.2, tracker)).toBeCloseTo(0.375, 5);
    clearFreeze();
    expect(computeMonotonicMeasureProgress({ ...live, step: -1 }, false, 11.2, tracker)).toBe(0);
  });

  it('ordonne Lookahead (+85ms) -> Audible (0ms) -> VisualFrame dans la même trame VSync et purge proprement', () => {
    const log: string[] = [];
    const onLook = (e: any) => log.push(`look:${e.step}`);
    const onAud = (e: any) => log.push(`aud:${e.step}`);
    const onFrame = () => log.push('frame');
    subscribeToLookaheadTick(onLook);
    subscribeToTick(onAud);
    subscribeToVisualFrame(onFrame);

    pushVisualTick({ drawTime: 5.00, step: 0, measure: 0, maxTicks: 96, ratio: 0, visualStep16: 0, visualStep12: 0, time: 5.00, iteration: 1 });
    pushVisualTick({ drawTime: 5.07, step: 1, measure: 0, maxTicks: 96, ratio: 1 / 96, visualStep16: 0, visualStep12: 0, time: 5.07, iteration: 1 });

    drainVisualLoopAtTime(4.99);
    expect(log).toEqual(['look:0', 'look:1', 'frame']);

    log.length = 0;
    drainVisualLoopAtTime(5.01);
    expect(log).toEqual(['aud:0', 'frame']);

    purgeVisualTickBuffer();
    log.length = 0;
    drainVisualLoopAtTime(5.20);
    expect(log).toEqual(['frame']);

    unsubscribeFromLookaheadTick(onLook);
    unsubscribeFromTick(onAud);
    unsubscribeFromVisualFrame(onFrame);
  });
});
