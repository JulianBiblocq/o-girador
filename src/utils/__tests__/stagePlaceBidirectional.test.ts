// @ts-ignore
import { describe, expect, it } from 'vitest';
import {
  buildPanBipolarArcPath,
  formatPanCartouche,
  formatPanDirectionalCartouche,
  formatPanTitle,
} from '../../components/controls/panKnobMath';
import {
  EMPTY_SQUAD_TICKS,
  parsePanCrownTicksKey,
  resolvePanCrownTicksForTrack,
  serializePanCrownTicks,
} from '../../components/controls/usePanSquadTicks';
import { serializeTrackLinkRoleBadge } from '../../components/mixer/channels/useTrackLinkRoleBadge';
import { serializeMasterRadarTicks } from '../../components/mixer/master/MasterPanRadarStrip';
import { buildGlobalStagePawns } from '../../components/mixer/spatial/globalStagePawnModel';
import { CONE_MAX_RAD, CONE_MIN_RAD } from '../../components/wizard/wizardStageGeometry';
import { formatPlayerAcousticReadout } from '../sectionStagePresets';
import {
  mixParamsToStagePointPx,
  panValToStageThetaRad,
  repelDraggedPawnFromNeighbors,
  resolveRestVisualPositions,
  STAGE_ZERO_DB_RADIUS_NORM,
  stagePointPxToMixParams,
} from '../stagePlaceBidirectionalMath';

