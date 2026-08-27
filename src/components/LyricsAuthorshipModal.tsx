import React from 'react';
import { createPortal } from 'react-dom';

interface LyricsAuthorshipModalProps {
  onClose: () => void;
}

export const LyricsAuthorshipModal: React.FC<LyricsAuthorshipModalProps> = ({ onClose }) => {
  // Optionnel : Gestion de l'affichage en fonction de la langue globale
  // const lang = useSequencerStore(state => state.lang);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[var(--cordel-bg)] border-4 border-[#1a1a1a] p-8 max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-2xl font-bold text-[#1a1a1a] hover:text-[#8b2a1a] transition-colors"
        >
          ×
        </button>
        
        <div className="text-center flex flex-col gap-4 mt-2">
          <span className="text-5xl mb-2">📜</span>
          <h2 className="font-cactus text-3xl font-black text-[#1a1a1a] uppercase leading-none">
            Il semble que votre poésie voyage dans la Roda !
          </h2>
        </div>
        
        <div className="text-center font-bold text-[#1a1a1a]">
          <p>
            Si vous êtes le créateur original de ce texte partagé par un autre utilisateur, que souhaitez-vous faire ?
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button 
            className="w-full py-3 px-4 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm uppercase tracking-wider cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
            onClick={() => {
              // TODO: Implémenter la logique d'attribution
              alert("L'attribution de création sera bientôt disponible.");
              onClose();
            }}
          >
            M'attribuer la création (Lier ce texte à mon profil)
          </button>
          
          <button 
            className="w-full py-2 px-4 bg-transparent text-[#1a1a1a] border-2 border-[#1a1a1a] border-dashed font-bold text-xs uppercase tracking-wider hover:bg-black/5 transition-colors opacity-70 hover:opacity-100"
            onClick={() => {
              // TODO: Implémenter la logique de retrait
              alert("La demande de retrait sera bientôt disponible.");
              onClose();
            }}
          >
            Retirer ce texte du catalogue public
          </button>
          
          <button 
            className="w-full py-2 text-[#1a1a1a] font-bold text-xs uppercase tracking-wider hover:underline opacity-60 hover:opacity-100 mt-2"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
