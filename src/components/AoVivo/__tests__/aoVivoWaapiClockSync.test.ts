// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAlfaiaPredictiveKeyframes, getHandMemory, resetHandPostureMemory } from '../../../audio/animations/alfaiaKinematics';
import { computeBallisticDurationMs, computeImpactHoldTiming } from '../../../audio/animations/aoVivoBallisticMath';
import { findGongueLookahead } from '../../../audio/animations/gongueLookahead';
import { useTransportStore } from '../../../stores/useTransportStore';
import { getCachedCandidateAnglesForSweep } from '../../circle-sequencer/rodaTrackFrameCache';
import { findSameHandLookahead } from '../alfaiaSameHandLookahead';
import { computeAoVivoSwingAndMicroOffsetSec } from '../aoVivoHitTiming';
import { resolveAoVivoMeasureAndLookahead } from '../aoVivoMeasureLookahead';
import { runClockSyncedWaapi } from '../aoVivoWaapiClockSync';
import { findCaixaSameHandLookahead } from '../caixaSameHandLookahead';
import { findTimbalSameHandLookahead } from '../timbalSameHandLookahead';

function createMockElement() {
  const getAnimationsSpy = vi.fn(() => []);
  const el = {
    style: { transform: '', opacity: '' },
    getAnimations: getAnimationsSpy,
    animate: vi.fn((_kf: Keyframe[], opts: KeyframeAnimationOptions) => ({
      currentTime: 0,
      playState: 'running',
      opts,
      cancel: vi.fn(),
    })),
  } as unknown as HTMLElement;
  return { el, getAnimationsSpy };
}

