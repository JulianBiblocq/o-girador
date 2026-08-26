import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface VisitorAuthModalProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const VisitorAuthModal: React.FC<VisitorAuthModalProps> = ({ onClose, lang }) => {
  const { signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    await signInWithGoogle();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-8 max-w-md w-full shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl font-bold text-[#1a1a1a] hover:text-[#8b2a1a]">×</button>
        
        <div className="text-center flex flex-col gap-2 mt-4">
          <span className="text-5xl mb-2">🔒</span>
          <h2 className="font-cactus text-3xl font-black text-[#1a1a1a] uppercase leading-none">
            {lang === 'fr' ? 'Compte Requis' : 'Conta Necessária'}
          </h2>
        </div>
        
        <div className="bg-[#eaddcf] border-2 border-[#1a1a1a] p-4 text-center font-bold text-[#1a1a1a]">
          <p>
            {lang === 'fr' 
              ? 'Créez un compte gratuit pour sauvegarder vos rythmes.' 
              : 'Crie uma conta gratuita para salvar seus ritmos.'}
          </p>
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