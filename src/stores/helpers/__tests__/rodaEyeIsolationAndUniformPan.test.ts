// @ts-ignore
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isRodaDrawableTrack } from '../../../components/circle-sequencer/circleGeometry';
import { PanKnobSvg } from '../../../components/controls/PanKnobSvg';
import { resolvePanCrownTicksForTrack } from '../../../components/controls/usePanSquadTicks';
import { serializeTrackLinkRoleBadge } from '../../../components/mixer/channels/useTrackLinkRoleBadge';
import { serializeMasterRadarTicks } from '../../../components/mixer/master/MasterPanRadarStrip';
import { buildGlobalStagePawns } from '../../../components/mixer/spatial/globalStagePawnModel';
import type { TrackGroup } from '../../../types';
import { getDisplayedMixerTracks } from '../mixerOrderingHelpers';
import { selectTracksMeta } from '../trackMetaCache';
import { applyRadii } from '../trackRodaGeometryHelpers';
import { getVisibleTimelineTrackIds, isLinearDAWVisibleTrack } from '../trackVisibilityHelpers';

function makeTrack(overrides: Partial<TrackGroup> & { id: number; instrumentIdx: number }): TrackGroup {
  return {
    patterns: [{ id: overrides.id * 10, name: 'Base', steps: 16, activeSteps: Array(16).fill(0), lyrics: [], notes: [], measureAssignments: [true] }],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: overrides.id * 10,
    panVal: 0,
    ...overrides,
  };
}

describe('Isolation stricte de isHidden (Œil Roda) & Traits uniformes piste pilote / pistes liées sur Panoramiques', () => {
  it('conserve toute piste isHidden: true dans le Mixeur, La Place (hors apito), le Radar Master, la Timeline et Pistes, tout en la masquant des anneaux de la Roda', () => {
    const tracks: TrackGroup[] = [
      makeTrack({ id: 100, instrumentIdx: 0, customName: 'Alfaias', isBusFolder: true, isFolded: false, patterns: [] }),
      makeTrack({ id: 10, instrumentIdx: 0, customName: 'Marcante', busId: '100', isLinkMaster: true, isHidden: true, panVal: -30 }),
      makeTrack({ id: 20, instrumentIdx: 1, customName: 'Meião', busId: '100', linkedToTrackId: '10', isHidden: true, panVal: 25 }),
      makeTrack({ id: 40, instrumentIdx: 3, customName: 'Caixa', isHidden: false, panVal: -15 }),
      makeTrack({ id: 90, instrumentIdx: 8, customName: 'Timbal', isHidden: true, panVal: 40 }),
      makeTrack({ id: 99, instrumentIdx: 9, customName: 'Apito', isHidden: true, panVal: 0 }),
    ];

    // 1. Table de Mixage : Timbal (90), Marcante (10), Meião (20) et Apito (99) restent affichés malgré isHidden: true
    const meta = selectTracksMeta({ tracks });
    const displayedIds = getDisplayedMixerTracks(meta).map((t) => t.id);
    expect(displayedIds).toEqual([100, 10, 20, 40, 90, 99]);

    // Seul isFolded sur un Bus replie ses enfants dans le Mixeur
    const foldedMeta = selectTracksMeta({
      tracks: tracks.map((t) => (t.id === 100 ? { ...t, isFolded: true } : t)),
    });
    expect(getDisplayedMixerTracks(foldedMeta).map((t) => t.id)).toEqual([100, 40, 90, 99]);

    // 2. La Place (140°) & Radar Master : pistes isHidden: true présentes, Apito exclu
    const pawns = buildGlobalStagePawns(tracks, {}, 640, 400, (id) => id);
    expect(pawns.map((p) => p.trackId)).toEqual([10, 20, 40, 90]);
    expect(pawns.some((p) => p.trackId === 99)).toBe(false);

    const radarKey = serializeMasterRadarTicks(tracks);
    expect(radarKey).toBe('10:-30|20:25|40:-15|90:40');
    expect(radarKey).not.toContain('99:');

    // 3. Badges piste pilote / piste liée & Timeline / Pistes insensibles à isHidden
    expect(serializeTrackLinkRoleBadge(tracks, 10)).toBe('M');
    expect(serializeTrackLinkRoleBadge(tracks, 20)).toBe('S:Mc');
    expect(getVisibleTimelineTrackIds({ tracks })).toEqual([10, 20, 40, 90, 99]);
    expect(tracks.filter((t) => isLinearDAWVisibleTrack(t, tracks)).map((t) => t.id)).toEqual([10, 20, 40, 90, 99]);

    // 4. Roda uniquement : les anneaux excluent Timbal (90) et Marcante (10) quand isHidden: true, mais gardent Caixa (40)
    const withRadii = applyRadii(tracks);
    expect(isRodaDrawableTrack(withRadii.find((t) => t.id === 90))).toBe(false);
    expect(isRodaDrawableTrack(withRadii.find((t) => t.id === 10))).toBe(false);
    expect(isRodaDrawableTrack(withRadii.find((t) => t.id === 40))).toBe(true);
    expect(isRodaDrawableTrack(withRadii.find((t) => t.id === 99))).toBe(false);
  });

  it('dessine exactement le même trait radial en var(--cordel-text) pour piste pilote, pistes liées et escouades sur PanKnobSvg', () => {
    const tracks: TrackGroup[] = [
      makeTrack({
        id: 10, instrumentIdx: 3, isLinkMaster: true, isHidden: true, panVal: -20,
        sectionPlayers: [{ id: 'p1', x: 35, y: 60, panVal: -30 }, { id: 'p2', x: 65, y: 60, panVal: 30 }],
      }),
      makeTrack({ id: 20, instrumentIdx: 4, linkedToTrackId: '10', isHidden: true, panVal: 45 }),
    ];

    const masterTicks = resolvePanCrownTicksForTrack(tracks, 10);
    const slaveTicks = resolvePanCrownTicksForTrack(tracks, 20);
    expect(masterTicks).toHaveLength(3);
    expect(slaveTicks).toHaveLength(1);

    const dummyRef = { current: null };
    const html = renderToStaticMarkup(
      React.createElement(PanKnobSvg, {
        setRotationRef: () => {},
        memberTicks: [...masterTicks, ...slaveTicks],
        initialAngle: 0,
        inputRef: dummyRef,
        value: -20,
        label: 'Pan',
        onInputChange: () => {},
      })
    );

    expect(html).not.toContain('<polygon');
    const tickGroupMatches = html.match(/<g data-testid="pan-crown-member-tick-\d+"[^>]*>[\s\S]*?<\/g>/g) || [];
    expect(tickGroupMatches).toHaveLength(4);
    for (const grp of tickGroupMatches) {
      expect(grp).toContain('stroke="var(--cordel-text)"');
      expect(grp).toContain('stroke-width="1.5"');
      expect(grp).not.toContain('var(--cordel-wood)');
    }
  });
});