describe('Ao Vivo — Balistique Invariante, Anti-Aliasing LTPO, Swing & Sous-Pas', () => {
  beforeEach(() => {
    resetHandPostureMemory();
  });

  it('maintient une durée balistique invariante (225ms/160ms), un maintien peau >= 34ms et une pose compacte sous 115ms', () => {
    expect(computeBallisticDurationMs(true, 180)).toBe(172);
    expect(computeBallisticDurationMs(true, 300)).toBe(225);
    expect(computeBallisticDurationMs(true, 750)).toBe(225);
    expect(computeBallisticDurationMs(false, 600)).toBe(160);
    expect(computeBallisticDurationMs(true, 75)).toBe(67);

    const timing225 = computeImpactHoldTiming(225);
    expect(timing225.tImpactMs).toBe(18);
    expect(timing225.tHoldEndMs - timing225.tImpactMs).toBe(34);

    // Sous 115ms (sous-pas / double-croche ultra-rapide), force `low_tucked` même avant un coup fort
    generateAlfaiaPredictiveKeyframes('D', false, 'macaneta', 'strong', 80, false, 90);
    expect(getHandMemory(false).posture).toBe('low_tucked');
  });

  it('gère les 4 branches de runClockSyncedWaapi sans jamais sauter le contact peau ni appeler getAnimations()', () => {
    const { el, getAnimationsSpy } = createMockElement();
    const animRef = { current: null as Animation | null };
    const kf: Keyframe[] = [
      { transform: 'translateY(64px)', offset: 0 },
      { transform: 'translateY(-110px)', offset: 18 / 225 },
      { transform: 'translateY(-107px)', offset: 52 / 225 },
      { transform: 'translateY(64px)', offset: 1 },
    ];

    // 1. Frappe swinguée dans le futur (deltaMs = -28ms) -> delay: 28, fill: 'both'
    const aSwing = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 225, deltaMs: -28, tImpactMs: 18, tHoldEndMs: 52, animRef }) as any;
    expect(aSwing.opts).toMatchObject({ duration: 225, delay: 28, fill: 'both' });
    expect(aSwing.currentTime).toBe(0);

    // 2. Jitter LTPO 30Hz (deltaMs = +34ms <= tHoldEnd + 12) -> clampé à tImpact + 6 = 24ms (contact peau garanti !)
    const aLtpo = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 225, deltaMs: 34, tImpactMs: 18, tHoldEndMs: 52, animRef }) as any;
    expect(aLtpo.currentTime).toBe(24);
    expect(aSwing.cancel).toHaveBeenCalledTimes(1);

    // 3. Retard intermédiaire hors maintien (deltaMs = 95ms < 0.85 * 225) -> currentTime = 95ms
    const aMid = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 225, deltaMs: 95, tImpactMs: 18, tHoldEndMs: 52, animRef }) as any;
    expect(aMid.currentTime).toBe(95);

    // 4. Frame expirée (deltaMs >= 0.85 * 225) -> ignorée + pose finale appliquée, 0 appel getAnimations()
    const expired = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 225, deltaMs: 200, tImpactMs: 18, tHoldEndMs: 52, animRef });
    expect(expired).toBeNull();
    expect(el.style.transform).toBe('translateY(64px)');
    expect(getAnimationsSpy).not.toHaveBeenCalled();
  });

  it('applique offset - 0.5 sur les sous-pas scindés et intègre measureBpms[nextMeasureIdx] dans realMsUntilNext', () => {
    const steps: any[] = [['D', 'd'], 'D', 0, 'D'];
    // Depuis la 2e croche du pas 0 (isSubStep = true), le pas 1 est à 0.5 * 150ms = 75ms (et non 150ms ni 0.5 * 75ms)
    expect(findSameHandLookahead(steps, 0, 150, true, true).msUntilNext).toBe(75);
    expect(findCaixaSameHandLookahead(steps, 0, 150, true, true).msUntilNext).toBe(75);
    expect(findTimbalSameHandLookahead([['G', 'g'], 'G'], 0, 150, true, true).msUntilNext).toBe(75);
    expect(findGongueLookahead([['G', 'g'], 'G'], 0, 150, true).msUntilNext).toBe(75);

    // Changement de tempo M0 (100 BPM = 150ms/pas) -> M1 (150 BPM = 100ms/pas) : pas 15 de M0 vers pas 1 de M1 = 150 + 100 = 250ms
    const trk = {
      id: 1, instrumentIdx: 0,
      patterns: [{ id: 10, steps: 16, activeSteps: [0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'D'], measureAssignments: { 0: true, 1: true } }],
    };
    const ctx = resolveAoVivoMeasureAndLookahead({
      activeTrack: trk, allTracks: [trk], measure: 0, ratio: 15 / 16, soloPlayId: null,
      state: { totalMeasures: 2, timeSig: '4/4', bpm: 100, measureBpms: [100, 150], isLooping: true, loopMode: 'infinite' },
    });
    const crossTempo = findSameHandLookahead(ctx.lookaheadSteps, 15, ctx.stepDurationMs, true, false, ctx.lookaheadDurationsMs);
    expect(crossTempo.msUntilNext).toBe(250);
  });

  it('calcule le Balanço déterministe + microtiming même sur piste mutée et met en cache les angles Roda', () => {
    const prevSwing = useTransportStore.getState().globalSwing;
    useTransportStore.getState().setGlobalSwing({ mode: 'custom', swingIntensity: 100, customOffsets: [0, 30, 0, -20] });
    const mutedTrack = { id: 7, instrumentIdx: 0, isMuted: true, balancoAmount: 100 };
    const pat = { id: 1, steps: 16, activeSteps: ['D', 'e', 'd', 'e'] };
    const offsetSec = computeAoVivoSwingAndMicroOffsetSec({
      effectivePattern: pat, concreteTrack: mutedTrack, stepInMeasure: 1, targetStep: 1,
      strokeIndex: 0, stepDurationSec: 0.2, currentSig: '4/4', effectiveMicrotimings: [0, 10, 0, 0],
    });
    // Swing (+30% * 0.1s = +0.03s) + Microtiming (+10% * 0.1s = +0.01s) = +0.04s exact même muté
    expect(offsetSec).toBeCloseTo(0.04, 5);
    useTransportStore.getState().setGlobalSwing(prevSwing);

    const a1 = [0, 1.57, 3.14], a2 = [0, 1.57, 3.14];
    const first = getCachedCandidateAnglesForSweep(7, a1, a2, [], true, 'sweep6h', true, false);
    const second = getCachedCandidateAnglesForSweep(7, a1, a2, [], true, 'sweep6h', true, false);
    expect(second).toBe(first);
  });
});
