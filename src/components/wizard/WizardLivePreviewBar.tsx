import React from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { useWizardStore } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';
import { WizardLivePreviewController } from './audio/useWizardLivePreview';

interface WizardLivePreviewBarProps {
  wizardLang: Language;
  preview: WizardLivePreviewController;
}

export const WizardLivePreviewBar: React.FC<WizardLivePreviewBarProps> = ({
  wizardLang,
  preview,
}) => {
  const placedCount = useWizardStore((s) => s.placedInstruments.length);
  const bpm = useWizardStore((s) => s.bpm);
  const timeSig = useWizardStore((s) => s.timeSig);
  const selectedBasePatternId = useWizardStore((s) => s.selectedBasePatternId);
  const selectedCloudSectionName = useWizardStore((s) => s.selectedCloudSectionName);

  const isSilent = !selectedBasePatternId && !selectedCloudSectionName;
  const canPlay = placedCount > 0 && !isSilent;
  const isPt = wizardLang === 'pt';

  return (
    <div className="sticky top-0 z-20 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-3 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] p-3 rounded-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={preview.togglePreview}
          disabled={!canPlay || preview.isPreloading}
          className={`px-4 py-2 border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-cactus font-bold uppercase text-xs tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none ${
            preview.isPreviewPlaying
              ? 'bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
          }`}
        >
          {preview.isPreviewPlaying ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
          <span>
            {preview.isPreloading
              ? (isPt ? 'Carregando...' : 'Chargement...')
              : preview.isPreviewPlaying
                ? t[wizardLang].arreterApercu
                : t[wizardLang].ecouterRoda}
          </span>
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-cactus font-bold uppercase text-[var(--cordel-text)]">
            <Volume2 size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span className="truncate">
              {selectedCloudSectionName
                ? selectedCloudSectionName
                : isSilent
                  ? t[wizardLang].vierge
                  : `${selectedBasePatternId?.toUpperCase()} • ${bpm} BPM • ${timeSig}`}
            </span>
          </div>
          <span className="text-[10px] text-[var(--cordel-text-muted)] leading-tight">
            {isSilent
              ? (isPt ? 'Selecione um ritmo para ativar a escuta ao vivo.' : 'Choisissez un rythme pour activer la pré-écoute en direct.')
              : (isPt ? 'Afinação, posição X/Y e Balanço em tempo real' : 'Accordage, placement X/Y et Balanço en temps réel')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
        <div className="flex-1 h-2.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] overflow-hidden">
          <div
            ref={preview.progressFillRef}
            className="h-full w-full bg-[var(--cordel-accent-readable)] origin-left will-change-transform"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <div className="w-6 h-6 border border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] flex items-center justify-center font-mono text-xs font-bold text-[var(--cordel-accent-readable)]">
          <span ref={preview.beatLabelRef}>1</span>
        </div>
      </div>
    </div>
  );
};
