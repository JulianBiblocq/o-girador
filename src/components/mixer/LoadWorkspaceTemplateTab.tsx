/**
 * Onglet de chargement granulaire d'un gabarit de batuque sur le morceau en cours (< 120 lignes).
 */
import React, { useState } from 'react';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';
import { ApplyWorkspaceTemplateOptions, Language } from '../../types';
import { notifyToast } from '../../utils/toastHelper';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { XiloScroll } from '../XiloIcons';
import { ApplyTemplateCheckboxesSection } from './ApplyTemplateCheckboxesSection';

interface Props {
  lang: Language;
  onClose: () => void;
  onSwitchToSave: () => void;
}

export const LoadWorkspaceTemplateTab: React.FC<Props> = ({ lang, onClose, onSwitchToSave }) => {
  const audio = useAudio();
  const templates = useWorkspaceTemplateStore((s) => s.templates);
  const deleteTemplate = useWorkspaceTemplateStore((s) => s.deleteTemplate);
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || '');
  const [options, setOptions] = useState<ApplyWorkspaceTemplateOptions>({
    includeStructure: true,
    includeDisplayOrder: true,
    includeVolumePan: true,
    includeEQ: true,
    includeFX: true,
    removeExtraTracks: false,
  });

  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  const handleApply = () => {
    if (!selectedTemplate) return;
    useSequencerStore.getState().handleApplyWorkspaceTemplate(selectedTemplate, options, audio);
    notifyToast(
      lang === 'pt' ? 'Gabarito aplicado na música atual !' : 'Gabarit appliqué au morceau en cours !',
      'success'
    );
    onClose();
  };

  const handleDelete = (id: string, name: string) => {
    const msg = lang === 'pt' ? `Excluir o gabarito "${name}" ?` : `Supprimer le gabarit "${name}" ?`;
    if (window.confirm(msg)) {
      deleteTemplate(id);
      if (selectedId === id) {
        const remaining = templates.filter((t) => t.id !== id);
        if (remaining.length > 0) setSelectedId(remaining[0].id);
      }
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
        <XiloScroll size={32} className="text-[#1a1a1a]/40" />
        <p className="font-cactus font-bold text-sm text-[#1a1a1a]">
          {lang === 'pt' ? 'Nenhum gabarito memorizado até o momento.' : 'Aucun gabarit mémorisé pour le moment.'}
        </p>
        <button
          type="button"
          onClick={onSwitchToSave}
          className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#a83220] cursor-pointer"
        >
          {lang === 'pt' ? 'Memorizar o gabarito atual' : 'Mémoriser le gabarit actuel'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
          {lang === 'pt' ? 'Escolher um Gabarito :' : 'Choisir un Gabarit :'}
        </label>
        <div className="flex gap-2 items-center">
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 bg-white border-2 border-[#1a1a1a] p-2 text-xs font-cactus font-bold tracking-wider outline-none shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="text-[#1a1a1a] font-bold">
                {tpl.name} ({tpl.tracks.length} {lang === 'pt' ? 'pistas' : 'pistes'})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => handleDelete(selectedTemplate.id, selectedTemplate.name)}
              className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#8b2a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors"
              title={lang === 'pt' ? 'Excluir gabarito' : 'Supprimer ce gabarit'}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <ApplyTemplateCheckboxesSection options={options} setOptions={setOptions} lang={lang} />

      <div className="flex justify-end gap-3 mt-1 pt-2.5 border-t-2 border-[#1a1a1a]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#1a1a1a]/5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
        >
          {lang === 'pt' ? 'Cancelar' : 'Annuler'}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-5 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#a83220] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{lang === 'pt' ? 'Aplicar na música atual' : 'Appliquer au morceau en cours'}</span>
        </button>
      </div>
    </div>
  );
};
