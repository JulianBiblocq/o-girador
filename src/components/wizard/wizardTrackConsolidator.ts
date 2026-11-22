/**
 * wizardTrackConsolidator.ts — Consolidation des pions de La Place en 1 piste Maître par `instrumentType` (< 65 lignes).
 * - Respecte les quotas `marcante <= 5`, autres percussions `<= 4`, `apito <= 1`.
 * - Volume trim `75` (`0 dB`), Pan trim `0` (zéro double panoramique) et coordonnées `(x, y)` dans `sectionPlayers`.
 */
import { instrumentsConfig } from '../../data';
import { getMaxSectionPlayers, resolveDefaultPlayerDetuneCents } from '../../constants/sectionEnsembleLimits';
import type { PlacedInstrument } from '../../stores/useWizardStore';
import type { Pattern, SectionPlayerPlacement, TrackGroup } from '../../types';
import { getDefaultSignatureTuning } from '../../utils/audio/lutherieFactoryPresets';
import { allocWizardId } from './wizardPatternBuilder';
import { computeWizardSpatialMix } from './wizardSpatialMixMath';

export interface ConsolidateWizardTracksParams {
  placedInstruments: readonly PlacedInstrument[];
  resolveLabel: (instType: string) => string;
  resolveSwing: (instType: string) => number;
  buildPatterns: (instType: string) => Pattern[];
  selectedBalancoId: string;
  instrumentTunings: Record<string, number>;
  instrumentDecays: Record<string, number>;
  onLoadSample?: (instType: string) => void;
}

export function consolidateWizardPlacedTracks(p: ConsolidateWizardTracksParams): TrackGroup[] {
  const grouped = new Map<string, PlacedInstrument[]>();
  for (const item of p.placedInstruments) {
    const maxQ = getMaxSectionPlayers(item.instrumentType);
    let arr = grouped.get(item.instrumentType);
    if (!arr) { arr = []; grouped.set(item.instrumentType, arr); }
    if (arr.length < maxQ) arr.push(item);
  }

  const tracks: TrackGroup[] = [];
  for (const [instType, pawns] of grouped.entries()) {
    const instIdx = instrumentsConfig.findIndex((c) => c.id === instType);
    if (instIdx === -1 || pawns.length === 0) continue;

    const avgRev = Math.round(pawns.reduce((acc, pw) => acc + computeWizardSpatialMix(pw.x, pw.y, instType).reverbSend, 0) / pawns.length);
    const famInt = p.resolveSwing(instType);
    const patterns = p.buildPatterns(instType);
    const maxQ = getMaxSectionPlayers(instType);
    const sectionPlayers: SectionPlayerPlacement[] | undefined = maxQ > 1
      ? pawns.map((pw, idx) => ({
          id: pw.id,
          x: Math.round(pw.x * 10) / 10,
          y: Math.round(pw.y * 10) / 10,
          detuneCents: resolveDefaultPlayerDetuneCents(idx, pawns.length, instType),
        }))
      : undefined;

    p.onLoadSample?.(instType);
    tracks.push({
      id: allocWizardId(), instrumentIdx: instIdx, customName: p.resolveLabel(instType), patterns,
      isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: patterns[0]?.id || 0,
      reverbVal: avgRev, panVal: 0, pan: 0, sectionPlayers, swingIntensity: famInt, balancoAmount: famInt,
      balancoPresetId: p.selectedBalancoId, tuning: p.instrumentTunings[instType] ?? getDefaultSignatureTuning(instType),
      trackDecay: p.instrumentDecays[instType] ?? 100, fxSends: { reverb: avgRev, distortion: 0 },
    });
  }
  return tracks;
}
