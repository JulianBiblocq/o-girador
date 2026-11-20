import React from 'react';

interface SavePresetActionButtonsProps {
  onClose: () => void;
  handleSave: (opts?: { forceNew: boolean }) => void;
  isExistingPreset: boolean;
  canUpdate: boolean;
  isForeignActivePreset?: boolean;
  hasMestreNameConflict?: boolean;
  name: string;
  isSaving: boolean;
  isBouncingCloud: boolean;
  hasUser: boolean;
  isMestre: boolean;
  isLocked: boolean;
  isSavedOnCloud?: boolean;
  lang: 'fr' | 'pt';
}

export const SavePresetActionButtons: React.FC<SavePresetActionButtonsProps> = ({
  onClose,
  handleSave,
  isExistingPreset,
  canUpdate,
  isForeignActivePreset = false,
  hasMestreNameConflict = false,
  name,
  isSaving,
  isBouncingCloud,
  hasUser,
  isMestre,
  isLocked,
  lang,
}) => {
  const busy = isSaving || isBouncingCloud;
  const canSave = Boolean(name.trim()) && !busy && hasUser && !hasMestreNameConflict;
  const allowOverwrite = isExistingPreset && canUpdate && !isForeignActivePreset;

  const newPresetLabel = isForeignActivePreset
    ? (lang === 'fr' ? 'Créer un nouveau morceau' : 'Criar nova música')
    : (lang === 'fr' ? 'Sauvegarder le morceau' : 'Salvar música');

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t-2 border-[var(--cordel-border)]">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-surface)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs cursor-pointer"
        disabled={busy}
      >
        {lang === 'fr' ? 'Annuler' : 'Cancelar'}
      </button>

      {allowOverwrite ? (
        <>
          <button
            type="button"
            onClick={() => handleSave({ forceNew: true })}
            disabled={!canSave}
            className="px-3 py-2 bg-[var(--cordel-surface)] text-[var(--cordel-text)] font-bold border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-surface-elevated)] transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] text-xs disabled:opacity-50 cursor-pointer"
            title={lang === 'fr' ? 'Sauvegarder comme nouvelle copie' : 'Salvar como nova cópia'}
          >
            {lang === 'fr' ? 'Sauvegarder une copie' : 'Salvar como cópia'}
          </button>

          <button
            type="button"
            onClick={() => handleSave({ forceNew: false })}
            disabled={!canSave || (!isMestre && isLocked)}
            className="px-4 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold disabled:opacity-50 hover:bg-[var(--cordel-accent)] transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex items-center justify-center min-w-[140px] text-xs uppercase cursor-pointer"
            title={
              !hasUser
                ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar')
                : (!isMestre && isLocked)
                ? (lang === 'fr' ? 'Morceau verrouillé par le Mestre' : 'Música bloqueada pelo Mestre')
                : ''
            }
          >
            {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : (lang === 'fr' ? 'Mettre à jour le morceau' : 'Atualizar música')}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => handleSave({ forceNew: true })}
          disabled={!canSave}
          className="px-4 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold disabled:opacity-50 hover:bg-[var(--cordel-accent)] transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex items-center justify-center min-w-[140px] text-xs uppercase cursor-pointer"
          title={
            !hasUser
              ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar')
              : hasMestreNameConflict
              ? (lang === 'fr' ? 'Saisissez un titre distinct de celui du Mestre' : 'Digite um título distinto do Mestre')
              : ''
          }
        >
          {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : newPresetLabel}
        </button>
      )}
    </div>
  );
};
