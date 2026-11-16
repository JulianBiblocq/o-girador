import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Scroll, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePortalRoot, useWindow } from '../contexts/WindowContext';
import { useSequencerStore } from '../stores/useSequencerStore';

interface LyricsAuthorshipModalProps {
  onClose: () => void;
}

export const LyricsAuthorshipModal: React.FC<LyricsAuthorshipModalProps> = ({ onClose }) => {
  const { userProfile } = useAuth();
  const portalRoot = usePortalRoot();
  const hostWin = useWindow();
  const lang = useSequencerStore((state) => state.lang) || 'fr';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    hostWin.addEventListener('keydown', onKey, { capture: true });
    return () => hostWin.removeEventListener('keydown', onKey, { capture: true });
  }, [hostWin, onClose]);

  const handleClaimAuthorship = () => {
    const authorName = userProfile?.displayName || userProfile?.email?.split('@')[0] || (lang === 'fr' ? 'Auteur vérifié' : 'Autor verificado');
    const store = useSequencerStore.getState();
    const currentMeta = store.metadata || ({} as any);
    store.setMetadata({ ...currentMeta, compositor: authorName });
    const msg = lang === 'fr' ? `Paternité attribuée à ${authorName} !` : `Autoria atribuída a ${authorName}!`;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
    onClose();
  };

  const handleRemoveLyrics = () => {
    useSequencerStore.getState().setLetras('');
    const msg = lang === 'fr' ? 'Paroles retirées du morceau.' : 'Letras removidas da música.';
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'info', message: msg } }));
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100040] flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border-strong)] p-6 max-w-md w-full shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 relative text-[var(--cordel-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-[var(--cordel-text)] hover:text-[var(--cordel-accent)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="text-center flex flex-col items-center gap-2 mt-1">
          <Scroll size={36} className="text-[var(--cordel-accent)] mb-1" />
          <h2 className="font-cactus text-2xl font-black text-[var(--cordel-text)] uppercase leading-tight">
            {lang === 'fr' ? 'Votre poésie voyage dans la Roda !' : 'Sua poesia viaja na Roda!'}
          </h2>
        </div>

        <p className="text-center font-bold text-xs text-[var(--cordel-text)] opacity-80">
          {lang === 'fr'
            ? 'Si vous êtes le créateur original de ce texte partagé dans la Roda, que souhaitez-vous faire ?'
            : 'Se você é o criador original deste texto compartilhado na Roda, o que deseja fazer?'}
        </p>

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            type="button"
            className="w-full py-2.5 px-4 bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-xs uppercase tracking-wider border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-wood)] transition-colors cursor-pointer"
            onClick={handleClaimAuthorship}
          >
            {lang === 'fr' ? "M'attribuer la création (Lier à mon profil)" : 'Reivindicar autoria (Vincular ao meu perfil)'}
          </button>

          <button
            type="button"
            className="w-full py-2 px-4 bg-transparent text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] border-dashed font-cactus font-bold text-xs uppercase tracking-wider hover:bg-[var(--cordel-surface)] transition-colors cursor-pointer opacity-80 hover:opacity-100"
            onClick={handleRemoveLyrics}
          >
            {lang === 'fr' ? 'Retirer ce texte du morceau' : 'Remover esta letra da música'}
          </button>

          <button
            type="button"
            className="w-full py-1 text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase tracking-wider hover:underline opacity-60 hover:opacity-100 cursor-pointer"
            onClick={onClose}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
};
