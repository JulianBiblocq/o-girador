/**
 * Modale Cordel pour les alertes et saisies de clé du scanner papier (< 95 lignes).
 * Rendu en portail z-[100050]. Zéro alert/prompt natif.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, KeyRound, AlertTriangle } from 'lucide-react';

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
  const [val, setVal] = useState(defaultValue);
  if (!isOpen || typeof document === 'undefined') return null;

  const isFr = lang === 'fr';
  const defaultTitle = type === 'prompt_key'
    ? (isFr ? 'CLÉ DU SERVICE DE NUMÉRISATION' : 'CHAVE DO SERVIÇO DE ESCANEAMENTO')
    : (isFr ? 'NOTIFICATION DE NUMÉRISATION' : 'AVISO DE ESCANEAMENTO');

  const handleClose = () => { onCancel?.(); onClose(); };
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (type === 'prompt_key') onConfirm?.(val.trim());
    else handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100050] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] rounded-none p-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-150 font-serif">
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2 mb-3">
          <div className="flex items-center gap-2">
            {type === 'prompt_key' ? <KeyRound size={18} className="text-[#8b2a1a]" /> : <AlertTriangle size={18} className="text-[#8b2a1a]" />}
            <span className="font-bold text-xs uppercase tracking-wider">{title || defaultTitle}</span>
          </div>
          <button type="button" onClick={handleClose} className="p-1 hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-relaxed mb-3">{message}</p>

        {techCode && (
          <div className="text-[11px] font-mono opacity-70 bg-[#e8dcbf] p-2 border border-[#1a1a1a]/30 mb-3">
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
              className="w-full border-2 border-[#1a1a1a] bg-white px-3 py-2 text-sm font-mono mb-4 outline-none focus:border-[#8b2a1a]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="px-4 py-2 border-2 border-[#1a1a1a] font-bold text-xs uppercase bg-[#e8dcbf] hover:bg-[#dbcbaa] transition-colors">
                {isFr ? 'Annuler' : 'Cancelar'}
              </button>
              <button type="submit" className="px-4 py-2 border-2 border-[#1a1a1a] font-bold text-xs uppercase bg-[#1a1a1a] text-[#f4ecd8] hover:bg-[#8b2a1a] transition-colors">
                {isFr ? 'Valider' : 'Confirmar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end mt-4">
            <button type="button" onClick={handleClose} className="w-full px-4 py-2 border-2 border-[#1a1a1a] font-bold text-xs uppercase bg-[#1a1a1a] text-[#f4ecd8] hover:bg-[#8b2a1a] transition-colors">
              {isFr ? 'Fermer' : 'Fechar'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
