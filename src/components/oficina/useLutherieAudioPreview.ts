/**
 * useLutherieAudioPreview.ts — Pré-écoutes unitaires, arpèges et accords par famille
 * avec rendu multi-fûts déterministe (« Chœur de Peaux ») dans A Oficina & Assistant du Mestre (< 126 lignes).
 */
import { useCallback } from 'react';
import * as Tone from 'tone';
import { computeAdaptiveMaxChorusCents, getSymmetricSlotFactor } from '../../audio/engine/skinChorusCalculator';
import { audioEngine } from '../../hooks/useAudioSync';
import { getEffectiveSkinChorusAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { LutherieDrumRole } from '../../utils/audio/lutheriePresetsStorage';

export interface DrumLutherieState {
  tuning: number;
  decayPct: number;
  trackId: number | null;
  isPresent: boolean;
  tracks?: TrackGroup[];
  placedCount?: number;
}

export interface LutheriePreviewOverride {
  tunings: Partial<Record<LutherieDrumRole, number>>;
  decays?: Partial<Record<LutherieDrumRole, number>>;
}

export function useLutherieAudioPreview(getDrumState: (instrumentId: string) => DrumLutherieState) {
  const triggerDrumHit = useCallback(
    (
      instrumentId: string,
      strokeSymbol: string,
      velocity: number = 1.0,
      timeOffsetSec: number = 0,
      override?: LutheriePreviewOverride
    ) => {
      if (!audioEngine) return;
      const st = getDrumState(instrumentId);
      const role = instrumentId as LutherieDrumRole;
      const hasOverrideTuning = override && override.tunings[role] !== undefined;
      const baseTuning = hasOverrideTuning ? override!.tunings[role]! : st.tuning;
      const decayPct = override?.decays && override.decays[role] !== undefined ? override.decays[role]! : st.decayPct;
      const decayMultiplier = Math.max(0.15, Math.min(1.0, (decayPct ?? 100) / 100));
      const baseTime = Tone.now() || audioEngine.getCurrentTime();

      const rodaTracks = st.tracks && st.tracks.length >= 2
        ? [...st.tracks].sort((a, b) => Number(a.id) - Number(b.id))
        : null;

      if (rodaTracks && rodaTracks.length >= 2) {
        const velComp = velocity / Math.sqrt(rodaTracks.length);
        rodaTracks.forEach((trk, k) => {
          const trkTuning = hasOverrideTuning ? baseTuning : (trk.tuning ?? baseTuning);
          const off = timeOffsetSec + k * 0.0032;
          const targetTime = off > 0 ? baseTime + off : undefined;
          audioEngine!.playPreview(instrumentId, strokeSymbol, trkTuning, velComp, targetTime, decayMultiplier, trk.id);
        });
        return;
      }

      const virtualCount = st.placedCount ?? 0;
      if (virtualCount >= 2) {
        const chorusAmt = getEffectiveSkinChorusAmount(useSequencerStore.getState());
        const maxCents = computeAdaptiveMaxChorusCents(instrumentId, baseTuning, chorusAmt);
        const velComp = velocity / Math.sqrt(virtualCount);
        for (let k = 0; k < virtualCount; k++) {
          const detuneSt = (getSymmetricSlotFactor(k, virtualCount) * maxCents) / 100;
          const off = timeOffsetSec + k * 0.0032;
          const targetTime = off > 0 ? baseTime + off : undefined;
          audioEngine.playPreview(instrumentId, strokeSymbol, baseTuning + detuneSt, velComp, targetTime, decayMultiplier, null);
        }
        return;
      }

      const targetTime = timeOffsetSec > 0 ? baseTime + timeOffsetSec : undefined;
      audioEngine.playPreview(instrumentId, strokeSymbol, baseTuning, velocity, targetTime, decayMultiplier, st.trackId);
    },
    [getDrumState]
  );

  const previewSingleStroke = useCallback(
    (instrumentId: string, strokeSymbol: string) => { triggerDrumHit(instrumentId, strokeSymbol, 1.0, 0); },
    [triggerDrumHit]
  );

  const previewAlfaiasArpeggio = useCallback(() => {
    ['marcante', 'meiao', 'repique'].forEach((role, idx) => triggerDrumHit(role, 'D', 0.95, idx * 0.32));
  }, [triggerDrumHit]);

  const previewAlfaiasChord = useCallback(
    (override?: LutheriePreviewOverride, includeGongue: boolean = false) => {
      ['marcante', 'meiao', 'repique'].forEach((role, idx) => triggerDrumHit(role, 'D', 0.85, idx * 0.004, override));
      if (includeGongue) triggerDrumHit('gongue', 'G', 0.72, 0.014, override);
    },
    [triggerDrumHit]
  );

  const previewCaixasChord = useCallback(() => {
    ['caixa', 'tarol'].forEach((role, idx) => {
      const offset = idx * 0.003;
      triggerDrumHit(role, 'D', 0.9, offset);
      triggerDrumHit(role, 'r', 0.65, 0.18 + offset);
      triggerDrumHit(role, 'D', 0.8, 0.26 + offset);
      triggerDrumHit(role, 'r', 0.65, 0.34 + offset);
      triggerDrumHit(role, 'D', 0.95, 0.42 + offset);
    });
  }, [triggerDrumHit]);

  const previewFullBaqueChord = useCallback(() => {
    const allRoles = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal', 'gongue'];
    const activeRoles = allRoles.filter((r) => getDrumState(r).isPresent);
    const rolesToPlay = activeRoles.length > 0 ? activeRoles : allRoles;
    rolesToPlay.forEach((role, idx) => {
      const stroke = role === 'timbal' ? 'A' : role === 'gongue' ? 'G' : 'D';
      const offset = idx * 0.004;
      triggerDrumHit(role, stroke, 0.85, offset);
      triggerDrumHit(role, stroke, 0.92, 0.44 + offset);
    });
  }, [getDrumState, triggerDrumHit]);

  return { previewSingleStroke, previewAlfaiasArpeggio, previewAlfaiasChord, previewCaixasChord, previewFullBaqueChord };
}
