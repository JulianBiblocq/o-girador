import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatDispositionSummary } from '../../utils/dispositionUtils';
import { guardFeatureWithModal } from '../../utils/cloudWriteGuard';
import { SaveDispositionVisibilitySelector } from './save-disposition/SaveDispositionVisibilitySelector';
import { useSaveDispositionAction } from './save-disposition/useSaveDispositionAction';

interface SaveDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'pt';
  onSuccess?: (presetName: string) => void;
}

export const SaveDispositionModal: React.FC<SaveDispositionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
}) => {
  const {
    name, setName, visibility, setVisibility, isSubmitting, errorMsg,
    handleSave, hasGroup, isMestreOrAdmin, userProfile, placedInstruments, hasToada, hasApito,
  } = useSaveDispositionAction({ lang, onSuccess, onClose });

  useEffect(() => {
    if (!isOpen) return;
    if (!guardFeatureWithModal('cloud_library', userProfile)) {
      onClose();
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose, userProfile]);

  if (!isOpen) return null;

  const summary = formatDispositionSummary(
    placedInstruments.map((i) => ({ instrumentType: i.instrumentType, x: i.x, y: i.y })),
    lang
  );
  const modalRoot = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div data-wizard-submodal="true" className="fixed inset-0 z-[100028] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-5 shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 font-cactus" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[var(--cordel-border-strong)] pb-2">
          <h3 className="text-lg md:text-xl font-bold uppercase tracking-wide">
            {lang === 'fr' ? 'Enregistrer la Disposition' : 'Salvar a Disposição'}
          </h3>
          <button onClick={onClose} type="button" aria-label="Fermer" className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"><X size={18} /></button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Nom de la disposition :' : 'Nome da disposição :'}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'fr' ? 'Ex: Batuque de Rue' : 'Ex: Batuque de Rua'}
              autoFocus
              className="w-full bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] px-3 py-2 text-sm font-bold outline-none focus:border-[var(--cordel-accent-readable)] font-sans"
            />
          </div>

          <div className="p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-[11px] flex flex-col gap-1 font-sans">
            <span className="font-bold uppercase tracking-wider text-[var(--cordel-accent-readable)] font-cactus">{lang === 'fr' ? 'Configuration actuelle :' : 'Configuração atual :'}</span>
            <span className="leading-tight text-[var(--cordel-text)]">{summary}</span>
            {hasToada && <span className="text-[10px] text-[var(--cordel-status-success)] font-bold mt-0.5">{lang === 'fr' ? 'Chant / Toada inclus' : 'Canto / Toada incluído'}</span>}
            {hasApito && <span className="text-[10px] text-[var(--cordel-accent-readable)] font-bold mt-0.5">{lang === 'fr' ? 'Apito du Mestre inclus (Centre)' : 'Apito do Mestre incluído (Centro)'}</span>}
          </div>

          <SaveDispositionVisibilitySelector
            visibility={visibility}
            onChange={setVisibility}
            hasGroup={hasGroup}
            groupName={userProfile?.groupName || userProfile?.groupId}
            isMestreOrAdmin={isMestreOrAdmin}
            lang={lang}
          />

          {errorMsg && <div className="p-2 bg-[var(--cordel-status-danger)]/20 border-2 border-[var(--cordel-status-danger)] text-[var(--cordel-accent-readable)] text-xs font-bold font-sans">{errorMsg}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-[var(--cordel-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer uppercase font-bold text-xs">{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
            <button type="submit" disabled={isSubmitting || (placedInstruments.length === 0 && !hasApito)} className="px-4 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer uppercase font-bold text-xs disabled:opacity-50">
              {isSubmitting ? (lang === 'fr' ? 'Enregistrement...' : 'Salvando...') : lang === 'fr' ? 'Enregistrer' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};
