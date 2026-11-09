/**
 * BaqueLutherieBench.tsx — Banc d'accordage par famille, notes musicales (Hz) et résonance (Decay)
 * pour A Oficina (mode="sequencer") et L'Assistant du Mestre (mode="wizard") (< 135 lignes).
 */
import React, { useCallback, useMemo } from 'react';
import { Volume2, Layers } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useWizardStore } from '../../stores/useWizardStore';
import { instrumentsConfig } from '../../data';
import { LUTHERIE_DRUM_ROLES, LutherieDrumRole, LutheriePreset } from '../../utils/audio/lutheriePresetsStorage';
import { LutheriePresetsBar } from './LutheriePresetsBar';
import { LutherieDrumCard } from './LutherieDrumCard';
import { useLutherieAudioPreview, DrumLutherieState } from './useLutherieAudioPreview';

export interface BaqueLutherieBenchProps {
  lang: string;
  mode?: 'sequencer' | 'wizard';
}

const DRUM_LABELS: Record<string, string> = {
  marcante: 'Alfaia Marcante', meiao: 'Alfaia Meião', repique: 'Alfaia Repique',
  caixa: 'Caixa de Guerra', tarol: 'Tarol', timbal: 'Timbal',
};

export const BaqueLutherieBench: React.FC<BaqueLutherieBenchProps> = React.memo(({ lang, mode = 'sequencer' }) => {
  const isFr = lang === 'fr';
  const tracks = useSequencerStore((s) => s.tracks);
  const setTrackTuning = useSequencerStore((s) => s.setTrackTuning);
  const setTrackDecay = useSequencerStore((s) => s.setTrackDecay);
  const { placedInstruments, instrumentTunings, instrumentDecays, setInstrumentTuning, setInstrumentDecay } = useWizardStore();

  const getDrumState = useCallback((instrumentId: string): DrumLutherieState => {
    if (mode === 'wizard') {
      return {
        tuning: instrumentTunings[instrumentId] ?? 0, decayPct: instrumentDecays[instrumentId] ?? 100,
        trackId: null, isPresent: placedInstruments.some((p) => p.instrumentType === instrumentId),
      };
    }
    const matchingTrack = tracks.find((t) => !t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === instrumentId);
    return {
      tuning: matchingTrack?.tuning ?? 0, decayPct: matchingTrack?.trackDecay ?? 100,
      trackId: matchingTrack ? matchingTrack.id : null, isPresent: Boolean(matchingTrack),
    };
  }, [mode, placedInstruments, instrumentTunings, instrumentDecays, tracks]);

  const handleTuningChange = useCallback((instrumentId: string, semitones: number) => {
    if (mode === 'wizard') return setInstrumentTuning(instrumentId, semitones);
    tracks.forEach((t) => {
      if (!t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === instrumentId) setTrackTuning(t.id, semitones);
    });
  }, [mode, setInstrumentTuning, tracks, setTrackTuning]);

  const handleDecayChange = useCallback((instrumentId: string, decayPct: number) => {
    if (mode === 'wizard') return setInstrumentDecay(instrumentId, decayPct);
    tracks.forEach((t) => {
      if (!t.isBusFolder && !t.isLinkFolder && instrumentsConfig[t.instrumentIdx]?.id === instrumentId) setTrackDecay(t.id, decayPct);
    });
  }, [mode, setInstrumentDecay, tracks, setTrackDecay]);

  const { previewSingleStroke, previewAlfaiasArpeggio, previewAlfaiasChord, previewCaixasChord, previewFullBaqueChord } =
    useLutherieAudioPreview(getDrumState);

  const { currentTunings, currentDecays } = useMemo(() => {
    const tMap = {} as Record<LutherieDrumRole, number>;
    const dMap = {} as Record<LutherieDrumRole, number>;
    LUTHERIE_DRUM_ROLES.forEach((r) => { const st = getDrumState(r); tMap[r] = st.tuning; dMap[r] = st.decayPct; });
    return { currentTunings: tMap, currentDecays: dMap };
  }, [getDrumState]);

  const handleApplyPreset = useCallback((preset: LutheriePreset) => {
    LUTHERIE_DRUM_ROLES.forEach((role) => {
      handleTuningChange(role, preset.tunings[role] ?? 0);
      handleDecayChange(role, preset.decays[role] ?? 100);
    });
    previewAlfaiasChord(preset);
  }, [handleTuningChange, handleDecayChange, previewAlfaiasChord]);

  const renderCard = (id: string) => {
    const st = getDrumState(id);
    return (
      <LutherieDrumCard
        key={id} instrumentId={id} label={DRUM_LABELS[id] || id} lang={lang}
        tuning={st.tuning} decayPct={st.decayPct} isPresent={st.isPresent}
        onChangeTuning={(v) => handleTuningChange(id, v)} onChangeDecay={(v) => handleDecayChange(id, v)}
        onPreviewStroke={(sym) => previewSingleStroke(id, sym)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 text-[var(--cordel-text)]">
      <LutheriePresetsBar lang={lang} currentTunings={currentTunings} currentDecays={currentDecays} onApplyPreset={handleApplyPreset} />

      <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-text)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-text)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[var(--cordel-text)]/20 pb-2">
          <div>
            <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[#8b2a1a] dark:text-[#f59e0b]">
              {isFr ? '1. Trio des Alfaias (Sous-Graves & Corps)' : '1. Trio de Alfaias (Subgraves & Corpo)'}
            </h4>
            <p className="text-[10px] text-[var(--cordel-text)]/75">
              {isFr ? 'Accordage et tenue de peau indépendants par rôle (Marcante, Meião, Repique).' : 'Afinação e ressonância independentes por função (Marcante, Meião, Repique).'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={previewAlfaiasArpeggio} className="px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[#8b2a1a] text-[var(--cordel-text)] hover:!text-[#f4ecd8] border-2 border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-text)] transition-colors">
              <Volume2 size={13} /><span>{isFr ? 'Égrener le Trio' : 'Dedilhar o Trio'}</span>
            </button>
            <button type="button" onClick={() => previewAlfaiasChord()} className="px-2.5 py-1.5 bg-[#8b2a1a] hover:bg-[#a83220] !text-[#f4ecd8] border-2 border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-text)] transition-colors">
              <Layers size={13} /><span>{isFr ? 'Accord des 3 Alfaias' : 'Acorde das 3 Alfaias'}</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{['marcante', 'meiao', 'repique'].map(renderCard)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-text)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-text)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[var(--cordel-text)]/20 pb-2">
            <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[#8b2a1a] dark:text-[#f59e0b]">2. Caixas de Guerra & Tarol</h4>
            <button type="button" onClick={previewCaixasChord} className="px-2.5 py-1.5 bg-[var(--cordel-text)] hover:bg-[#8b2a1a] text-[var(--cordel-bg)] hover:!text-[#f4ecd8] border-2 border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-text)] transition-colors">
              <Layers size={13} /><span>{isFr ? 'Accord Caixa + Tarol' : 'Acorde Caixa + Tarol'}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{['caixa', 'tarol'].map(renderCard)}</div>
        </div>

        <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-text)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-text)]">
          <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[#8b2a1a] dark:text-[#f59e0b] border-b-2 border-[var(--cordel-text)]/20 pb-2">
            {isFr ? '3. Timbal (Tonique & Slap)' : '3. Timbal (Tônica & Slap)'}
          </h4>
          {renderCard('timbal')}
        </div>
      </div>

      <button type="button" onClick={previewFullBaqueChord} className="w-full py-3 px-4 bg-[#8b2a1a] hover:bg-[#a83220] !text-[#f4ecd8] border-2 border-[var(--cordel-text)] shadow-[4px_4px_0px_var(--cordel-text)] font-cactus font-bold uppercase text-xs md:text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors">
        <Layers size={16} /><span>{isFr ? "Écouter l'Accord Complet du Baque" : 'Ouvir o Acorde Completo do Baque'}</span>
      </button>
    </div>
  );
});
BaqueLutherieBench.displayName = 'BaqueLutherieBench';
