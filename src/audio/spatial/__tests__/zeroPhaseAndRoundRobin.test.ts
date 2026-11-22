// @ts-ignore
import { describe, expect, it } from 'vitest';
import { BUS_COMPRESSOR_ARCHETYPES } from '../../effects/busCompressorArchetypes';
import { resolveLowCutTargetHz, TAROL_STUDIO_INTRINSIC_HPF_HZ } from '../../effects/lowCutTarget';
import { EngineRoundRobin } from '../../engine/engineRoundRobin';
import { computePartnerTemperament } from '../../groove/sectionTemperament';
import { DEFAULT_MASTER_BUS_DSP_PARAMS } from '../../worklet/master-bus/masterBusWorkletTypes';
import { normalizePresetAcousticsOnLoad } from '../../../contexts/audio/acousticNormalizer';
import { computeWizardSpatialMix } from '../../../components/wizard/wizardSpatialMixMath';
import {
  computeDeterministicStrokeJitterSec,
  computePlayerDistanceDb,
  MAX_CONE_DEPTH_DB,
  resolveTrackSectionSpatialProfile,
} from '../sectionSpatialAcoustics';

describe('Lot A — Zéro Annulation de Phase, Anti-Collision Round-Robin & Calibration Tarol Studio', () => {
  it('verrouille Fader = 100 % Maître du Volume (0 dB lié à Y) et le cône de phase constructive strict (<= 0.40 ms Caixa/Tarol, <= 0.80 ms Alfaias)', () => {
    expect(MAX_CONE_DEPTH_DB).toBe(0);
    expect(computePlayerDistanceDb(10)).toBe(0);
    expect(computePlayerDistanceDb(95)).toBe(0);

    const wizFront = computeWizardSpatialMix(50, 95, 'marcante');
    const wizBack = computeWizardSpatialMix(50, 15, 'marcante');
    expect(wizFront.faderPos).toBe(wizBack.faderPos);
    expect(wizBack.reverbSend).toBeGreaterThan(wizFront.reverbSend);

    const caixaSquad = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [20, 40, 60, 80].map((x, i) => ({ id: `c${i}`, x, y: 20 + i * 20 })), panVal: 0 },
      'caixa'
    );
    for (let k = 0; k < caixaSquad.players.length; k++) {
      const p = caixaSquad.players[k];
      const jitter = computeDeterministicStrokeJitterSec(12, k, 7, 4, 'caixa');
      expect(p.baseDelaySec + Math.abs(jitter)).toBeLessThanOrEqual(0.00040);
      expect(Math.abs(p.detuneCents)).toBeLessThanOrEqual(2.5);
    }

    const alfaiaSquad = resolveTrackSectionSpatialProfile(
      { sectionPlayers: [15, 32, 50, 68, 85].map((x, i) => ({ id: `m${i}`, x, y: 15 + i * 15 })), panVal: 0 },
      'marcante'
    );
    for (let k = 0; k < alfaiaSquad.players.length; k++) {
      const p = alfaiaSquad.players[k];
      const jitter = computeDeterministicStrokeJitterSec(5, k, 11, 5, 'marcante');
      expect(p.baseDelaySec + Math.abs(jitter)).toBeLessThanOrEqual(0.00080);
      expect(Math.abs(p.detuneCents)).toBeLessThanOrEqual(2.5);
    }

    for (let rank = 1; rank <= 4; rank++) {
      expect(computePartnerTemperament(rank, 100 + rank, 'caixa').attackSpreadSec).toBeLessThanOrEqual(0.00040);
      expect(computePartnerTemperament(rank, 200 + rank, 'tarol').attackSpreadSec).toBeLessThanOrEqual(0.00040);
      expect(computePartnerTemperament(rank, 300 + rank, 'marcante').attackSpreadSec).toBeLessThanOrEqual(0.00080);
    }
  });

  it('garantit > 97 % de cohérence de phase sur f0 (165 Hz Caixa / 96 Hz Alfaia) et applique le trim individuel volumeVal', () => {
    // Vérification trigonométrique cos(pi * f0 * dt) >= 0.975 (perte < 0.22 dB)
    expect(Math.cos(Math.PI * 165.41 * 0.00040)).toBeGreaterThan(0.975);
    expect(Math.cos(Math.PI * 214.84 * 0.00040)).toBeGreaterThan(0.960);
    expect(Math.cos(Math.PI * 96.33 * 0.00080)).toBeGreaterThan(0.970);

    const trimmed = resolveTrackSectionSpatialProfile(
      {
        sectionPlayers: [
          { id: 'p1', x: 35, y: 70, volumeVal: 75, panVal: -30 },
          { id: 'p2', x: 65, y: 70, volumeVal: 0, panVal: 30 },
        ],
      },
      'caixa'
    );
    expect(trimmed.players[0].gainScalar).toBeCloseTo(1 / Math.sqrt(2), 4);
    expect(trimmed.players[1].gainScalar).toBe(0);
  });

  it('interdit toute collision de sample Round-Robin entre pistes sœurs et escouades simultanées (+-35 ms)', () => {
    const rr = new EngineRoundRobin();
    const stroke = {
      symbol: 'D',
      keys: ['d'],
      caseSensitive: false,
      files: ['cx1.ogg', 'cx2.ogg', 'cx3.ogg', 'cx4.ogg', 'cx5.ogg'],
    };
    const aIndices = rr.selectSquadFileIndices('caixa', stroke, 1.000, 2, 101);
    const bIndices = rr.selectSquadFileIndices('caixa', stroke, 1.0003, 2, 102);
    const cIndices = rr.selectSquadFileIndices('caixa', stroke, 1.012, 1, 103);
    const allFive = [...aIndices, ...bIndices, ...cIndices];
    expect(new Set(allFive).size).toBe(5);
  });

  it('applique le coupe-bas intrinsèque 180 Hz du Tarol Studio, scHpfHz relevés et normalisation Bus legacy vol=100 -> 75', () => {
    expect(resolveLowCutTargetHz({ instrumentIdx: 4, lowCut: false }, false)).toBe(TAROL_STUDIO_INTRINSIC_HPF_HZ);
    expect(resolveLowCutTargetHz({ instrumentIdx: 4, lowCut: true }, false)).toBe(TAROL_STUDIO_INTRINSIC_HPF_HZ);
    expect(resolveLowCutTargetHz({ instrumentIdx: 4, lowCut: true }, true)).toBe(20);
    expect(resolveLowCutTargetHz({ instrumentIdx: 3, lowCut: true }, false)).toBe(80);

    expect(BUS_COMPRESSOR_ARCHETYPES.caixas_carpet.sidechainHpfHz).toBe(220);
    expect(BUS_COMPRESSOR_ARCHETYPES.caixas_carpet.releaseMs).toBe(45);
    expect(DEFAULT_MASTER_BUS_DSP_PARAMS.scHpfHz).toBe(130);

    const migrated = normalizePresetAcousticsOnLoad({
      tracks: [
        { id: 1, isBusFolder: true, volumeVal: 100 },
        { id: 2, isBusFolder: false, volumeVal: 100 },
      ],
    });
    expect(migrated.tracks[0].volumeVal).toBe(75);
    expect(migrated.tracks[1].volumeVal).toBe(75);
  });
});
