/**
 * useLutherieAudioPreview.ts — Pré-écoutes unitaires, arpèges et accords par famille
 * pour le Banc de Lutherie du Baque (A Oficina & Assistant du Mestre) (< 95 lignes).
 */
import { useCallback } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../hooks/useAudioSync';
import { LutheriePreset, LutherieDrumRole } from '../../utils/audio/lutheriePresetsStorage';

export interface DrumLutherieState {
  tuning: number;
  decayPct: number;
  trackId: number | null;
  isPresent: boolean;
}

export function useLutherieAudioPreview(getDrumState: (instrumentId: string) => DrumLutherieState) {
  const triggerDrumHit = useCallback(
    (
      instrumentId: string,
      strokeSymbol: string,
      velocity: number = 1.0,
      timeOffsetSec: number = 0,
      overridePreset?: LutheriePreset
    ) => {
      if (!audioEngine) return;
      const st = getDrumState(instrumentId);
      const role = instrumentId as LutherieDrumRole;
      const tuning = overridePreset ? (overridePreset.tunings[role] ?? st.tuning) : st.tuning;
      const decayPct = overridePreset ? (overridePreset.decays[role] ?? st.decayPct) : st.decayPct;
      const decayMultiplier = Math.max(0.15, Math.min(1.0, (decayPct ?? 100) / 100));
      const baseTime = Tone.now() || audioEngine.getCurrentTime();
      const targetTime = timeOffsetSec > 0 ? baseTime + timeOffsetSec : undefined;
      audioEngine.playPreview(instrumentId, strokeSymbol, tuning, velocity, targetTime, decayMultiplier, st.trackId);
    },
    [getDrumState]
  );

  const previewSingleStroke = useCallback(
    (instrumentId: string, strokeSymbol: string) => {
      triggerDrumHit(instrumentId, strokeSymbol, 1.0, 0);
    },
    [triggerDrumHit]
  );

  const previewAlfaiasArpeggio = useCallback(() => {
    ['marcante', 'meiao', 'repique'].forEach((role, idx) => {
      triggerDrumHit(role, 'D', 0.95, idx * 0.32);
    });
  }, [triggerDrumHit]);

  const previewAlfaiasChord = useCallback(
    (overridePreset?: LutheriePreset) => {
      ['marcante', 'meiao', 'repique'].forEach((role, idx) => {
        triggerDrumHit(role, 'D', 0.85, idx * 0.004, overridePreset);
      });
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
    const allRoles = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'];
    const activeRoles = allRoles.filter((r) => getDrumState(r).isPresent);
    const rolesToPlay = activeRoles.length > 0 ? activeRoles : allRoles;

    rolesToPlay.forEach((role, idx) => {
      const stroke = role === 'timbal' ? 'A' : 'D';
      const offset = idx * 0.004;
      triggerDrumHit(role, stroke, 0.85, offset);
      triggerDrumHit(role, stroke, 0.92, 0.44 + offset);
    });
  }, [getDrumState, triggerDrumHit]);

  return {
    previewSingleStroke,
    previewAlfaiasArpeggio,
    previewAlfaiasChord,
    previewCaixasChord,
    previewFullBaqueChord,
  };
}
