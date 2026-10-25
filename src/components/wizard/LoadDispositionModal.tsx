
import React, { useState } from 'react';
import { X, FolderOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useWizardStore, PlacedInstrument } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { DispositionPreset } from '../../types/disposition.types';
import { LoadDispositionItem } from './load-disposition/LoadDispositionItem';
import { useFilteredDispositions, TabType } from './load-disposition/useLoadDispositionFilter';

interface LoadDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'pt';
  onLoaded?: (presetName: string) => void;
}

export const LoadDispositionModal: React.FC<LoadDispositionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLoaded,
}) => {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const { confirmAsync } = useSequencer();
  const dispositions = useDispositionStore((state) => state.dispositions);
  const deleteDisposition = useDispositionStore((state) => state.deleteDisposition);
  const isLoadingCloud = useDispositionStore((state) => state.isLoadingCloud);
  const setPlacedInstruments = useWizardStore((state) => state.setPlacedInstruments);
  const setHasToada = useWizardStore((state) => state.setHasToada);

  const [activeTab, setActiveTab] = useState<TabType>('mine');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const userUid = userProfile?.uid || currentUser?.uid || 'local';
  const groupId = userProfile?.groupId ? String(userProfile.groupId).toLowerCase() : null;
  const isOtherGroup = Boolean(
    groupId &&
    !groupId.includes('samambaia') &&
    !groupId.includes('sammbia')
  );
  const isSamambaiaMember = !isOtherGroup && (
    userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    userUid === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' ||
    Boolean(groupId && groupId.includes('samambaia')) ||
    Boolean((userProfile as any)?.canWriteSequenciador)
  );

  const filteredDispositions = useFilteredDispositions({
    dispositions,
    activeTab,
    userUid,
    groupId,
    isSamambaiaMember,
  });

  const handleLoad = (preset: DispositionPreset) => {
    const freshInstruments: PlacedInstrument[] = preset.instruments.map((inst) => ({
      id: `${inst.instrumentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      instrumentType: inst.instrumentType,
      x: inst.x,
      y: inst.y,
    }));
    setPlacedInstruments(freshInstruments);
    if (preset.hasToada !== undefined) setHasToada(Boolean(preset.hasToada));
    onLoaded?.(preset.name);
    onClose();
  };

  const handleDelete = async (preset: DispositionPreset) => {
    const confirmText =
      lang === 'fr'
        ? `Supprimer définitivement la disposition « ${preset.name} » ?`
        : `Excluir permanentemente a disposição « ${preset.name} »?`;

    const ok = await confirmAsync(confirmText);
    if (ok) {
      setDeletingId(preset.id);
      try {
        await deleteDisposition(preset.id);
      } catch (err) {
        console.error('Erreur suppression disposition:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const canDelete = (preset: DispositionPreset): boolean => {
    const isAuthor = preset.ownerId === userUid || preset.authorId === userUid || preset.ownerId === 'local';
    const isGroupMestre = Boolean(isMestreOrAdmin && groupId && preset.groupId && String(preset.groupId).toLowerCase() === groupId);
    return Boolean(isAuthor || isGroupMestre);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl max-h-[85vh] bg-[#f4ecd8] border-3 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] text-[#1a1a1a] flex flex-col font-cactus overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={24} className="text-[#8b2a1a]" />
            <div>
              <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide leading-none">{lang === 'fr' ? 'Dispositions Enregistrées' : 'Disposições Salvas'}</h3>
              <p className="text-[10px] text-[#1a1a1a]/60 uppercase tracking-wider mt-0.5">{lang === 'fr' ? 'Rappelez instantanément vos configurations de scène' : 'Recupere instantaneamente suas configurações de palco'}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" aria-label="Fermer" className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer"><X size={18} /></button>
        </div>

        <div className="flex border-b-2 border-[#1a1a1a] gap-2 pt-3 flex-shrink-0">
          {(['mine', 'group', 'public'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 border-t-2 border-x-2 border-[#1a1a1a] text-xs font-bold uppercase cursor-pointer transition-all ${activeTab === tab ? 'bg-[#8b2a1a] text-[#f4ecd8] translate-y-[2px]' : 'bg-[#ece4d0] text-[#1a1a1a] hover:bg-[#e2d8be]'}`}>
              {tab === 'mine' ? (lang === 'fr' ? 'Mes Dispositions' : 'Minhas Disposições') : tab === 'group' ? (lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo') : (lang === 'fr' ? 'Publiques' : 'Públicas')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-3 pr-1 flex flex-col gap-2.5 min-h-[220px]">
          {isLoadingCloud && <div className="text-center py-2 text-xs text-[#8b2a1a] font-bold animate-pulse">{lang === 'fr' ? 'Synchronisation Cloud...' : 'Sincronizando Nuvem...'}</div>}
          {filteredDispositions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#1a1a1a]/60 gap-2 border-2 border-dashed border-[#1a1a1a]/30">
              <FolderOpen size={32} className="opacity-40" />
              <p className="text-xs uppercase font-bold">{lang === 'fr' ? 'Aucune disposition enregistrée dans cette catégorie' : 'Nenhuma disposição salva nesta categoria'}</p>
            </div>
          ) : (
            filteredDispositions.map((preset) => (
              <LoadDispositionItem key={preset.id} preset={preset} lang={lang} isDeletable={canDelete(preset)} isDeleting={deletingId === preset.id} onLoad={handleLoad} onDelete={handleDelete} />
            ))
          )}
        </div>

        <div className="border-t-2 border-[#1a1a1a] pt-3 flex justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-[#d7cfbb] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs">{lang === 'fr' ? 'Fermer' : 'Fechar'}</button>
        </div>
      </div>
    </div>
  );
};
