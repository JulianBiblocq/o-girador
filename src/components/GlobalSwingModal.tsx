import React from 'react';
import { Sliders, X } from 'lucide-react';
import { GlobalSwing, Language } from '../types';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { BalancoEditorPanel } from './balanco/BalancoEditorPanel';

interface GlobalSwingModalProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  onClose: () => void;
  lang: Language;
}

export const GlobalSwingModal: React.FC<GlobalSwingModalProps> = ({
  globalSwing,
  setGlobalSwing,
  onClose,
  lang,
}) => {
  const handleOpenFullGrooveOficina = () => {
    onClose();
    useSequencerSettingsStore.getState().openOficinaSection('groove');
  };

  return (
    <div
      className="fixed inset-0 bg-[var(--cordel-shadow-color)] backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[3px] border-[var(--cordel-border)] p-5 max-w-lg w-full rounded-sm shadow-[6px_6px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-3 border-b-2 border-[var(--cordel-border)] pb-2.5">
          <h3 className="font-cactus text-2xl font-bold text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Balanço Général' : 'Balanço Geral'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="global-swing-open-oficina-btn"
              onClick={handleOpenFullGrooveOficina}
              className="px-2.5 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shadow-[2px_2px_0px_var(--cordel-shadow-color)]"
            >
              <Sliders size={13} className="shrink-0" />
              <span>{lang === 'fr' ? "Ouvrir l'Atelier Groove complet" : 'Abrir o Ateliê Groove completo'}</span>
            </button>
            <button
              type="button"
              data-testid="global-swing-close-btn"
              onClick={onClose}
              aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
              title={lang === 'fr' ? 'Fermer' : 'Fechar'}
              className="w-8 h-8 flex items-center justify-center bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-card-btn-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)]"
            >
              <X size={16} className="shrink-0" />
            </button>
          </div>
        </div>

        <BalancoEditorPanel
          globalSwing={globalSwing}
          setGlobalSwing={setGlobalSwing}
          lang={lang}
        />
      </div>
    </div>
  );
};
