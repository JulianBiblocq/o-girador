import React from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';

interface NewSongIntroModalProps {
  onClose: () => void;
  onClearSong: () => void;
  onStartWizard: () => void;
  lang: Language;
}

export const NewSongIntroModal: React.FC<NewSongIntroModalProps> = ({
  onClose,
  onClearSong,
  onStartWizard,
  lang,
}) => {
  const modalRoot = document.getElementById('modal-root') || document.body;

  const content = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-6 md:p-8 max-w-xl w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#1a1a1a] hover:text-[#8b2a1a] font-bold text-2xl hover:scale-110 duration-200 cursor-pointer"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* En-tête */}
        <div className="border-b-4 border-[#1a1a1a] pb-3 pr-8">
          <h3 className="font-cactus text-3xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider">
            {lang === 'fr' ? 'Nouveau Morceau' : 'Nova Toada'}
          </h3>
          <p className="text-[#1a1a1a]/70 text-xs md:text-sm mt-1 font-cactus font-bold tracking-wide uppercase">
            {lang === 'fr' 
              ? 'Choisissez comment démarrer votre création dans la Roda' 
              : 'Escolha como iniciar sua criação na Roda'}
          </p>
        </div>

        {/* Description / Introduction */}
        <div className="text-sm text-[#1a1a1a] leading-relaxed border-2 border-dashed border-[#1a1a1a]/30 p-4 bg-white/30 rounded-sm">
          {lang === 'fr' ? (
            <p>
              Prêt à lancer un nouveau rythme ? Vous pouvez commencer sur une ardoise complètement vierge ou vous laisser guider pas à pas par le <strong>Mestre</strong> pour configurer vos instruments, votre tempo et votre structure.
            </p>
          ) : (
            <p>
              Pronto para começar um novo ritmo? Você pode começar com uma tela completamente limpa ou deixar-se guiar passo a passo pelo <strong>Mestre</strong> para configurar seus instrumentos, andamento e estrutura.
            </p>
          )}
        </div>

        {/* Boutons d'options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Option A : Roda vide */}
          <button
            onClick={onClearSong}
            className="flex flex-col items-center justify-between p-5 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-center group min-h-[140px]"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 duration-200">🫙</div>
            <div className="font-cactus text-lg font-bold text-[#1a1a1a] uppercase tracking-wider">
              {lang === 'fr' ? 'Créer Roda vide' : 'Criar Roda vazia'}
            </div>
            <div className="text-[11px] text-[#1a1a1a]/70 mt-1 leading-snug">
              {lang === 'fr' 
                ? 'Efface tout et commence avec un projet vide.' 
                : 'Apaga tudo e começa com um projeto vazio.'}
            </div>
          </button>

          {/* Option B : Assistant du Mestre */}
          <button
            onClick={onStartWizard}
            className="flex flex-col items-center justify-between p-5 bg-[#8b2a1a] text-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-center group min-h-[140px]"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 duration-200">👑</div>
            <div className="font-cactus text-lg font-bold uppercase tracking-wider">
              {lang === 'fr' ? 'Assistant du Mestre' : 'Assistente do Mestre'}
            </div>
            <div className="text-[11px] text-[#f4ecd8]/80 mt-1 leading-snug">
              {lang === 'fr' 
                ? 'Laisse-toi guider pas à pas par le mestre.' 
                : 'Deixe-se guiar passo a passo pelo mestre.'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
};
