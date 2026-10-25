import React from 'react';
import { WorkspaceTemplate } from '../../types';
import { instrumentsConfig } from '../../data';
import { Check, X, Pencil, Trash2 } from 'lucide-react';

interface SettingsTemplateCardProps {
  tpl: WorkspaceTemplate;
  lang: string;
  isEditing: boolean;
  editingName: string;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveRename: () => void;
  onNameChange: (val: string) => void;
  onLoadTemplate: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export const SettingsTemplateCard: React.FC<SettingsTemplateCardProps> = ({
  tpl,
  lang,
  isEditing,
  editingName,
  isConfirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveRename,
  onNameChange,
  onLoadTemplate,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) => {
  return (
    <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={editingName}
                onChange={(e) => onNameChange(e.target.value)}
                className="border-2 border-black px-2 py-0.5 text-xs font-cactus font-bold bg-[#f4ecd8] flex-1 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={onSaveRename}
                className="px-2 py-1 bg-black text-[#f4ecd8] border border-black font-bold text-xs cursor-pointer hover:bg-green-700 flex items-center justify-center"
                title={lang === 'pt' ? 'Salvar' : 'Enregistrer'}
              >
                <Check size={12} className="stroke-[2.5]" />
              </button>
              <button
                onClick={onCancelEdit}
                className="px-2 py-1 bg-white text-black border border-black font-bold text-xs cursor-pointer hover:bg-gray-200 flex items-center justify-center"
                title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
              >
                <X size={12} className="stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-cactus font-bold text-sm text-black truncate" title={tpl.name}>
                {tpl.name}
              </span>
              <button
                onClick={onStartEdit}
                className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer p-0.5"
                title={lang === 'pt' ? 'Renomear modelo' : 'Renommer le gabarit'}
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <span className="text-[9px] font-bold font-cactus bg-black/5 border border-black/20 px-1.5 py-0.5 rounded shrink-0">
            {lang === 'pt' ? 'Privado' : 'Privé'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-black/60">
          <span>{tpl.tracks.length} {lang === 'pt' ? 'faixas' : 'pistes'}</span>
          <span>{new Date(tpl.updatedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'fr-FR')}</span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto py-1">
          {tpl.tracks.map((tr, idx) => {
            const inst = instrumentsConfig[tr.instrumentIdx];
            const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
            return (
              <span key={idx} className="bg-[#f4ecd8] text-[#1a1a1a] border border-black/50 px-1.5 py-0.2 text-[9px] font-cactus font-bold rounded">
                {tr.isBusFolder ? `${label}` : label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="border-t border-black/10 pt-2 flex items-center justify-between gap-2">
        <button
          onClick={onLoadTemplate}
          className="flex-1 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 shadow-[2px_2px_0px_#000] hover:bg-[#8b2a1a] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {lang === 'pt' ? 'Criar projeto com este modelo' : 'Créer un projet avec ce gabarit'}
        </button>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={onConfirmDelete} className="px-2 py-1 bg-red-700 text-white font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-red-800">
              {lang === 'pt' ? 'Excluir' : 'Suppr.'}
            </button>
            <button onClick={onCancelDelete} className="px-2 py-1 bg-white text-black font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-gray-100 flex items-center justify-center">
              <X size={12} className="stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button onClick={onAskDelete} className="px-2 py-1 bg-white text-red-700 border-2 border-black font-cactus font-bold text-xs hover:bg-red-50 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
