import React from 'react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';

interface BalancoDeleteConfirmModalProps {
  preset: BalancoPreset | null;
  lang: Language;
  onCancel: () => void;
  onConfirm: () => void;
}

export const BalancoDeleteConfirmModal: React.FC<BalancoDeleteConfirmModalProps> = ({
  preset,
  lang,
  onCancel,
  onConfirm,
}) => {
  if (!preset) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[300] flex items-center justify-center p-4 select-none"
      onClick={onCancel}
    >
      <div
        className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-5 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <h4 className="font-cactus text-xl font-bold uppercase text-[#8b2a1a]">
              {lang === 'fr' ? 'Supprimer ce Balanço ?' : 'Excluir este Balanço?'}
            </h4>
          </div>
          <button type="button" onClick={onCancel} className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 text-xs font-bold bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
          <p>
            {lang === 'fr'
              ? 'Êtes-vous sûr de vouloir supprimer définitivement le preset suivant :'
              : 'Tem certeza de que deseja excluir definitivamente o seguinte preset:'}
          </p>
          <div className="p-2 bg-white border border-black text-center font-cactus text-base font-bold text-[#8b2a1a]">
            « {preset.name} »
          </div>
          <p className="text-[10px] opacity-80 leading-tight">
            {lang === 'fr'
              ? 'Cette action supprimera le preset de votre mémoire locale et de la collection Cloud (/balancos). Cette action est irréversible.'
              : 'Esta ação excluirá o preset da sua memória local e da coleção Nuvem (/balancos). Esta ação é irreversível.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-white border-2 border-black font-cactus font-bold text-xs shadow-[1.5px_1.5px_0px_#000] hover:bg-[#eaddcf] transition-colors cursor-pointer"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            🗑️ {lang === 'fr' ? 'Supprimer définitivement' : 'Excluir definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
};
