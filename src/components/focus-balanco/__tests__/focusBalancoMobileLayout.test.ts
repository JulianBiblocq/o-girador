// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it } from 'vitest';
import {
  computeFocusPlayheadTransform,
  computeRelativeMorphPercent,
  computeStepCellWidthPx,
  resolveBeatsPerStripRow,
  resolveFocusCycleButtonLabel,
  shouldUseTwoRowBrickStrip,
} from '../focusBalancoLayoutMath';
import { applyFocusBalancoDomFrame } from '../updateFocusBalancoDomFrame';
import { FocusMeasureStepsModel } from '../focusBalancoTypes';

describe('FocusBalancoDrawer — Mobile 2-Row Layout & 0-100% Relative Scale', () => {
  it('always displays 0%-100% relative morph scale regardless of internal track nominalIntensityPct (50% / 36%)', () => {
    expect(computeRelativeMorphPercent(1)).toBe(100);
    expect(computeRelativeMorphPercent(0.5)).toBe(50);
    expect(computeRelativeMorphPercent(0)).toBe(0);

    const mockBadge = { textContent: '' } as HTMLSpanElement;
    const mockSlider = { value: '0' } as HTMLInputElement;
    const mockFill = { style: { transform: '' } } as unknown as HTMLDivElement;
    const mockThumb = { style: { left: '' } } as unknown as HTMLDivElement;
    const mockBrick = { style: { transform: '' } } as unknown as HTMLDivElement;
    const mockOffsetLbl = { textContent: '' } as HTMLSpanElement;
    const mockPlayhead = { style: { opacity: '', transform: '' } } as unknown as HTMLDivElement;

    const mdl: FocusMeasureStepsModel = {
      trackId: 1, trackName: 'Marcante', primaryColor: 'var(--cordel-accent)',
      contrastColor: 'var(--cordel-on-accent)', socketStrokeColor: 'var(--cordel-accent)',
      timeSig: '4/4', beatsCount: 4, stepCount: 16, presetName: 'Maracatu',
      nominalIntensityPct: 50,
      steps: [{
        stepIdx: 3, beatIdx: 0, subIdx: 3, beatSubCount: 4, isBeatStart: false,
        isActive: true, isSplit: false, isVariationStep: false, displaySymbol: 'E',
        fillColor: 'var(--cordel-accent)', textColor: 'var(--cordel-on-accent)',
        rightSymbol: '', rightFillColor: '', rightTextColor: '',
        nominalBalancoPct: -58, manualMicroPct: 0, baseNormPos: 3 / 16,
      }],
    };

    const refs = {
      stripWidthRef: { current: 360 },
      isTwoRowRef: { current: true },
      brickRefs: { current: [mockBrick] },
      tensionRefs: { current: [null] },
      flashRefs: { current: [null] },
      offsetLabelRefs: { current: [mockOffsetLbl] },
      playheadRef: { current: mockPlayhead },
      sliderRef: { current: mockSlider },
      sliderFillRef: { current: mockFill },
      sliderThumbRef: { current: mockThumb },
      scaleBadgeRef: { current: mockBadge },
      cycleLabelRef: { current: null },
      isDraggingSliderRef: { current: false },
    };
    const lastPct = { current: -1 };

    applyFocusBalancoDomFrame(refs, mdl, 1.0, 0.625, true, false, 2.4, lastPct);
    expect(mockBadge.textContent).toBe('100%');
    expect(mockSlider.value).toBe('100');
    expect(mockOffsetLbl.textContent).toBe('-58%');
    expect(mockPlayhead.style.transform).toBe('translate3d(90.0px, 100%, 0)');

    applyFocusBalancoDomFrame(refs, mdl, 0.0, 0.25, true, false, 2.4, lastPct);
    expect(mockBadge.textContent).toBe('0%');
    expect(mockSlider.value).toBe('0');
    expect(mockOffsetLbl.textContent).toBe('•');
    expect(mockPlayhead.style.transform).toBe('translate3d(180.0px, 0%, 0)');
  });

  it('formats bilingual FR/BR cycle button labels inline without track dosage distortion', () => {
    expect(resolveFocusCycleButtonLabel('idle', 'fr', false)).toBe('ANIMATION : 100% -> 0% -> 100%');
    expect(resolveFocusCycleButtonLabel('idle', 'pt', false)).toBe('ANIMAÇÃO: 100% -> 0% -> 100%');
    expect(resolveFocusCycleButtonLabel('idle', 'fr', true)).toBe('100% -> 0% -> 100%');
    expect(resolveFocusCycleButtonLabel('idle', 'pt', true)).toBe('100% -> 0% -> 100%');
    expect(resolveFocusCycleButtonLabel('ramp-down', 'fr', true)).toBe('100% -> 0%');
    expect(resolveFocusCycleButtonLabel('hold-zero', 'fr', true)).toBe('0% DROIT');
    expect(resolveFocusCycleButtonLabel('hold-zero', 'pt', true)).toBe('0% RETO');
    expect(resolveFocusCycleButtonLabel('ramp-up', 'pt', true)).toBe('0% -> 100%');
  });

  it('splits into 2 rows only when B >= 3 and narrow/compact, preserving 1 row on 2/4 and 6/8', () => {
    expect(shouldUseTwoRowBrickStrip(4, true, 360)).toBe(true);
    expect(shouldUseTwoRowBrickStrip(3, false, 480)).toBe(true);
    expect(shouldUseTwoRowBrickStrip(4, false, 720)).toBe(false);
    expect(shouldUseTwoRowBrickStrip(2, true, 360)).toBe(false);

    expect(resolveBeatsPerStripRow(4, true)).toBe(2);
    expect(resolveBeatsPerStripRow(3, true)).toBe(2);
    expect(computeStepCellWidthPx(360, 4, 4, true)).toBe(45);
    expect(computeStepCellWidthPx(360, 3, 4, true)).toBe(45);
    expect(computeStepCellWidthPx(360, 4, 3, true)).toBe(60);

    expect(computeFocusPlayheadTransform(0.0, 360, 3, true)).toEqual({ xPx: 0, rowIdx: 0 });
    expect(computeFocusPlayheadTransform(1 / 3, 360, 3, true).xPx).toBeCloseTo(180, 3);
    const beat3Start = computeFocusPlayheadTransform(2 / 3 + 1e-6, 360, 3, true);
    expect(beat3Start.rowIdx).toBe(1);
    expect(beat3Start.xPx).toBeCloseTo(0, 1);
    const beat3Mid = computeFocusPlayheadTransform(5 / 6, 360, 3, true);
    expect(beat3Mid.rowIdx).toBe(1);
    expect(beat3Mid.xPx).toBeCloseTo(90, 2);
  });
});
