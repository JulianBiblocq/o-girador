// @ts-ignore
import { describe, expect, it } from 'vitest';
import type { Pattern, TrackGroup } from '../../types';
import { migrateLegacySlavePatternOverrides } from '../legacySlaveOverridesMigrator';
import { isSlaveTrack } from '../trackMasterResolver';
import { resolveActivePatternForCell } from '../timelinePatternResolver';
import { resolveVisibleRodaTracks } from '../../components/circle-sequencer/resolveVisibleRodaTracks';
import {
  toggleRodaTrackMuteWithHiddenSlaves,
  toggleRodaTrackSoloWithHiddenSlaves,
} from '../../stores/helpers/rodaMasterSlaveMuteSoloHelper';
import { computeEffectiveMuteStatePro } from '../../stores/helpers/trackSoloProHelpers';

function makePattern(id: number, name: string, stroke: string, assignments: boolean[]): Pattern {
  const steps = Array(16).fill('');
  if (stroke) steps[0] = stroke;
  return { id, name, steps: 16, activeSteps: steps, lyrics: [], notes: [], measureAssignments: assignments };
}

describe('Unisson Maître/Esclave, Migration Sans Perte & Mute/Solo Solidaire Roda', () => {
  it('promeut sans perte un ancien esclave avec patternOverrides divergents en piste Maître autonome', () => {
    const mBase = makePattern(101, 'Baque Base', 'T', [true, true, true, true]);
    const sBase = makePattern(201, 'Baque Base', 'T', [true, true, true, true]);
    const sBreak = makePattern(202, 'Virada Perso', 'X', [false, false, false, false]);

    const legacyTracks: TrackGroup[] = [
      {
        id: 1, instrumentIdx: 0, customName: 'Marcante 1', isLinkMaster: true,
        isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 101,
        patterns: [mBase],
      },
      {
        id: 2, instrumentIdx: 0, customName: 'Marcante 2 (Varié)', linkedToTrackId: '1',
        isMute: false, isSolo: false, isHidden: true, volumeVal: 75, selectedPatternId: 201,
        patterns: [sBase, sBreak],
        patternOverrides: { 1: null, 2: 202 },
      },
      {
        id: 3, instrumentIdx: 0, customName: 'Marcante 3 (Unisson)', linkedToTrackId: '1',
        isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 301,
        patterns: [makePattern(301, 'Baque Base', 'T', [true, true, true, true])],
        patternOverrides: { 0: 101 },
      },
    ];

    const migrated = migrateLegacySlavePatternOverrides(legacyTracks, 4);
    const promoted = migrated.find((t) => t.id === 2)!;
    const keptSlave = migrated.find((t) => t.id === 3)!;

    expect(isSlaveTrack(promoted, migrated)).toBe(false);
    expect(promoted.linkedToTrackId).toBeUndefined();
    expect(promoted.isHidden).toBe(false);
    expect(promoted.patternOverrides).toBeUndefined();

    expect(resolveActivePatternForCell(2, 0, null, migrated).activePattern?.activeSteps[0]).toBe('T');
    expect(resolveActivePatternForCell(2, 1, null, migrated).activePattern).toBeNull();
    expect(resolveActivePatternForCell(2, 2, null, migrated).activePattern?.activeSteps[0]).toBe('X');
    expect(resolveActivePatternForCell(2, 3, null, migrated).activePattern?.activeSteps[0]).toBe('T');

    expect(isSlaveTrack(keptSlave, migrated)).toBe(true);
    expect(keptSlave.patternOverrides).toBeUndefined();
    expect(resolveActivePatternForCell(3, 1, null, migrated).activePattern?.id).toBe(101);
  });

  it('masque les esclaves par défaut sur la Roda et mute/solote solidairement les esclaves cachés', () => {
    const ptn = makePattern(10, 'Base', 'T', [true, true, false, false]);
    const tracks: TrackGroup[] = [
      {
        id: 10, instrumentIdx: 0, customName: 'Marcante Maître', isLinkMaster: true,
        isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 10, patterns: [ptn],
      },
      {
        id: 11, instrumentIdx: 0, customName: 'Marcante Lié', linkedToTrackId: '10',
        isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 10, patterns: [ptn],
      },
      {
        id: 20, instrumentIdx: 3, customName: 'Caixa',
        isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: 10, patterns: [ptn],
      },
    ];

    const hiddenOnRoda = resolveVisibleRodaTracks(tracks, { isMobile: false, showLinkedTracksOnRoda: false } as any);
    expect(hiddenOnRoda.map((t) => t.id)).toEqual([10, 20]);
    const shownOnRoda = resolveVisibleRodaTracks(tracks, { isMobile: false, showLinkedTracksOnRoda: true } as any);
    expect(shownOnRoda.map((t) => t.id)).toEqual([10, 11, 20]);

    const afterMute = toggleRodaTrackMuteWithHiddenSlaves(tracks, 10, true);
    expect(computeEffectiveMuteStatePro(afterMute, 10)).toBe(true);
    expect(computeEffectiveMuteStatePro(afterMute, 11)).toBe(true);
    expect(computeEffectiveMuteStatePro(afterMute, 20)).toBe(false);

    const afterUnmute = toggleRodaTrackMuteWithHiddenSlaves(afterMute, 10, true);
    expect(computeEffectiveMuteStatePro(afterUnmute, 11)).toBe(false);

    const afterSolo = toggleRodaTrackSoloWithHiddenSlaves(tracks, 10, true);
    expect(computeEffectiveMuteStatePro(afterSolo, 10)).toBe(false);
    expect(computeEffectiveMuteStatePro(afterSolo, 11)).toBe(false);
    expect(computeEffectiveMuteStatePro(afterSolo, 20)).toBe(true);

    const afterUnsolo = toggleRodaTrackSoloWithHiddenSlaves(afterSolo, 10, true);
    expect(computeEffectiveMuteStatePro(afterUnsolo, 20)).toBe(false);
  });
});
