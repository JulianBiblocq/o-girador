import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface VisitorAuthModalProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
  isMandatory?: boolean;
}

export const VisitorAuthModal: React.FC<VisitorAuthModalProps> = ({ onClose, lang, isMandatory = false }) => {
  const { signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    await signInWithGoogle();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={!isMandatory ? onClose : undefined}>
      <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-8 max-w-md w-full shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
        {!isMandatory && (
          <button onClick={onClose} className="absolute top-4 right-4 text-2xl font-bold text-[#1a1a1a] hover:text-[#8b2a1a]">×</button>
        )}
        
        <div className="text-center flex flex-col gap-2 mt-4">
          <span className="text-5xl mb-2">🔒</span>
          <h2 className="font-cactus text-3xl font-black text-[#1a1a1a] uppercase leading-none">
            {lang === 'fr' ? 'La suite est réservée aux membres !' : 'O resto é reservado para membros!'}
          </h2>
        </div>
        
        <div className="bg-[#eaddcf] border-2 border-[#1a1a1a] p-4 text-[#1a1a1a]">
          <p className="font-bold mb-3 text-center">
            {lang === 'fr' 
              ? 'Créez un compte gratuit pour :' 
              : 'Crie uma conta gratuita para:'}
          </p>
          <ul className="text-sm flex flex-col gap-2 text-left font-semibold">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🎵</span> {lang === 'fr' ? 'Écouter ce morceau en entier' : 'Ouvir esta música na íntegra'}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🎛️</span> {lang === 'fr' ? 'Tester le séquenceur et créer vos rythmes' : 'Testar o sequenciador e criar seus ritmos'}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🌍</span> {lang === 'fr' ? 'Ajouter votre groupe sur la carte du monde' : 'Adicionar seu grupo no mapa mundial'}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">📱</span> {lang === 'fr' ? 'Découvrir nos applications de gestion' : 'Descobrir nossos aplicativos de gestão'}
            </li>
          </ul>
        </div>

        <div className="flex justify-center mt-2">
          <button
            onClick={handleSignIn}
            className="w-full py-4 bg-[#8b2a1a] text-[#f4ecd8] font-black text-lg tracking-widest uppercase text-center border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-[#6b1e11] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
          >
            {lang === 'fr' ? 'Se connecter' : 'Conectar-se'}
          </button>
        </div>
      </div>
    </div>
  );
};