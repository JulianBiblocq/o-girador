// @ts-ignore
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SQUAD_TICKS,
  parsePanCrownTicksKey,
  resolvePanCrownTicksForTrack,
  serializePanCrownTicks,
} from '../../components/controls/usePanSquadTicks';
import { serializeMasterRadarTicks } from '../../components/mixer/master/MasterPanRadarStrip';
import { CONE_MAX_RAD, CONE_MIN_RAD } from '../../components/wizard/wizardStageGeometry';
import {
  mixParamsToStagePointPx,
  panValToStageThetaRad,
  repelDraggedPawnFromNeighbors,
  resolveRestVisualPositions,
  STAGE_ZERO_DB_RADIUS_NORM,
  stagePointPxToMixParams,
} from '../stagePlaceBidirectionalMath';

describe('Lot C — Miroir Bidirectionnel Console <-> La Place 140°, Bulle d’Espace Vital & Ticks PanKnob', () => {
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
      expect(Math.abs(back.faderDb - db)).toBeLessThan(0.15);
    }

    const locked = stagePointPxToMixParams(100, 80, W, H, {
      lockPan: true, lockedPanVal: -25, lockVol: true, lockedFaderDb: -3.0,
    });
    expect(locked.panVal).toBe(-25);
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

  it('garantit Object.is strict (React 19 getSnapshot) sur les sélecteurs primitifs PanKnob & Radar Master', () => {
    const tracks: any[] = [
      { id: 100, instrumentIdx: 3, isBusFolder: true, isFolded: true, panVal: 0 },
      {
        id: 101, instrumentIdx: 3, busId: '100', isLinkMaster: true, panVal: -20,
        sectionPlayers: [{ id: 'p1', x: 30, y: 60, panVal: -40 }, { id: 'p2', x: 70, y: 60, panVal: 40 }],
      },
      { id: 102, instrumentIdx: 4, busId: '100', linkedToTrackId: '101', panVal: 55 },
      { id: 103, instrumentIdx: 5, panVal: 10 },
    ];

    // Solo track -> clé vide "" -> constante figée EMPTY_SQUAD_TICKS (Object.is === true)
    const emptyKey1 = serializePanCrownTicks(tracks, 103);
    const emptyKey2 = serializePanCrownTicks(tracks, 103);
    expect(Object.is(emptyKey1, emptyKey2)).toBe(true);
    expect(emptyKey1).toBe('');
    expect(parsePanCrownTicksKey(emptyKey1)).toBe(EMPTY_SQUAD_TICKS);

    // Multi-instruments -> primitive string identique par Object.is à chaque lecture getSnapshot
    const squadKey1 = serializePanCrownTicks(tracks, 101);
    const squadKey2 = serializePanCrownTicks(tracks, 101);
    expect(Object.is(squadKey1, squadKey2)).toBe(true);
    expect(parsePanCrownTicksKey(squadKey1)).toEqual([
      { baseOffset: -40, isLeader: true },
      { baseOffset: 40, isLeader: false },
    ]);

    const foldedBusTicks = resolvePanCrownTicksForTrack(tracks, 100);
    expect(foldedBusTicks.map((t) => t.baseOffset)).toEqual([-60, 20, 55]);

    const radarKey1 = serializeMasterRadarTicks(tracks);
    const radarKey2 = serializeMasterRadarTicks(tracks);
    expect(Object.is(radarKey1, radarKey2)).toBe(true);
  });
});
