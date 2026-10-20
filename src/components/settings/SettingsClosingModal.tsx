import React from 'react';
import { createPortal } from 'react-dom';

interface SettingsClosingModalProps {
  lang: string;
}

export const SettingsClosingModal: React.FC<SettingsClosingModalProps> = ({ lang }) => {
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="border-4 border-black bg-[#fbf8f0] p-8 max-w-sm text-center shadow-[6px_6px_0px_#000] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin text-3xl">
          <svg className="w-8 h-8 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2L14 5H10L12 2Z" />
            <path d="M12 22L10 19H14L12 22Z" />
            <path d="M22 12L19 14V10L22 12Z" />
            <path d="M2 12L5 10V14L2 12Z" />
            <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
            <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
            <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
            <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
          </svg>
        </div>
        <span className="font-cactus font-bold text-sm tracking-wider uppercase animate-pulse">
          {lang === 'fr' ? "Fermeture de l'Atelier..." : 'Fechando A Oficina...'}
        </span>
      </div>
    </div>,
    document.body
  );
};
