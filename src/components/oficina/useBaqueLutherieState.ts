/**
 * useBaqueLutherieState.ts — Sélecteurs atomiques Zustand, dérivation multi-pistes par tambour
 * et handlers d'accordage/decay pour BaqueLutherieBench (< 130 lignes).
 */
import { useCallback, useMemo, useState } from 'react';
import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useWizardStore } from '../../stores/useWizardStore';
import { instrumentsConfig } from '../../data';
import {
  DEFAULT_SIGNATURE_TUNINGS,
  LUTHERIE_DRUM_ROLES,
  LutherieDrumRole,
  LutheriePreset,
} from '../../utils/audio/lutheriePresetsStorage';
import { useLutherieAudioPreview, DrumLutherieState } from './useLutherieAudioPreview';

export type DrumRoleBenchEntry = DrumLutherieState & { tracks: TrackGroup[] };

const EMPTY_TRACKS: TrackGroup[] = [];
const INITIAL_FALLBACK_DECAYS: Record<LutherieDrumRole, number> = {
  marcante: 100, meiao: 100, repique: 100, caixa: 100, tarol: 100, timbal: 100, gongue: 100,
};

export function useBaqueLutherieState(langProp: string | undefined, isWizard: boolean) {
  const storeLang = useSequencerStore((s) => s.lang);
  const effectiveLang = langProp || storeLang || 'fr';

  const tracks = useSequencerStore((s) => s.tracks);
  const setTrackTuning = useSequencerStore((s) => s.setTrackTuning);
  const setTrackDecay = useSequencerStore((s) => s.setTrackDecay);
  const oficinaFocus = useSequencerSettingsStore((s) => s.oficinaFocus);

  const placedInstruments = useWizardStore((s) => s.placedInstruments);
  const instrumentTunings = useWizardStore((s) => s.instrumentTunings);
  const instrumentDecays = useWizardStore((s) => s.instrumentDecays);
  const setInstrumentTuning = useWizardStore((s) => s.setInstrumentTuning);
  const setInstrumentDecay = useWizardStore((s) => s.setInstrumentDecay);

  const [filterScope, setFilterScope] = useState<'active' | 'all'>('active');
  const [fallbackTunings, setFallbackTunings] = useState<Record<LutherieDrumRole, number>>(() => ({ ...DEFAULT_SIGNATURE_TUNINGS }));
  const [fallbackDecays, setFallbackDecays] = useState<Record<LutherieDrumRole, number>>(() => ({ ...INITIAL_FALLBACK_DECAYS }));

  const { drumsByRole, currentTunings, currentDecays, presentRolesCount, focusedInstId } = useMemo(() => {
    const byRole = {} as Record<LutherieDrumRole, DrumRoleBenchEntry>;
    const tMap = {} as Record<LutherieDrumRole, number>;
    const dMap = {} as Record<LutherieDrumRole, number>;
    const focusTrackId = oficinaFocus?.trackId;
    const resolvedFocusInst = oficinaFocus?.instrumentId ?? (focusTrackId !== undefined && focusTrackId !== null
      ? instrumentsConfig[tracks.find((t) => t.id === focusTrackId)?.instrumentIdx ?? -1]?.id ?? null
      : null);
    let presentCount = 0;

    LUTHERIE_DRUM_ROLES.forEach((role) => {
      if (isWizard) {
        const placedCount = placedInstruments.filter((p) => p.instrumentType === role).length;
        const isPresent = placedCount > 0;
        const tuning = instrumentTunings[role] ?? DEFAULT_SIGNATURE_TUNINGS[role];
        const decayPct = instrumentDecays[role] ?? 100;
        if (isPresent) presentCount++;
        byRole[role] = { tuning, decayPct, trackId: null, isPresent, tracks: EMPTY_TRACKS, placedCount };
      } else {
        const matching = tracks.filter((t) => !t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === role);
        const primary = (focusTrackId !== undefined && focusTrackId !== null
          ? matching.find((t) => t.id === focusTrackId)
          : undefined) ?? matching[0];
        const isPresent = matching.length > 0;
        if (isPresent) presentCount++;
        byRole[role] = {
          tuning: primary ? (primary.tuning ?? 0) : (fallbackTunings[role] ?? DEFAULT_SIGNATURE_TUNINGS[role]),
          decayPct: primary ? (primary.trackDecay ?? 100) : (fallbackDecays[role] ?? 100),
          trackId: primary ? primary.id : null,
          isPresent,
          tracks: matching,
        };
      }
      tMap[role] = byRole[role].tuning;
      dMap[role] = byRole[role].decayPct;
    });

    return { drumsByRole: byRole, currentTunings: tMap, currentDecays: dMap, presentRolesCount: presentCount, focusedInstId: resolvedFocusInst };
  }, [isWizard, placedInstruments, instrumentTunings, instrumentDecays, tracks, oficinaFocus, fallbackTunings, fallbackDecays]);

  const getDrumState = useCallback((id: string): DrumLutherieState => (
    drumsByRole[id as LutherieDrumRole] ?? { tuning: 0, decayPct: 100, trackId: null, isPresent: false }
  ), [drumsByRole]);

  const handleTuningChange = useCallback((instrumentId: string, semitones: number) => {
    if (isWizard) return setInstrumentTuning(instrumentId, semitones);
    setFallbackTunings((prev) => ({ ...prev, [instrumentId]: semitones }));
    useSequencerStore.getState().tracks.forEach((t) => {
      if (!t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === instrumentId) setTrackTuning(t.id, semitones);
    });
  }, [isWizard, setInstrumentTuning, setTrackTuning]);

  const handleDecayChange = useCallback((instrumentId: string, decayPct: number) => {
    if (isWizard) return setInstrumentDecay(instrumentId, decayPct);
    setFallbackDecays((prev) => ({ ...prev, [instrumentId]: decayPct }));
    useSequencerStore.getState().tracks.forEach((t) => {
      if (!t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === instrumentId) setTrackDecay(t.id, decayPct);
    });
  }, [isWizard, setInstrumentDecay, setTrackDecay]);

  const audioPreviews = useLutherieAudioPreview(getDrumState);

  const handleApplyPreset = useCallback((preset: LutheriePreset) => {
    LUTHERIE_DRUM_ROLES.forEach((role) => {
      handleTuningChange(role, preset.tunings[role] ?? 0);
      handleDecayChange(role, preset.decays[role] ?? 100);
    });
    const seq = useSequencerStore.getState();
    seq.setSkinChorusAmount(preset.skinChorusAmount ?? 0.75);
    seq.setRodaBreathingAmount(preset.rodaBreathingAmount ?? 0.75);
    audioPreviews.previewAlfaiasChord(preset, true);
  }, [handleTuningChange, handleDecayChange, audioPreviews]);

  const handleApplyTuningsMap = useCallback((tunings: Record<LutherieDrumRole, number>) => {
    LUTHERIE_DRUM_ROLES.forEach((role) => {
      handleTuningChange(role, tunings[role] ?? 0);
    });
    audioPreviews.previewAlfaiasChord({ tunings }, true);
  }, [handleTuningChange, audioPreviews]);

  const effectiveScope: 'active' | 'all' =
    isWizard || presentRolesCount === 0 || Boolean(focusedInstId && !drumsByRole[focusedInstId as LutherieDrumRole]?.isPresent)
      ? 'all'
      : filterScope;

  return {
    effectiveLang, drumsByRole, currentTunings, currentDecays, presentRolesCount,
    focusedInstId, effectiveScope, setFilterScope,
    handleTuningChange, handleDecayChange, handleApplyPreset, handleApplyTuningsMap, ...audioPreviews,
  };
}
