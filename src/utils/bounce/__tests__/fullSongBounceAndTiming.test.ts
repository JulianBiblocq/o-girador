// @ts-ignore
import { describe, expect, it } from 'vitest';
import {
  buildFullSongUnrolledTimeline,
  formatFullSongBounceFilename,
  FULL_BOUNCE_TAIL_SEC,
  unrollTracksForFullSong,
} from '../fullSongBounceTiming';

describe('Lot B — Déroulé Complet Offline (Boucles, Rampes BPM, Queue 1.8 s & Variations 1ª VEZ)', () => {
  it('déroule les boucles finies, calcule la durée harmonique des rampes BPM et ajoute 1.8 s de queue de résonance', () => {
    const timeline = buildFullSongUnrolledTimeline(
      {
        totalMeasures: 3,
        bpm: 100,
        timeSig: '4/4',
        measureBpms: [100, 100, 120],
        measureBpmTransitions: { 1: 'ramp' },
        measureTimeSigs: { 0: '4/4', 1: '4/4', 2: '2/4' },
        measureVols: [100, 85, 70],
        isLoopRegionActive: true,
        loopStartMeasure: 0,
        loopEndMeasure: 1,
        loopMode: 2,
      },
      48000
    );

    // Intro/Loop: [0 (iter 1), 1 (iter 1), 0 (iter 2), 1 (iter 2)] + Outro [2 (iter 1)] = 5 mesures
    expect(timeline.expanded).toEqual([
      { baseMeasure: 0, iteration: 1 },
      { baseMeasure: 1, iteration: 1 },
      { baseMeasure: 0, iteration: 2 },
      { baseMeasure: 1, iteration: 2 },
      { baseMeasure: 2, iteration: 1 },
    ]);
    expect(timeline.unrolledMasterVols).toEqual([100, 85, 100, 85, 70]);

    // Mesure 0 (100 BPM immediate 4/4) = 2.4 s
    // Mesure 1 -> 0 (100 -> 100) = 2.4 s
    // Mesure 1 (iter 2) -> Mesure 2 (100 -> 120 ramp 4 beats) = (120 * 4) / 220 = 2.181818 s
    // Mesure 2 (120 BPM 2/4 = 2 beats) = 1.0 s
    const expectedMusical = 2.4 + 2.4 + 2.4 + (480 / 220) + 1.0;
    expect(timeline.musicalDurationSec).toBeCloseTo(expectedMusical, 5);
    expect(timeline.totalDurationSec).toBeCloseTo(expectedMusical + FULL_BOUNCE_TAIL_SEC, 5);
    expect(timeline.totalSamples).toBe(Math.ceil((expectedMusical + FULL_BOUNCE_TAIL_SEC) * 48000));
    expect(formatFullSongBounceFilename('Convenção 2', 112)).toBe('convencao_2_112bpm_complet.wav');
  });

  it('isole les variations 1ª VEZ (playFirstTimeOnly) sur iteration === 1 et conserve le pattern de base sur iteration >= 2', () => {
    const baseSteps = ['D', '', 'E', ''];
    const tracks = [
      {
        id: 10,
        instrumentIdx: 3,
        measureVols: [75, 62],
        measurePans: [-30, 30],
        patterns: [
          {
            id: 1,
            name: 'Virada',
            steps: 4,
            activeSteps: baseSteps,
            volumes: [70, 70, 70, 70],
            decays: [100, 100, 100, 100],
            microtimings: [0, 0, 0, 0],
            measureAssignments: [true, false],
            variations: [
              {
                id: 'v1',
                name: '1ª Vez',
                playFirstTimeOnly: true,
                probability: 100,
                steps: ['A', 'r', 'D', 'e'],
              },
            ],
          },
        ],
      },
    ];

    const expanded = [
      { baseMeasure: 0, iteration: 1 },
      { baseMeasure: 1, iteration: 1 },
      { baseMeasure: 0, iteration: 2 },
      { baseMeasure: 1, iteration: 2 },
    ];
    const unrolled = unrollTracksForFullSong(tracks, expanded);
    expect(unrolled[0].measureVols).toEqual([75, 62, 75, 62]);
    expect(unrolled[0].measurePans).toEqual([-30, 30, -30, 30]);
    expect(unrolled[0].patterns).toHaveLength(2);

    const firstTimePat = unrolled[0].patterns[0];
    const repeatPat = unrolled[0].patterns[1];
    expect(firstTimePat.measureAssignments).toEqual([true, false, false, false]);
    expect(firstTimePat.activeSteps).toEqual(['A', 'r', 'D', 'e']);
    expect(repeatPat.measureAssignments).toEqual([false, false, true, false]);
    expect(repeatPat.activeSteps).toEqual(baseSteps);
  });
});
