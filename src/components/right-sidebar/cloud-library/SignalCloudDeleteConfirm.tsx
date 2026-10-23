/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../../types';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmProps {
  toast: ToastState | null;
  onCloseToast: () => void;
  signalToDelete: { id: string; mestreId: string; name: string } | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  isDeletingSignal: boolean;
  lang: Language;
}

export const SignalCloudDeleteConfirm: React.FC<ConfirmProps> = ({
  toast,
  onCloseToast,
  signalToDelete,
  onCancelDelete,
  onConfirmDelete,
  isDeletingSignal,
  lang,
}) => {
  return (
    <>
      {toast && (
        <div
          role="status"
          className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2.5 flex items-start justify-between gap-2 text-xs font-bold animate-fade-in select-none my-1"
        >
          <div className="flex items-start gap-2 flex-1">
            <span className="text-sm shrink-0">
              {toast.type === 'error' ? '' : toast.type === 'success' ? '' : ''}
            </span>
            <span className="leading-tight font-cactus tracking-wide pt-0.5 break-words">
              {toast.message}
            </span>
          </div>
          <button
            onClick={onCloseToast}
            className="text-sm font-black hover:opacity-75 cursor-pointer leading-none px-1 text-[#1a1a1a]"
            title={lang === 'fr' ? 'Fermer' : 'Fechar'}
          >
            ✕
          </button>
        </div>
      )}

      {signalToDelete && (
        <div className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-3 flex flex-col gap-2 my-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base"></span>
            <span className="font-cactus text-xs font-bold tracking-wide">
              {lang === 'fr'
                ? `Supprimer définitivement le signal "${signalToDelete.name}" ?`
                : `Excluir definitivamente o sinal "${signalToDelete.name}"?`}
            </span>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={onCancelDelete}
              disabled={isDeletingSignal}
              className="px-2.5 py-1 bg-white text-[#1a1a1a] border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-[10px] font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-50"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={isDeletingSignal}
              className="px-2.5 py-1 bg-[#8b2a1a] text-white border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-[10px] font-bold cursor-pointer hover:bg-red-800 disabled:opacity-50 flex items-center gap-1"
            >
              {isDeletingSignal ? '...' : (lang === 'fr' ? 'Supprimer' : 'Excluir')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
