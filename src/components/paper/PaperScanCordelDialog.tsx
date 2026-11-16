/**
 * Modale Cordel pour les alertes et saisies de clé du scanner papier (< 95 lignes).
 * Rendu en portail z-[100050]. Zéro alert/prompt natif.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, KeyRound, AlertTriangle } from 'lucide-react';
import { usePortalRoot, useWindow } from '../../contexts/WindowContext';

export interface CordelDialogState {
  isOpen: boolean;
  type: 'error' | 'prompt_key';
  title?: string;
  message: string;
  techCode?: string;
  defaultValue?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface Props extends CordelDialogState {
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const PaperScanCordelDialog: React.FC<Props> = ({
  isOpen, type, title, message, techCode, defaultValue = '', onConfirm, onCancel, onClose, lang = 'fr',
}) => {
  const portalRoot = usePortalRoot();
  const hostWin = useWindow();
  const [val, setVal] = useState(defaultValue);

  const handleClose = useCallback(() => { onCancel?.(); onClose(); }, [onCancel, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handleClose(); }
    };
    hostWin.addEventListener('keydown', onKey, { capture: true });
    return () => hostWin.removeEventListener('keydown', onKey, { capture: true });
  }, [isOpen, hostWin, handleClose]);

  if (!isOpen || !portalRoot) return null;

  const isFr = lang === 'fr';
  const defaultTitle = type === 'prompt_key'
    ? (isFr ? 'CLÉ DU SERVICE DE NUMÉRISATION' : 'CHAVE DO SERVIÇO DE ESCANEAMENTO')
    : (isFr ? 'NOTIFICATION DE NUMÉRISATION' : 'AVISO DE ESCANEAMENTO');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (type === 'prompt_key') onConfirm?.(val.trim());
    else handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100050] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] rounded-none p-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-150 font-serif">
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2 mb-3">
          <div className="flex items-center gap-2">
            {type === 'prompt_key' ? <KeyRound size={18} className="text-[var(--cordel-accent)]" /> : <AlertTriangle size={18} className="text-[var(--cordel-accent)]" />}
            <span className="font-bold text-xs uppercase tracking-wider">{title || defaultTitle}</span>
          </div>
          <button type="button" onClick={handleClose} className="p-1 hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-relaxed mb-3">{message}</p>

        {techCode && (
          <div className="text-[11px] font-mono opacity-75 bg-[var(--cordel-surface)] p-2 border border-[var(--cordel-border)] mb-3">
            Code : {techCode}
          </div>
        )}

        {type === 'prompt_key' ? (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Collez votre clé ici..."
              className="w-full border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] px-3 py-2 text-sm font-mono mb-4 outline-none focus:border-[var(--cordel-accent)]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="px-4 py-2 border-2 border-[var(--cordel-border)] font-bold text-xs uppercase bg-[var(--cordel-surface)] hover:bg-[var(--cordel-bg)] transition-colors cursor-pointer">
                {isFr ? 'Annuler' : 'Cancelar'}
              </button>
              <button type="submit" className="px-4 py-2 border-2 border-[var(--cordel-border-strong)] font-bold text-xs uppercase bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] transition-colors cursor-pointer">
                {isFr ? 'Valider' : 'Confirmar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end mt-4">
            <button type="button" onClick={handleClose} className="w-full px-4 py-2 border-2 border-[var(--cordel-border-strong)] font-bold text-xs uppercase bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] transition-colors cursor-pointer">
              {isFr ? 'Fermer' : 'Fechar'}
            </button>
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
};
