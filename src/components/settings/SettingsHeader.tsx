import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface SettingsHeaderProps {
  lang: string;
  onSetLang: (lang: 'fr' | 'pt') => void;
  onClose: () => void;
  hideCloseButton?: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  lang,
  onSetLang,
  onClose,
  hideCloseButton = false,
}) => {
  const returnEditorContext = useSequencerSettingsStore((s) => s.returnEditorContext);
  const clearReturnEditorContext = useSequencerSettingsStore((s) => s.clearReturnEditorContext);
  const setIsSettingsOpen = useSequencerSettingsStore((s) => s.setIsSettingsOpen);
  const openInstrumentDetailAt = useSequencerStore((s) => s.openInstrumentDetailAt);

  const handleReturnToEditor = () => {
    if (!returnEditorContext) return;
    openInstrumentDetailAt({
      trackId: returnEditorContext.trackId,
      patternId: returnEditorContext.patternId,
      stepIdx: returnEditorContext.stepIdx,
      isPreRoll: returnEditorContext.isPreRoll,
      subIndex: returnEditorContext.subIndex,
      initialTool: returnEditorContext.activeTool,
    });
    clearReturnEditorContext();
    setIsSettingsOpen(false);
  };

  const returnLabel = returnEditorContext
    ? `${lang === 'pt' ? 'Voltar a' : 'Retour à'} ${
        returnEditorContext.trackLabel || (lang === 'pt' ? 'Instrumento' : 'Instrument')
      }${returnEditorContext.patternLabel ? ' • ' + returnEditorContext.patternLabel : ''}`
    : '';

  return (
    <div className="bg-[var(--master-header-bg)] text-[var(--master-header-text)] px-4 md:px-6 py-3 flex flex-wrap justify-between items-center gap-3 shrink-0 border-b-[3px] border-[var(--cordel-border)] select-none">
      <h2 className="text-lg md:text-2xl font-cactus font-bold tracking-wider uppercase flex items-center gap-2">
        <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5] text-[var(--cordel-gold)] shrink-0" viewBox="0 0 24 24" strokeLinecap="square">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2L14 5H10L12 2Z" />
          <path d="M12 22L10 19H14L12 22Z" />
          <path d="M22 12L19 14V10L22 12Z" />
          <path d="M2 12L5 10V14L2 12Z" />
          <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
          <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
          <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
          <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
        </svg>
        <span>{lang === 'fr' ? "L'Atelier - O Girador" : 'A Oficina - O Girador'}</span>
      </h2>

      <div className="flex flex-wrap items-center gap-2.5">
        {returnEditorContext && (
          <button
            type="button"
            data-testid="oficina-return-to-editor-btn"
            onClick={handleReturnToEditor}
            className="bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-wood)] border-2 border-[var(--cordel-border-strong)] px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
            title={returnLabel}
          >
            <ArrowLeft size={15} className="shrink-0 stroke-[2.5]" />
            <span className="truncate max-w-[200px] sm:max-w-[300px]">{returnLabel}</span>
          </button>
        )}

        <div className="flex border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[10px] md:text-xs font-cactus font-bold uppercase overflow-hidden shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          <button
            type="button"
            onClick={() => onSetLang('fr')}
            className={`px-2 py-1 cursor-pointer transition-colors ${
              lang === 'fr'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-black'
                : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
            title="Passer en Français"
          >
            FR
          </button>
          <div className="w-[2px] bg-[var(--cordel-border)]" />
          <button
            type="button"
            onClick={() => onSetLang('pt')}
            className={`px-2 py-1 cursor-pointer transition-colors ${
              lang === 'pt'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-black'
                : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
            title="Mudar para Português (BR)"
          >
            BR
          </button>
        </div>

        {!hideCloseButton && (
          <button
            type="button"
            data-testid="oficina-close-btn"
            onClick={onClose}
            className="bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] border-2 border-[var(--cordel-border-strong)] px-2.5 py-1.5 flex items-center justify-center font-cactus font-black cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
            title={lang === 'fr' ? 'Fermer' : 'Fechar'}
            aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
          >
            <X size={18} className="stroke-[2.5] shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
