import React from 'react';
import { Language } from '../../types';

interface BalancoFeedbackModalProps {
  feedback: {
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null;
  lang: Language;
  onClose: () => void;
}

export const BalancoFeedbackModal: React.FC<BalancoFeedbackModalProps> = ({
  feedback,
  lang,
  onClose,
}) => {
  if (!feedback) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[300] flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-5 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
          <div className="flex items-center gap-2">
                        <h4 className="font-cactus text-xl font-bold uppercase">{feedback.title}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer">
            
          </button>
        </div>

        <p className="text-xs leading-relaxed font-bold bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
          {feedback.message}
        </p>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-sm border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            {lang === 'fr' ? 'D’accord' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
};
