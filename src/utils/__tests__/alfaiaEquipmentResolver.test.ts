// @ts-ignore — vitest est execute via npx vitest hors devDependencies locales
import { describe, expect, it } from 'vitest';
import {
  resolveAlfaiaSecondaryStickFromSteps,
  resolvePresetAlfaiaEquipment,
} from '../alfaiaEquipmentResolver';

describe('alfaiaEquipmentResolver — Priorite I > A/a > macaneta & Pont Organizador', () => {
  it('applies strict priority I > A/a > macaneta including subdivided [sub1, sub2] steps', () => {
    expect(resolveAlfaiaSecondaryStickFromSteps([['D', 0, 'e', 'D', 'X', 'C', 'B']])).toBe('macaneta');
    expect(resolveAlfaiaSecondaryStickFromSteps([['D', 'a', 'e', 'D']])).toBe('fina');
    expect(resolveAlfaiaSecondaryStickFromSteps([['D', ['d', 'A'], 'e', 'D']])).toBe('fina');
    expect(resolveAlfaiaSecondaryStickFromSteps([['D', 'A', ['e', 'I'], 'D']])).toBe('bacalhau');
  });

  it('scans only timeline-assigned patterns (plus overrides & variations) and ignores unused bank patterns', () => {
    const project = {
      tracks: [
        {
          id: 1,
          instrumentIdx: 0,
          patterns: [
            { id: 10, activeSteps: ['D', 0, 'e', 'D'], measureAssignments: [true, true] },
            { id: 11, activeSteps: ['D', 'I', 'e', 'D'], measureAssignments: [false, false] },
          ],
        },
        {
          id: 2,
          instrumentIdx: 2,
          patternOverrides: { 1: 21 },
          patterns: [
            { id: 20, activeSteps: ['D', 'e', 'D', 'e'], measureAssignments: [true, true] },
            { id: 21, activeSteps: ['D', ['e', 'a'], 'D', 'e'], measureAssignments: [false, false] },
          ],
        },
      ],
    };

    expect(resolvePresetAlfaiaEquipment(project)).toEqual({
      secondaryStick: 'fina',
      byRole: {
        marcante: 'macaneta',
        repique: 'fina',
      },
    });
  });

  it('aggregates global priority to bacalhau when at least one Alfaia role uses I', () => {
    const project = {
      tracks: [
        { id: 1, instrumentIdx: 0, patterns: [{ id: 1, activeSteps: ['D', 'A', 'D', 0], measureAssignments: [true] }] },
        { id: 2, instrumentIdx: 1, patterns: [{ id: 2, activeSteps: ['D', 'I', 'D', 0], measureAssignments: [true] }] },
      ],
    };
    expect(resolvePresetAlfaiaEquipment(project)).toEqual({
      secondaryStick: 'bacalhau',
      byRole: { marcante: 'fina', meiao: 'bacalhau' },
    });
  });

  it('returns null when no Alfaia family track exists (e.g. Caixa-only breque)', () => {
    const caixaOnlyBreque = {
      tracks: [
        { id: 10, instrumentIdx: 3, patterns: [{ id: 1, activeSteps: ['D', 'A', 'R', 'e'], measureAssignments: [true] }] },
        { id: 11, instrumentIdx: 5, patterns: [{ id: 2, activeSteps: ['G', 'A'], measureAssignments: [true] }] },
      ],
    };
    expect(resolvePresetAlfaiaEquipment(caixaOnlyBreque)).toBeNull();
    expect(resolvePresetAlfaiaEquipment({ tracks: [] })).toBeNull();
  });
});
