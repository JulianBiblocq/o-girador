// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeBarulhoStepPlan,
  isBarulhoRollActive,
  resetBarulhoRollState,
} from '../../../audio/animations/barulhoRollPlanner';
import { computeAoVivoHitLeadMs } from '../aoVivoHitTiming';
import { dispatchAlfaiaPredictiveStroke } from '../alfaiaLookaheadHelper';
import { dispatchCaixaPredictiveStroke } from '../caixaLookaheadHelper';
import { dispatchTimbalPredictiveStroke } from '../timbalLookaheadHelper';
import { dispatchAgbe, dispatchGongue, dispatchMineiro } from '../aoVivoOtherDispatchers';
import { stopGongueTwoNodeAnimation } from '../../../audio/animations/gongueKinematics';
import { MineiroPole } from '../../../audio/animations/configMineiro';

function createMockAnimSvg() {
  const calls: Array<{ frames: Keyframe[]; opts: KeyframeAnimationOptions }> = [];
  const active: Array<{ cancel: () => void }> = [];
  const makeChild = () => ({
    style: { transform: '', opacity: '' },
    getAttribute: () => '1',
    getAnimations: () => [],
    animate: vi.fn(() => ({ cancel: vi.fn() })),
  });
  const el = {
    style: { transform: '', transition: '', transformOrigin: '' },
    getAnimations: () => active.slice(),
    querySelector: () => makeChild(),
    querySelectorAll: () => [],
    animate: vi.fn((frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      calls.push({ frames, opts });
      const anim = { cancel: vi.fn(() => { const i = active.indexOf(anim); if (i >= 0) active.splice(i, 1); }) };
      active.push(anim);
      return anim;
    }),
  } as unknown as SVGSVGElement;
  return { el, calls };
}

describe('Ao Vivo — Synchronisation Temporelle hitTime & Continuité du Barulho (B, b, /, .)', () => {
  beforeEach(() => {
    resetBarulhoRollState();
    stopGongueTwoNodeAnimation();
  });

  it('computes exact compensated leadMs from lookahead + outputLatency + bluetoothVisualOffsetSec without post-impact lag', () => {
    // 100ms lookahead + 50ms outputLatency + 0ms BT => 150ms avant l'impact audible réel
    expect(computeAoVivoHitLeadMs({ time: 10.2 }, 0, 10.1, 0.05, 0)).toBe(150);

    // Avec +120ms d'offset Bluetooth => 270ms avant l'impact audible réel
    expect(computeAoVivoHitLeadMs({ time: 10.2 }, 0, 10.1, 0.05, 0.12)).toBe(270);

    // Déjà à l'instant de l'impact compensé (ctxTime >= hitTime) => 0ms (aucun retard post-impact)
    expect(computeAoVivoHitLeadMs({ time: 10.2 }, 0, 10.26, 0.05, 0)).toBe(0);
  });

  it('plans start -> continue (ramp & weak b) -> stop across B / / b . and bounded 1-step on B 0', () => {
    const seq = ['B', '/', 'b', '.'];
    const p0 = consumeBarulhoStepPlan('alfaia', 'B', seq, 0, false);
    expect(p0).toMatchObject({ action: 'start', sustain: true, amplitude: 1 });
    expect(isBarulhoRollActive('alfaia')).toBe(true);

    const p1 = consumeBarulhoStepPlan('alfaia', '/', seq, 1, false);
    expect(p1.action).toBe('continue');
    expect(p1.sustain).toBe(true);
    expect(p1.amplitude).toBeGreaterThan(0.6);
    expect(p1.amplitude).toBeLessThan(1);

    const p2 = consumeBarulhoStepPlan('alfaia', 'b', seq, 2, false);
    expect(p2).toMatchObject({ action: 'continue', sustain: true, amplitude: 0.6 });

    const p3 = consumeBarulhoStepPlan('alfaia', '.', seq, 3, false);
    expect(p3.action).toBe('stop');
    expect(isBarulhoRollActive('alfaia')).toBe(false);

    const single = consumeBarulhoStepPlan('caixa', 'B', ['B', '0'], 0, false);
    expect(single).toMatchObject({ action: 'start', sustain: false, amplitude: 1 });
    expect(isBarulhoRollActive('caixa')).toBe(false);
  });

  it('delays skin roll until hitTime (leadMs) and maintains continuous roll on all 7 families without re-windup', () => {
    const steps = ['B', '/', 'b', '.'];
    const geom = { targetX: 100, targetY: 100 };

    for (const fam of ['alfaia', 'caixa', 'tarol', 'timbal', 'agbe', 'mineiro'] as const) {
      resetBarulhoRollState();
      const left = createMockAnimSvg(), right = createMockAnimSvg();
      const lRef = { current: null as Animation | null }, rRef = { current: null as Animation | null };
      const poleRef = { current: 'backWeak' as MineiroPole };

      const fire = (idx: number, leadMs: number) => {
        const s = steps[idx];
        if (fam === 'alfaia') dispatchAlfaiaPredictiveStroke(null, s, false, false, false, steps, idx, 150, left.el, right.el, null, lRef, rRef, geom, leadMs);
        else if (fam === 'caixa' || fam === 'tarol') dispatchCaixaPredictiveStroke(fam, s, false, false, false, steps, idx, 150, left.el, right.el, null, lRef, rRef, geom, leadMs);
        else if (fam === 'timbal') dispatchTimbalPredictiveStroke(s, false, false, false, steps, idx, 150, left.el, right.el, null, lRef, rRef, geom, leadMs);
        else if (fam === 'agbe') dispatchAgbe(s, false, left.el as unknown as SVGGElement, lRef, steps[(idx + 1) % 4], steps, idx, 150, false, leadMs);
        else dispatchMineiro(s, false, left.el, poleRef, lRef, false, steps, idx, 150, false, leadMs);
      };

      // Step 0 ('B') avec leadMs = 140ms : approche pendant 140ms, roulement continu calé exactement à delay = 140ms
      fire(0, 140);
      expect(left.calls.length).toBe(2);
      expect(left.calls[0].opts).toMatchObject({ duration: 140, iterations: 1 });
      expect(left.calls[1].opts).toMatchObject({ delay: 140, iterations: Infinity });

      // Step 1 ('/') & Step 2 ('b') : maintien sur peau sans reprise d'élan aérienne
      fire(1, 0);
      fire(2, 0);
      const contCall = left.calls[left.calls.length - 1];
      expect(contCall.opts.iterations).toBe(Infinity);

      // Step 3 ('.') : arrêt propre au hitTime (delay = 90ms) et retour repos
      fire(3, 90);
      const stopCall = left.calls[left.calls.length - 1];
      expect(stopCall.opts).toMatchObject({ delay: 90, iterations: 1, fill: 'forwards' });
      expect(isBarulhoRollActive(fam)).toBe(false);
    }

    // Gonguê (7e famille, moteur 2-nœuds RAF)
    resetBarulhoRollState();
    const gongueSvg = { querySelector: () => null, style: {} } as unknown as SVGSVGElement;
    dispatchGongue('B', false, false, false, steps, 0, 150, gongueSvg, { current: null }, null, geom, 120);
    expect(isBarulhoRollActive('gongue')).toBe(true);
    dispatchGongue('/', false, false, false, steps, 1, 150, gongueSvg, { current: null }, null, geom, 0);
    expect(isBarulhoRollActive('gongue')).toBe(true);
    dispatchGongue('.', false, false, false, steps, 3, 150, gongueSvg, { current: null }, null, geom, 80);
    expect(isBarulhoRollActive('gongue')).toBe(false);
    stopGongueTwoNodeAnimation();
  });
});
