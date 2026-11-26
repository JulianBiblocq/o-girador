// @ts-ignore
import { describe, expect, it, vi } from 'vitest';
import { getTrackedElementAnimation, getTrackedSlotCount, trackElementAnimation } from '../../../audio/animations/waapiAnimTracker';
import { composeRodaMeasureLayers, computeSweepSectorPlan } from '../composeRodaMeasureLayers';
import { computeNeedlePhaseDriftMs } from '../useCircleNeedleWaapi';

function makeMockAnim(label: string) {
  return { label, currentTime: 0, playState: 'running', onfinish: null as (() => void) | null, cancel: vi.fn(), pause: vi.fn(), play: vi.fn() } as unknown as Animation;
}

describe('Measure Ring Layer sans baisse Porter-Duff, Aiguille WAAPI infinie & Promotion queued -> active', () => {
  it('coupe net sur frontières multi-signatures (4/4 <-> 2/4, 6/8) et maintient 100 % d’opacité hors balai en sweep6h', () => {
    expect(computeSweepSectorPlan({
      isPlayheadActive: true, playheadRatio: 0.68, rodaSweepMode: 'sweep6h',
      currTimeSig: '4/4', nextTimeSig: '2/4', prevTimeSig: '4/4', hasPrevMeasure: true, isNextSlotReady: true, isPrevSlotReady: true,
    }).mode).toBe('single');
    expect(computeSweepSectorPlan({
      isPlayheadActive: true, playheadRatio: 0.22, rodaSweepMode: 'sweep6h',
      currTimeSig: '6/8', nextTimeSig: '6/8', prevTimeSig: '4/4', hasPrevMeasure: true, isNextSlotReady: true, isPrevSlotReady: true,
    }).mode).toBe('single');

    const plan = computeSweepSectorPlan({
      isPlayheadActive: true, playheadRatio: 0.70, rodaSweepMode: 'sweep6h',
      currTimeSig: '4/4', nextTimeSig: '4/4', prevTimeSig: '4/4', hasPrevMeasure: true, isNextSlotReady: true, isPrevSlotReady: true,
    });
    expect(plan.mode).toBe('sweepNext');
    const totalRad = (plan.leadEndAngle - plan.leadStartAngle) + (plan.wedgeEndAngle - plan.wedgeStartAngle) + (plan.trailEndAngle - plan.trailStartAngle);
    expect(totalRad).toBeCloseTo(Math.PI * 2, 5);

    const alphas: number[] = [];
    let drawImageCalls = 0;
    const ctx: any = {
      save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), arc: vi.fn(), closePath: vi.fn(), clip: vi.fn(),
      set globalAlpha(v: number) { alphas.push(v); }, get globalAlpha() { return 1; },
      drawImage: () => { drawImageCalls += 1; },
    };
    const fakeSlot = (m: number) => ({ canvas: {} as any, ctx: null, measureIdx: m, timeSig: '4/4', key: `k${m}` });
    composeRodaMeasureLayers({
      ctx, canvasPx: 1200, scaleFactor: 1,
      pool: { prev: fakeSlot(0), curr: fakeSlot(1), next: fakeSlot(2), toada: fakeSlot(-1), hasToadaContent: false, lastCurrMeasureIdx: 1 },
      isPlayheadActive: true, playheadRatio: 0.70, rodaSweepMode: 'sweep6h', measureIdx: 1, nextMeasureIdx: 2, prevMeasureIdx: 0, hasPrevMeasure: true,
      currTimeSig: '4/4', nextTimeSig: '4/4', prevTimeSig: '4/4', visibleTracks: [], rawTracks: [], dynamicScale: 1, isEco: true,
      isLeftHanded: false, soloId: null, themeWood: '#8b2a1a', themeBorder: '#1a1a1a', themeText: '#1a1a1a',
    });
    expect(drawImageCalls).toBe(2);
    expect(alphas.every((a) => a === 1)).toBe(true);
  });

  it('promeut queued -> active dans onfinish sans muter el.style.transform et recale l’aiguille seulement au-delà de 12 ms', () => {
    const el = { style: { transform: 'INIT_POSE', opacity: '1' } } as unknown as Element;
    const stale = makeMockAnim('stale');
    const anim1 = makeMockAnim('beat4_rebound');
    const anim2 = makeMockAnim('beat1_impact');

    trackElementAnimation(el, stale, { finalTransform: 'STALE_POSE' });
    trackElementAnimation(el, anim1, { finalTransform: 'REST_1' });
    trackElementAnimation(el, anim2, { isQueued: true, delayMs: 40, finalTransform: 'REST_2' });
    expect(getTrackedSlotCount(el)).toBe(2);

    (stale.onfinish as any)?.();
    expect((el as any).style.transform).toBe('INIT_POSE');

    (anim1.onfinish as any)?.();
    expect((el as any).style.transform).toBe('INIT_POSE');
    expect((anim1 as any).cancel).toHaveBeenCalledTimes(1);
    expect(getTrackedSlotCount(el)).toBe(1);
    expect(getTrackedElementAnimation(el)).toBe(anim2);

    (anim2.onfinish as any)?.();
    expect((el as any).style.transform).toBe('REST_2');
    expect(getTrackedSlotCount(el)).toBe(0);

    expect(computeNeedlePhaseDriftMs(5008, 2000, 0.5, 12)).toBe(0);
    expect(computeNeedlePhaseDriftMs(4980, 2000, 0.5, 12)).toBeCloseTo(20, 4);
  });
});
