import React from 'react';
import { createPortal } from 'react-dom';
import { Scroll, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';

interface LyricsAuthorshipModalProps {
  onClose: () => void;
}

export const LyricsAuthorshipModal: React.FC<LyricsAuthorshipModalProps> = ({ onClose }) => {
  const { userProfile } = useAuth();
  const lang = useSequencerStore((state) => state.lang) || 'fr';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        className="bg-[var(--cordel-bg,#f4ecd8)] border-4 border-[#1a1a1a] p-6 max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 relative text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-[#1a1a1a] hover:text-[#8b2a1a] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="text-center flex flex-col items-center gap-2 mt-1">
          <Scroll size={36} className="text-[#8b2a1a] mb-1" />
          <h2 className="font-cactus text-2xl font-black text-[#1a1a1a] uppercase leading-tight">
            {lang === 'fr' ? 'Votre poésie voyage dans la Roda !' : 'Sua poesia viaja na Roda!'}
          </h2>
        </div>

        <p className="text-center font-bold text-xs text-[#1a1a1a]/80">
          {lang === 'fr'
            ? 'Si vous êtes le créateur original de ce texte partagé dans la Roda, que souhaitez-vous faire ?'
            : 'Se você é o criador original deste texto compartilhado na Roda, o que deseja fazer?'}
        </p>

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            type="button"
            className="w-full py-2.5 px-4 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black transition-colors cursor-pointer"
            onClick={handleClaimAuthorship}
          >
            {lang === 'fr' ? "M'attribuer la création (Lier à mon profil)" : 'Reivindicar autoria (Vincular ao meu perfil)'}
          </button>

          <button
            type="button"
            className="w-full py-2 px-4 bg-transparent text-[#1a1a1a] border-2 border-[#1a1a1a] border-dashed font-cactus font-bold text-xs uppercase tracking-wider hover:bg-black/5 transition-colors cursor-pointer opacity-80 hover:opacity-100"
            onClick={handleRemoveLyrics}
          >
            {lang === 'fr' ? 'Retirer ce texte du morceau' : 'Remover esta letra da música'}
          </button>

          <button
            type="button"
            className="w-full py-1 text-[#1a1a1a] font-cactus font-bold text-xs uppercase tracking-wider hover:underline opacity-60 hover:opacity-100 cursor-pointer"
            onClick={onClose}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
