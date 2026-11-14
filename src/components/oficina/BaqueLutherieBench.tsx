/**
 * BaqueLutherieBench.tsx — Banc d'accordage par famille, notes musicales (Hz), résonance (Decay)
 * et passerelles multi-pistes pour A Oficina et L'Assistant du Mestre (< 130 lignes).
 */
import React from 'react';
import { Volume2, Layers, Filter } from 'lucide-react';
import { LUTHERIE_DRUM_ROLES, LutherieDrumRole } from '../../utils/audio/lutheriePresetsStorage';
import { LutheriePresetsBar } from './LutheriePresetsBar';
import { LutherieDrumCard } from './LutherieDrumCard';
import { useBaqueLutherieState } from './useBaqueLutherieState';

export interface BaqueLutherieBenchProps {
  lang?: string;
  mode?: 'sequencer' | 'modal' | 'wizard';
}

const DRUM_LABELS: Record<string, string> = {
  marcante: 'Alfaia Marcante', meiao: 'Alfaia Meião', repique: 'Alfaia Repique',
  caixa: 'Caixa de Guerra', tarol: 'Tarol', timbal: 'Timbal',
};
const ALFAIA_IDS: LutherieDrumRole[] = ['marcante', 'meiao', 'repique'];
const CAIXA_IDS: LutherieDrumRole[] = ['caixa', 'tarol'];

export const BaqueLutherieBench: React.FC<BaqueLutherieBenchProps> = React.memo(({ lang, mode = 'sequencer' }) => {
  const isWizard = mode === 'wizard';
  const {
    effectiveLang, drumsByRole, currentTunings, currentDecays, presentRolesCount,
    focusedInstId, effectiveScope, setFilterScope,
    handleTuningChange, handleDecayChange, handleApplyPreset,
    previewSingleStroke, previewAlfaiasArpeggio, previewAlfaiasChord, previewCaixasChord, previewFullBaqueChord,
  } = useBaqueLutherieState(lang, isWizard);
  const isFr = effectiveLang === 'fr';

  const visibleAlfaias = effectiveScope === 'active' ? ALFAIA_IDS.filter((id) => drumsByRole[id].isPresent) : ALFAIA_IDS;
  const visibleCaixas = effectiveScope === 'active' ? CAIXA_IDS.filter((id) => drumsByRole[id].isPresent) : CAIXA_IDS;
  const showTimbal = effectiveScope === 'all' || drumsByRole.timbal.isPresent;

  const renderCard = (id: LutherieDrumRole) => {
    const st = drumsByRole[id];
    return (
      <LutherieDrumCard
        key={id} instrumentId={id} label={DRUM_LABELS[id] || id} lang={effectiveLang}
        tuning={st.tuning} decayPct={st.decayPct} isPresent={st.isPresent}
        tracks={st.tracks} showSessionBridges={!isWizard} isFocused={!isWizard && focusedInstId === id}
        onChangeTuning={(v) => handleTuningChange(id, v)} onChangeDecay={(v) => handleDecayChange(id, v)}
        onPreviewStroke={(sym) => previewSingleStroke(id, sym)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 text-[var(--cordel-text)]">
      {!isWizard && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] px-3 py-2 shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          <span className="font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 text-[var(--cordel-text)]">
            <Filter size={13} className="text-[var(--cordel-accent-readable)]" />
            <span>{isFr ? 'Affichage du Banc :' : 'Exibição da Bancada :'}</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" data-testid="lutherie-filter-active" disabled={presentRolesCount === 0} onClick={() => setFilterScope('active')} className={`px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors disabled:opacity-40 ${effectiveScope === 'active' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}>
              {isFr ? `Batuque actif (${presentRolesCount})` : `Batuque ativo (${presentRolesCount})`}
            </button>
            <button type="button" data-testid="lutherie-filter-all" onClick={() => setFilterScope('all')} className={`px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors ${effectiveScope === 'all' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}>
              {isFr ? `Tous les ${LUTHERIE_DRUM_ROLES.length} tambours` : `Todos os ${LUTHERIE_DRUM_ROLES.length} tambores`}
            </button>
          </div>
        </div>
      )}

      <LutheriePresetsBar lang={effectiveLang} currentTunings={currentTunings} currentDecays={currentDecays} onApplyPreset={handleApplyPreset} />

      {visibleAlfaias.length > 0 && (
        <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--cordel-border)] pb-2">
            <div>
              <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[var(--cordel-accent-readable)]">
                {isFr ? '1. Trio des Alfaias (Sous-Graves & Corps)' : '1. Trio de Alfaias (Subgraves & Corpo)'}
              </h4>
              <p className="text-[10px] text-[var(--cordel-text-muted)]">
                {isFr ? 'Accordage et tenue de peau indépendants par rôle (Marcante, Meião, Repique).' : 'Afinação e ressonância independentes por função (Marcante, Meião, Repique).'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={previewAlfaiasArpeggio} className="px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors">
                <Volume2 size={13} /><span>{isFr ? 'Égrener le Trio' : 'Dedilhar o Trio'}</span>
              </button>
              <button type="button" onClick={() => previewAlfaiasChord()} className="px-2.5 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors">
                <Layers size={13} /><span>{isFr ? 'Accord des 3 Alfaias' : 'Acorde das 3 Alfaias'}</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{visibleAlfaias.map(renderCard)}</div>
        </div>
      )}

      {(visibleCaixas.length > 0 || showTimbal) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {visibleCaixas.length > 0 && (
            <div className={`${showTimbal ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)]`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--cordel-border)] pb-2">
                <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[var(--cordel-accent-readable)]">2. Caixas de Guerra & Tarol</h4>
                <button type="button" onClick={previewCaixasChord} className="px-2.5 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors">
                  <Layers size={13} /><span>{isFr ? 'Accord Caixa + Tarol' : 'Acorde Caixa + Tarol'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{visibleCaixas.map(renderCard)}</div>
            </div>
          )}

          {showTimbal && (
            <div className={`${visibleCaixas.length > 0 ? '' : 'lg:col-span-3'} bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)]`}>
              <h4 className="font-cactus font-bold uppercase text-sm md:text-base text-[var(--cordel-accent-readable)] border-b border-[var(--cordel-border)] pb-2">
                {isFr ? '3. Timbal (Tonique & Slap)' : '3. Timbal (Tônica & Slap)'}
              </h4>
              {renderCard('timbal')}
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={previewFullBaqueChord} className="w-full py-3 px-4 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-xs md:text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors">
        <Layers size={16} /><span>{isFr ? "Écouter l'Accord Complet du Baque" : 'Ouvir o Acorde Completo do Baque'}</span>
      </button>
    </div>
  );
});

BaqueLutherieBench.displayName = 'BaqueLutherieBench';
