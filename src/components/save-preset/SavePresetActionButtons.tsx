/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SavePresetActionButtonsProps {
  onClose: () => void;
  handleSave: (opts?: { forceNew: boolean }) => void;
  isExistingPreset: boolean;
  name: string;
  isSaving: boolean;
  isBouncingCloud: boolean;
  hasUser: boolean;
  isMestre: boolean;
  isLocked: boolean;
  lang: 'fr' | 'pt';
}

export const SavePresetActionButtons: React.FC<SavePresetActionButtonsProps> = ({
  onClose,
  handleSave,
  isExistingPreset,
  name,
  isSaving,
  isBouncingCloud,
  hasUser,
  isMestre,
  isLocked,
  lang,
}) => {
  const busy = isSaving || isBouncingCloud;
  const canSave = Boolean(name.trim()) && !busy && hasUser;

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t-2 border-[var(--cordel-border,#1a1a1a)]">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 font-bold hover:bg-black/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        disabled={busy}
      >
        {lang === 'fr' ? 'Annuler' : 'Cancelar'}
      </button>

      {isExistingPreset ? (
        <>
          <button
            type="button"
            onClick={() => handleSave({ forceNew: true })}
            disabled={!canSave}
            className="px-3 py-2 bg-stone-200 text-stone-900 font-bold border-2 border-[var(--cordel-border,#1a1a1a)] hover:bg-stone-300 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs disabled:opacity-50"
            title={lang === 'fr' ? 'Sauvegarder comme nouvelle copie' : 'Salvar como nova cópia'}
          >
            {lang === 'fr' ? 'Sauvegarder une copie' : 'Salvar como cópia'}
          </button>

          <button
            type="button"
            onClick={() => handleSave({ forceNew: false })}
            disabled={!canSave || (!isMestre && isLocked)}
            className="px-4 py-2 bg-[var(--cordel-wood,#8b2a1a)] text-[#f4ecd8] font-bold disabled:opacity-50 hover:brightness-90 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[140px] text-xs uppercase"
            title={
              !hasUser
                ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar')
                : (!isMestre && isLocked)
                ? (lang === 'fr' ? 'Morceau verrouillé par le Mestre' : 'Música bloqueada pelo Mestre')
                : ''
            }
          >
            {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : (lang === 'fr' ? 'Mettre à jour le morceau existant' : 'Atualizar música existente')}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={!canSave}
          className="px-4 py-2 bg-[var(--cordel-wood,#8b2a1a)] text-[#f4ecd8] font-bold disabled:opacity-50 hover:brightness-90 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px] text-xs uppercase"
          title={!hasUser ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
        >
          {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
        </button>
      )}
    </div>
  );
};
