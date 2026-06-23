import React from 'react';

interface SubscriptionModalProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, lang }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-8 max-w-md w-full shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl font-bold text-[#1a1a1a] hover:text-[#8b2a1a]">×</button>
        
        <div className="text-center flex flex-col gap-2">
          <span className="text-5xl mb-2">⭐</span>
          <h2 className="font-cactus text-3xl font-black text-[#1a1a1a] uppercase leading-none">
            {lang === 'fr' ? 'Limite Atteinte' : 'Limite Atingido'}
          </h2>
        </div>
        
        <div className="bg-[#eaddcf] border-2 border-[#1a1a1a] p-4 text-center font-bold text-[#1a1a1a] flex flex-col gap-2">
          <p>
            {lang === 'fr' 
              ? 'Vous avez atteint la limite de 20 mesures de la version gratuite.' 
              : 'Você atingiu o limite de 20 compassos da versão gratuita.'}
          </p>
          <p className="text-[#8b2a1a]">
            {lang === 'fr'
              ? 'Pour composer des morceaux complets sans limite de taille, devenez Mestre !'
              : 'Para compor músicas completas sem limite de tamanho, torne-se Mestre!'}
          </p>
        </div>

        <div className="flex justify-center mt-2">
          <a
            href="mailto:contact@ogirador.com?subject=Demande d'abonnement Mestre"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#8b2a1a] text-[#f4ecd8] font-black text-lg tracking-widest uppercase text-center border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-[#6b1e11] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
          >
            {lang === 'fr' ? 'Devenir Mestre' : 'Tornar-se Mestre'}
          </a>
        </div>
        
        <p className="text-xs text-center font-bold text-[#666] mt-2">
          {lang === 'fr'
            ? 'Envoyez-nous un message pour activer votre compte Mestre annuel.'
            : 'Envie-nos uma mensagem para ativar sua conta Mestre anual.'}
        </p>
      </div>
    </div>
  );
};
