// @ts-ignore
import { describe, expect, it } from 'vitest';
import { computeSliderPercent, snapSliderValue } from '../../../../hooks/useStudioRangeSliderDrag';
import { calculateStrokeStats } from '../calculateStrokeStats';
import { applyStrokeParamToTrack } from '../strokeInspectorBatchWriter';
import { resolveInspectorTrackScope } from '../strokeInspectorScope';
import { normalizePatternData } from '../../../../contexts/audio/audioPatternNormalizer';
import { TrackGroup } from '../../../../types';

describe('StudioRangeSlider geometry & StrokeInspector read/write parity', () => {
  it('maps pointer norm [0..1] and visual pct [0..100] identically without early 92% ceiling', () => {
    const min = 10;
    const max = 100;
    expect(computeSliderPercent(10, min, max)).toBe(0);
    expect(computeSliderPercent(100, min, max)).toBe(100);
    expect(computeSliderPercent(40, min, max)).toBeCloseTo(33.3333, 3);

    const valAt92Pct = snapSliderValue(min + 0.92 * (max - min), min, max, 1);
    expect(valAt92Pct).toBe(93);
    const valAtRightEdge = snapSliderValue(min + 1.0 * (max - min), min, max, 1);
    expect(valAtRightEdge).toBe(100);
  });

  it('sets 100% of occurrences (multi-patterns, variations, split steps, pre-roll, legacy 0..1) on first update', () => {
    const legacyTrack: TrackGroup = {
      id: 1,
      instrumentIdx: 0,
      patterns: [
        {
          id: 101,
          name: 'Base',
          steps: 4,
          activeSteps: ['D', 'e', ['D', 'e'], 0],
          volumes: [0.8, 0.4, [0.7, 0.4], 0.7] as any,
          decays: [1, 0.1, [0.9, 0.4], 1] as any,
          preRollActiveSteps: ['e', 'D'],
          preRollVolumes: [50, 70],
          preRollDecays: [40, 100],
          variations: [
            {
              id: 'var-1',
              name: 'Virada',
              steps: ['e', 'e', 'D', 0],
              // Legacy variation without explicit decays (used to fallback to 100 instead of pattern.decays)
            } as any,
          ],
          measureAssignments: [true],
        } as any,
        {
          id: 102,
          name: 'Final',
          steps: 4,
          activeSteps: ['e', 0, 'e', 0],
          volumes: [70, 70, 70, 70],
          decays: [100, 100, 100, 100],
          measureAssignments: [false],
        } as any,
      ],
    } as any;

    const before = calculateStrokeStats(legacyTrack, 'e', false, {});
    expect(before.avgDecay).toBeLessThan(100);

    const updated = applyStrokeParamToTrack(legacyTrack, 'decay', 'e', false, 100);
    const after = calculateStrokeStats(updated, 'e', false, {});
    expect(after.avgDecay).toBe(100);
    expect((updated.patterns[0].decays as any)[2]).toEqual([90, 100]);
    expect(updated.patterns[0].preRollDecays).toEqual([100, 100]);
    expect(updated.patterns[0].variations?.[0].decays?.[0]).toBe(100);
  });

  it('synchronizes linked master/slaves/linkFolder while isolating pure audio buses', () => {
    const tracks: TrackGroup[] = [
      { id: 10, instrumentIdx: 0, isBusFolder: true, isLinkFolder: false, patterns: [] } as any,
      { id: 11, instrumentIdx: 0, busId: '10', patterns: [] } as any,
      { id: 12, instrumentIdx: 3, busId: '10', patterns: [] } as any,
      { id: 20, instrumentIdx: 0, isLinkFolder: true, isBusFolder: false, patterns: [] } as any,
      { id: 21, instrumentIdx: 0, isLinkMaster: true, linkedToTrackId: '20', patterns: [] } as any,
      { id: 22, instrumentIdx: 1, linkedToTrackId: '20', patterns: [] } as any,
    ];

    const busChildScope = resolveInspectorTrackScope(11, tracks);
    expect(Array.from(busChildScope.writeTrackIds)).toEqual(['11']);

    const masterScope = resolveInspectorTrackScope(21, tracks);
    expect(masterScope.readTracks.map((t) => t.id)).toEqual([21, 22]);
    expect(Array.from(masterScope.writeTrackIds).sort()).toEqual(['20', '21', '22']);
  });

  it('normalizes legacy 0..1 sculpt values and variation stepDecays during pattern migration', () => {
    const p: any = {
      id: 1,
      steps: 2,
      activeSteps: ['D', 'e'],
      volumes: [0.7, 0.5],
      decays: [1, 0.4],
      variations: [{ id: 'v1', name: 'V1', steps: ['D', 'e'], stepDecays: [0.8, 0.4] }],
      measureAssignments: [true],
    };
    normalizePatternData(p, 1);
    expect(p.volumes).toEqual([70, 50]);
    expect(p.decays).toEqual([100, 40]);
    expect(p.variations[0].decays).toEqual([80, 40]);
    expect(p.variations[0].stepDecays).toBeUndefined();
  });
});
