import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { XiloScroll } from '../XiloIcons';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { WorkspaceTemplate } from '../../types';
import { SettingsTemplateCard } from './SettingsTemplateCard';

interface SettingsTemplatesTabProps {
  lang: string;
  confirmAsync?: (msg: string) => Promise<boolean>;
  onClose: () => void;
}

export const SettingsTemplatesTab: React.FC<SettingsTemplatesTabProps> = ({
  lang,
  confirmAsync,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const audio = useAudio();
  const sequencer = useSequencer();
  const workspaceTemplates = useWorkspaceTemplateStore((state) => state.templates);
  const deleteWorkspaceTemplate = useWorkspaceTemplateStore((state) => state.deleteTemplate);
  const renameWorkspaceTemplate = useWorkspaceTemplateStore((state) => state.renameTemplate);
  const syncWorkspaceTemplates = useWorkspaceTemplateStore((state) => state.syncWithCloud);
  const isSyncingTemplates = useWorkspaceTemplateStore((state) => state.isSyncing);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleLoadTemplate = async (tpl: WorkspaceTemplate) => {
    const confirmMsg = lang === 'pt'
      ? `Carregar o modelo "${tpl.name}" irá substituir o batuque atual por este modelo vazio. Deseja continuar?`
      : `Charger le gabarit "${tpl.name}" va remplacer le batuque actuel par ce gabarit vierge. Voulez-vous continuer ?`;

    const ok = sequencer.confirmAsync
      ? await sequencer.confirmAsync(confirmMsg)
      : (confirmAsync ? await confirmAsync(confirmMsg) : true);

    if (ok) {
      useSequencerStore.getState().handleCreateFromTemplate(tpl, audio);
      onClose();
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingTemplateName.trim()) {
      renameWorkspaceTemplate(id, editingTemplateName.trim());
    }
    setEditingTemplateId(null);
    setEditingTemplateName('');
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-2.5">
        <div>
          <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-2 text-[var(--cordel-text)]">
            <XiloScroll size={16} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>{lang === 'pt' ? 'Modelos de Batuque Pessoais' : 'Gabarits de Batuque Personnels'}</span>
          </h3>
          <p className="text-[11px] text-[var(--cordel-text-muted)] mt-0.5">
            {lang === 'pt'
              ? 'Seus gabaritos são estritamente privados (salvos localmente e sincronizados na sua conta).'
              : 'Vos gabarits sont strictement privés (enregistrés localement et synchronisés sur votre compte).'}
          </p>
        </div>
        {userProfile && (
          <button
            type="button"
            onClick={() => syncWorkspaceTemplates(userProfile.uid)}
            disabled={isSyncingTemplates}
            className="px-3 py-1.5 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={12} className={isSyncingTemplates ? 'animate-spin shrink-0' : 'shrink-0'} />
            <span>{isSyncingTemplates ? (lang === 'pt' ? 'Sincronizando...' : 'Synchronisation...') : (lang === 'pt' ? 'Sincronizar' : 'Synchroniser')}</span>
          </button>
        )}
      </div>

      {workspaceTemplates.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] text-center flex flex-col items-center justify-center gap-2 rounded">
          <span className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Nenhum modelo salvo' : 'Aucun gabarit enregistré'}
          </span>
          <p className="text-[11px] text-[var(--cordel-text-muted)] font-semibold max-w-sm">
            {lang === 'pt'
              ? 'Para criar um modelo, configure as pistas desejadas e clique em "Memorizar modelo" na régua Master.'
              : 'Pour créer un gabarit, configurez vos pistes et cliquez sur "Mémoriser gabarit" sur la tranche Master.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
          {workspaceTemplates.map((tpl) => (
            <SettingsTemplateCard
              key={tpl.id} tpl={tpl} lang={lang}
              isEditing={editingTemplateId === tpl.id}
              editingName={editingTemplateId === tpl.id ? editingTemplateName : tpl.name}
              isConfirmingDelete={confirmDeleteId === tpl.id}
              onStartEdit={() => { setEditingTemplateId(tpl.id); setEditingTemplateName(tpl.name); }}
              onCancelEdit={() => { setEditingTemplateId(null); setEditingTemplateName(''); }}
              onSaveRename={() => handleSaveRename(tpl.id)}
              onNameChange={setEditingTemplateName}
              onLoadTemplate={() => handleLoadTemplate(tpl)}
              onAskDelete={() => setConfirmDeleteId(tpl.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => { deleteWorkspaceTemplate(tpl.id); setConfirmDeleteId(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
