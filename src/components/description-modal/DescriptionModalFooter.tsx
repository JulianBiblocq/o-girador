
import React from 'react';
import { Language } from '../../types';

interface FooterProps {
  isEditing: boolean;
  lang: Language;
  onCancelEdit: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const DescriptionModalFooter: React.FC<FooterProps> = ({
  isEditing,
  lang,
  onCancelEdit,
  onSave,
  onClose,
}) => {
  return (
    <div className="p-3 sm:p-4 border-t-3 border-[#1a1a1a] bg-[#ebe2cb] flex items-center justify-between gap-3 shrink-0">
      <div className="text-[10px] text-[#1a1a1a]/60 font-bold">
        {isEditing && (
          <span>
            {lang === 'fr' ? "Les modifications ne s'appliquent qu'au clic sur Enregistrer." : 'As alterações só são salvas ao clicar em Salvar.'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-1.5 bg-[#fcf9f2] hover:bg-[#1a1a1a]/10 text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#1a1a1a]"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#8b2a1a]"
            >
              {lang === 'fr' ? 'Enregistrer' : 'Salvar'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#8b2a1a]"
          >
            {lang === 'fr' ? 'Fermer' : 'Fechar'}
          </button>
        )}
      </div>
    </div>
  );
};
