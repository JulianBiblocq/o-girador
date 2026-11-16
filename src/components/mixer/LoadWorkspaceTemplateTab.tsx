import React, { useState } from 'react';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencer } from '../../contexts/SequencerContext';
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
  const isPt = lang === 'pt';
  const audio = useAudio();
  const { confirmAsync } = useSequencer();
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
    notifyToast(isPt ? 'Gabarito aplicado na música atual !' : 'Gabarit appliqué au morceau en cours !', 'success');
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    const msg = isPt ? `Excluir o gabarito « ${name} » ?` : `Supprimer le gabarit « ${name} » ?`;
    const ok = await confirmAsync(msg, isPt ? 'Excluir' : 'Supprimer', isPt ? 'Cancelar' : 'Annuler');
    if (ok) {
      deleteTemplate(id);
      if (selectedId === id) {
        const remaining = templates.filter((t) => t.id !== id);
        if (remaining.length > 0) setSelectedId(remaining[0].id);
      }
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center gap-3 text-[var(--cordel-text)]">
        <XiloScroll size={32} className="text-[var(--cordel-text-muted)]" />
        <p className="font-cactus font-bold text-sm">
          {isPt ? 'Nenhum gabarito memorizado até o momento.' : 'Aucun gabarit mémorisé pour le moment.'}
        </p>
        <button
          type="button"
          onClick={onSwitchToSave}
          className="px-4 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] cursor-pointer"
        >
          {isPt ? 'Memorizar o gabarito atual' : 'Mémoriser le gabarit actuel'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 text-[var(--cordel-text)]">
      <div className="flex flex-col gap-1">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">
          {isPt ? 'Escolher um Gabarito :' : 'Choisir un Gabarit :'}
        </label>
        <div className="flex gap-2 items-center">
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] p-2 text-xs font-cactus font-bold tracking-wider outline-none shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="bg-[var(--cordel-surface)] text-[var(--cordel-text)] font-bold">
                {tpl.name} ({tpl.tracks.length} {isPt ? 'pistas' : 'pistes'})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => handleDelete(selectedTemplate.id, selectedTemplate.name)}
              className="p-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-accent-readable)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer transition-colors"
              title={isPt ? 'Excluir gabarito' : 'Supprimer ce gabarit'}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <ApplyTemplateCheckboxesSection options={options} setOptions={setOptions} lang={lang} />

      <div className="flex justify-end gap-3 mt-1 pt-2.5 border-t-2 border-[var(--cordel-border)]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:border-[var(--cordel-accent-readable)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
        >
          {isPt ? 'Cancelar' : 'Annuler'}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-5 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{isPt ? 'Aplicar na música atual' : 'Appliquer au morceau en cours'}</span>
        </button>
      </div>
    </div>
  );
};
