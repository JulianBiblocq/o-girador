/**
 * SettingsKitMacroEditor.tsx — Éditeur Macro Volume/Decay d'une frappe du Kit
 * avec passerelle directe vers la grille de l'Éditeur de Motif (< 120 lignes).
 */
import React from 'react';
import { Check, X, Grid3X3 } from 'lucide-react';
import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { resolveActivePatternIdForTrack } from '../oficina/LutherieTrackLinksRow';
import { StudioRangeSlider } from '../ui/StudioRangeSlider';

interface SettingsKitMacroEditorProps {
  track: TrackGroup;
  stroke: string;
  isVoice: boolean;
  isUsed: boolean;
  isStrokeCurrentlyActive: boolean;
  avgVolume: number;
  avgDecay: number;
  lang: string;
  onToggleForcedState: () => void;
  onClose: () => void;
  onVolumeChange: (val: number, delta: number, isFirstChange: boolean) => void;
  onDecayChange: (val: number, delta: number, isFirstChange: boolean) => void;
}

export const SettingsKitMacroEditor: React.FC<SettingsKitMacroEditorProps> = ({
  track, stroke, isVoice, isStrokeCurrentlyActive, avgVolume, avgDecay, lang,
  onToggleForcedState, onClose, onVolumeChange, onDecayChange,
}) => {
  const isFr = lang === 'fr';
  const safeAvgVol = avgVolume ?? 70;
  const safeAvgDecay = avgDecay ?? 100;

  const handleEditStrokeInGrid = () => {
    const currentMeasure = useSequencerStore.getState().currentMeasure ?? 0;
    const patternId = resolveActivePatternIdForTrack(track, currentMeasure);
    useSequencerSettingsStore.getState().setIsSettingsOpen(false);
    useSequencerStore.getState().openInstrumentDetailAt({
      trackId: track.id,
      patternId,
      initialTool: stroke,
    });
  };

  return (
    <div className="mt-2 border-2 border-dashed border-[var(--cordel-border-strong)] p-3 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] flex flex-col gap-3">
      <div className="flex justify-between items-center text-[10px] font-bold border-b border-[var(--cordel-border)] pb-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-cactus uppercase">
            {isFr ? `Configuration de frappe : [${stroke}]` : `Configuração de batida : [${stroke}]`}
          </span>
          <button
            type="button" onClick={onToggleForcedState}
            className={`px-2 py-0.5 border border-[var(--cordel-border-strong)] text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center gap-1 transition-opacity select-none ${
              isStrokeCurrentlyActive
                ? 'bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)]'
            }`}
            title={isFr
              ? "Cliquez pour forcer l'activation ou la désactivation de cette frappe dans le kit"
              : 'Clique para forçar a ativação ou desativação desta batida no kit'}
          >
            {isStrokeCurrentlyActive ? <Check size={10} /> : <X size={10} />}
            <span>{isStrokeCurrentlyActive ? (isFr ? 'Actif' : 'Ativo') : (isFr ? 'Désactivé' : 'Desativado')}</span>
          </button>
        </div>

        <button
          type="button" onClick={onClose}
          className="text-[var(--cordel-accent-readable)] hover:underline uppercase font-cactus font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
        >
          <X size={11} /><span>{isFr ? 'Fermer' : 'Fechar'}</span>
        </button>
      </div>

      <StudioRangeSlider
        value={safeAvgVol}
        min={0}
        max={100}
        resetValue={70}
        surfaceTone="theme"
        accentVar="var(--cordel-status-success)"
        ariaLabel={isFr ? 'Volume Global' : 'Volume Geral'}
        labelContent={<span className="font-cactus font-bold uppercase">{isFr ? 'Volume Global :' : 'Volume Geral :'}</span>}
        onScrub={(val, isFirstChange) => onVolumeChange(val, val - safeAvgVol, isFirstChange)}
        onReset={(resetVal) => onVolumeChange(resetVal, resetVal - safeAvgVol, true)}
      />

      <StudioRangeSlider
        value={safeAvgDecay}
        min={10}
        max={100}
        resetValue={100}
        surfaceTone="theme"
        accentVar="var(--cordel-accent)"
        ariaLabel={isVoice ? (isFr ? 'Durée Globale' : 'Duração Geral') : (isFr ? 'Résonance Globale' : 'Ressonância Geral')}
        labelContent={
          <span className="font-cactus font-bold uppercase">
            {isVoice ? (isFr ? 'Durée Globale :' : 'Duração Geral :') : (isFr ? 'Résonance Globale (Decay) :' : 'Ressonância Geral (Decay) :')}
          </span>
        }
        onScrub={(val, isFirstChange) => onDecayChange(val, val - safeAvgDecay, isFirstChange)}
        onReset={(resetVal) => onDecayChange(resetVal, resetVal - safeAvgDecay, true)}
      />

      <button
        type="button"
        data-testid={`kit-macro-open-stroke-${track.id}-${stroke}`}
        onClick={handleEditStrokeInGrid}
        className="w-full py-1.5 px-2.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
      >
        <Grid3X3 size={12} />
        <span>{isFr ? `Éditer "${stroke}" dans la grille` : `Editar "${stroke}" na grade`}</span>
      </button>
    </div>
  );
};
