// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAgbeKeyframes, resetAgbePostureMemory } from '../../../audio/animations/agbeKeyframes';
import { generateAlfaiaPredictiveKeyframes, getHandMemory, resetHandPostureMemory } from '../../../audio/animations/alfaiaKinematics';
import { computeElasticImpactTiming } from '../../../audio/animations/aoVivoBallisticMath';
import { generateMineiroKeyframes, resetMineiroPostureMemory } from '../../../audio/animations/mineiroKeyframes';
import { generateTimbalPredictiveKeyframes } from '../../../audio/animations/timbalKinematics';
import {
  cancelTrackedElementAnimation,
  getTrackedSlotCount,
  pauseTrackedElementAnimations,
  resumeTrackedElementAnimations,
  runClockSyncedWaapi,
} from '../aoVivoWaapiClockSync';

function createSlotElement() {
  const instances: any[] = [];
  const getAnimationsSpy = vi.fn(() => []);
  const el = {
    style: { transform: '', opacity: '' },
    getAnimations: getAnimationsSpy,
    animate: vi.fn((_kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      const anim: any = {
        currentTime: 0, playState: 'running', opts, onfinish: null,
        pause: vi.fn(() => { anim.playState = 'paused'; }),
        play: vi.fn(() => { anim.playState = 'running'; }),
        cancel: vi.fn(() => { anim.playState = 'idle'; }),
      };
      instances.push(anim);
      return anim;
    }),
  } as unknown as HTMLElement;
  return { el, instances, getAnimationsSpy };
}

describe('Ao Vivo — Double-Slot WAAPI sans Fuite & Cinématique Balistique Élastique', () => {
  beforeEach(() => {
    resetHandPostureMemory();
    resetMineiroPostureMemory();
    resetAgbePostureMemory();
  });

  it('maintient strictement <= 2 slots WAAPI [active, queued], annule sur onfinish/3e coup et gère Pause/Resume/Stop', () => {
    const { el, instances, getAnimationsSpy } = createSlotElement();
    const kf: Keyframe[] = [
      { transform: 'translateY(0px)', offset: 0 },
      { transform: 'translateY(-40px)', offset: 0.2 },
      { transform: 'translateY(-5px)', offset: 1 },
    ];

    const a1 = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 200, deltaMs: 0 })!;
    expect(getTrackedSlotCount(el)).toBe(1);

    const a2 = runClockSyncedWaapi({ el, keyframes: kf, durationMs: 200, deltaMs: -60 }) as any;
    expect(getTrackedSlotCount(el)).toBe(2);
    expect(a1.playState).toBe('running');
    expect(a2.opts).toMatchObject({ delay: 60, fill: 'forwards' });

    pauseTrackedElementAnimations(el);
    expect(a1.playState).toBe('paused');
    expect(a2.playState).toBe('paused');
    resumeTrackedElementAnimations(el);
    expect(a1.playState).toBe('running');
    expect(a2.playState).toBe('running');

    a2.currentTime = 75;
    runClockSyncedWaapi({ el, keyframes: kf, durationMs: 200, deltaMs: -50 });
    expect(a1.cancel).toHaveBeenCalledTimes(1);
    expect(getTrackedSlotCount(el)).toBe(2);

    instances[1].onfinish?.();
    instances[2].onfinish?.();
    expect(getTrackedSlotCount(el)).toBe(0);
    expect(el.style.transform).toBe('translateY(-5px)');
    cancelTrackedElementAnimation(el);
    expect(getAnimationsSpy).not.toHaveBeenCalled();
  });

  it('éradique le plateau plat sur les coups ouverts tout en préservant Timbal S/P, Alfaia Abafado A, Mineiro et Agbê V', () => {
    const t = computeElasticImpactTiming(200);
    expect(t.tCushionMs).toBeGreaterThan(t.tImpactMs);

    const alfaiaOpen = generateAlfaiaPredictiveKeyframes('D', false, 'macaneta', 'strong', 225);
    const impIdx = alfaiaOpen.findIndex((k) => k.offset === computeElasticImpactTiming(225).impactOff);
    expect(alfaiaOpen[impIdx].transform).not.toBe(alfaiaOpen[impIdx + 1].transform);

    const abafado = generateAlfaiaPredictiveKeyframes('A', true, 'bacalhau', 'strong', 225, false);
    expect(abafado[abafado.length - 1].transform).toBe(abafado[abafado.length - 2].transform);
    expect(getHandMemory(true).posture).toBe('pressed_skin');

    const timbalSlap = generateTimbalPredictiveKeyframes('S', false, 'aberto', 225, 'none', 'a', true, 160);
    const endYMatch = String(timbalSlap[timbalSlap.length - 1].transform).match(/translate3d\([^,]+,\s*(-?\d+)px/);
    expect(Number(endYMatch?.[1])).toBeGreaterThan(300); // reste bas près d'Aberto (376px - 14px = 362px), jamais 300px plus haut

    const timbalPreso = generateTimbalPredictiveKeyframes('P', false, 'aberto', 240, 'none', 'A', false, 240);
    expect(timbalPreso[1].transform).toBe(timbalPreso[2].transform);

    const minP = generateMineiroKeyframes('P', 'backWeak', false, 200);
    expect(minP[1].transform).not.toBe(minP[2].transform);
    const minNext = generateMineiroKeyframes('p', 'frontStrong', false, 160);
    expect(minNext[0].transform).toBe(minP[minP.length - 1].transform);

    const agbeVolta = generateAgbeKeyframes('V', 100, 'D', false, 225);
    expect(agbeVolta[1].transform).not.toBe(agbeVolta[2].transform);
  });
});