describe('Lot C & Lot 2 — Miroir Bidirectionnel 140°, G/C/D (FR) vs E/C/D (BR) & Couronnes Maître/Esclaves', () => {
  it('assure la bijection exacte Pan [-100..+100] <-> 140° [20°..160°] et Fader [-18..+6 dB] avec verrouillage d’automation', () => {
    expect(panValToStageThetaRad(100)).toBeCloseTo(CONE_MIN_RAD, 6);
    expect(panValToStageThetaRad(0)).toBeCloseTo(Math.PI * 0.5, 6);
    expect(panValToStageThetaRad(-100)).toBeCloseTo(CONE_MAX_RAD, 6);

    const W = 640, H = 400;
    for (const [pan, db] of [[-100, 0], [-45, -6], [0, 0], [35, 3.5], [100, -18]] as const) {
      const pt = mixParamsToStagePointPx(pan, db, W, H);
      if (db === 0) expect(pt.radiusNorm).toBeCloseTo(STAGE_ZERO_DB_RADIUS_NORM, 6);
      const back = stagePointPxToMixParams(pt.pxX, pt.pxY, W, H);
      expect(Math.abs(back.panVal - pan)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.faderDb - db)).toBeLessThanOrEqual(0.15);
    }

    const locked = stagePointPxToMixParams(100, 80, W, H, {
      lockPan: true, lockedPanVal: -25, lockVol: true, lockedFaderDb: -3.0,
    });
    expect(locked.panVal).toBe(-25);
    expect(locked.faderDb).toBe(-3.0);
  });

  it('écarte visuellement au repos les pions superposés sans muter le store et repousse en douceur au glisser', () => {
    const W = 640, H = 400, minSep = 38;
    const center = mixParamsToStagePointPx(0, 0, W, H);
    const stacked = [
      { id: 'a', pxX: center.pxX, pxY: center.pxY, panVal: 0, faderDb: 0 },
      { id: 'b', pxX: center.pxX, pxY: center.pxY, panVal: 0, faderDb: 0 },
      { id: 'c', pxX: center.pxX, pxY: center.pxY, panVal: 0, faderDb: 0 },
    ];
    const spread = resolveRestVisualPositions(stacked, minSep, W, H);
    for (const s of spread) {
      expect(s.panVal).toBe(0);
      expect(s.faderDb).toBe(0);
    }
    for (let i = 0; i < spread.length; i++) {
      for (let j = i + 1; j < spread.length; j++) {
        expect(Math.hypot(spread[j].visualX - spread[i].visualX, spread[j].visualY - spread[i].visualY)).toBeGreaterThanOrEqual(minSep * 0.85);
      }
    }

    const repelled = repelDraggedPawnFromNeighbors(
      center.pxX + 2, center.pxY, [{ pxX: center.pxX, pxY: center.pxY }], minSep, W, H
    );
    expect(Math.hypot(repelled.pxX - center.pxX, repelled.pxY - center.pxY)).toBeGreaterThanOrEqual(minSep - 0.5);
  });

  it('localise strictement G/C/D en français vs E/C/D en brésilien sur PanKnob, Mini-Mixeur et Arc SVG', () => {
    expect(formatPanCartouche(0, 'fr')).toBe('C');
    expect(formatPanCartouche(-35, 'fr')).toBe('G35');
    expect(formatPanCartouche(-35, 'pt')).toBe('E35');
    expect(formatPanCartouche(40, 'fr')).toBe('D40');
    expect(formatPanDirectionalCartouche(0, 'fr')).toBe('C');
    expect(formatPanDirectionalCartouche(-35, 'fr')).toBe('◄ G35');
    expect(formatPanDirectionalCartouche(-35, 'pt')).toBe('◄ E35');
    expect(formatPanDirectionalCartouche(40, 'fr')).toBe('D40 ►');
    expect(formatPanTitle(0, 'fr')).toBe('Pan : Centre');
    expect(formatPanTitle(-28, 'fr')).toBe('Pan : G28');
    expect(formatPanTitle(-28, 'pt')).toBe('Pan: E28');
    expect(buildPanBipolarArcPath(0)).toBe('');
    expect(buildPanBipolarArcPath(-45)).toContain('A 11.2 11.2 0 0 0');
    expect(buildPanBipolarArcPath(45)).toContain('A 11.2 11.2 0 0 1');
    expect(formatPlayerAcousticReadout(25, 70, 0, 75, -40, 'fr')).toContain('G40');
    expect(formatPlayerAcousticReadout(25, 70, 0, 75, -40, 'pt')).toContain('E40');
  });

  it('garantit Object.is strict (React 19 getSnapshot), losanges fixes Maître/Esclaves (plié & déplié) et liens La Place', () => {
    const tracks: any[] = [
      { id: 100, instrumentIdx: 3, isBusFolder: true, isFolded: false, panVal: 0 },
      {
        id: 101, instrumentIdx: 3, busId: '100', isLinkMaster: true, panVal: -20,
        sectionPlayers: [{ id: 'p1', x: 30, y: 60, panVal: -40 }, { id: 'p2', x: 70, y: 60, panVal: 40 }],
      },
      { id: 102, instrumentIdx: 4, busId: '100', linkedToTrackId: '101', panVal: 55 },
      { id: 103, instrumentIdx: 5, panVal: 10 },
    ];

    expect(serializePanCrownTicks(tracks, 103)).toBe('');
    expect(parsePanCrownTicksKey('')).toBe(EMPTY_SQUAD_TICKS);

    const masterKey1 = serializePanCrownTicks(tracks, 101);
    const masterKey2 = serializePanCrownTicks(tracks, 101);
    expect(Object.is(masterKey1, masterKey2)).toBe(true);
    expect(parsePanCrownTicksKey(masterKey1)).toEqual([
      { baseOffset: -40, isLeader: true, kind: 'squad', isFixedWorld: false },
      { baseOffset: 40, isLeader: false, kind: 'squad', isFixedWorld: false },
      { baseOffset: 55, isLeader: false, kind: 'linked-slave', isFixedWorld: true },
    ]);

    const slaveTicks = resolvePanCrownTicksForTrack(tracks, 102);
    expect(slaveTicks).toEqual([{ baseOffset: -20, isLeader: true, kind: 'linked-master', isFixedWorld: true }]);

    const unfoldedBusTicks = resolvePanCrownTicksForTrack(tracks, 100);
    expect(unfoldedBusTicks.map((t) => t.baseOffset)).toEqual([-60, 20, 55]);

    expect(serializeTrackLinkRoleBadge(tracks, 101)).toBe('M');
    expect(serializeTrackLinkRoleBadge(tracks, 102)).toBe('S:Cx');
    expect(serializeTrackLinkRoleBadge(tracks, 103)).toBe('');
    expect(Object.is(serializeMasterRadarTicks(tracks), serializeMasterRadarTicks(tracks))).toBe(true);

    const pawns = buildGlobalStagePawns(tracks, {}, 640, 400, (id) => id);
    const slavePawn = pawns.find((p) => p.trackId === 102)!;
    expect(slavePawn.roleKind).toBe('slave');
    expect(slavePawn.linkAnchorPawnId).toBe('101__p0');
    expect(slavePawn.masterShortCode).toBe('Cx');
  });
});
