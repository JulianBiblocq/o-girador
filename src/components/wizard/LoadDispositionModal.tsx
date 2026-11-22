import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useWizardStore, PlacedInstrument } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { DispositionPreset } from '../../types/disposition.types';
import { isLegacySamambaiaGroup } from '../../utils/tenantGroupHelpers';
import { playWizardFormationArpeggio } from './audio/wizardSpatialPreview';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userUid = userProfile?.uid || currentUser?.uid || 'local';
  const groupId = userProfile?.groupId ? String(userProfile.groupId).trim().toLowerCase() : null;
  const isMestreOrAdmin = isAdmin || userProfile?.role === 'mestre' || (userProfile as any)?.dbRole === 'mestre';
  const isSamambaiaMember = isLegacySamambaiaGroup(groupId) || (!groupId && userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1');

  const filteredDispositions = useFilteredDispositions({
    dispositions, activeTab, userUid, groupId, isSamambaiaMember,
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
    playWizardFormationArpeggio(freshInstruments);
    onLoaded?.(preset.name);
    onClose();
  };

  const handleDelete = async (preset: DispositionPreset) => {
    const confirmText = lang === 'fr'
      ? `Supprimer définitivement la disposition « ${preset.name} » ?`
      : `Excluir permanentemente a disposição « ${preset.name} »?`;
    const ok = await confirmAsync(confirmText);
    if (!ok) return;
    setDeletingId(preset.id);
    try { await deleteDisposition(preset.id); } catch (err) { console.error(err); } finally { setDeletingId(null); }
  };

  const canDelete = (preset: DispositionPreset): boolean => {
    const isAuthor = preset.ownerId === userUid || preset.authorId === userUid || preset.ownerId === 'local';
    const isGroupMestre = Boolean(isMestreOrAdmin && groupId && preset.groupId && String(preset.groupId).toLowerCase() === groupId);
    return Boolean(isAuthor || isGroupMestre);
  };

  const modalRoot = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div data-wizard-submodal="true" className="fixed inset-0 z-[100028] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[85vh] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-5 shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col font-cactus overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[var(--cordel-border-strong)] pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={22} className="text-[var(--cordel-accent-readable)]" />
            <div>
              <h3 className="text-lg md:text-xl font-bold uppercase tracking-wide leading-none">{lang === 'fr' ? 'Dispositions Enregistrées' : 'Disposições Salvas'}</h3>
              <p className="text-[10px] text-[var(--cordel-text-muted)] uppercase tracking-wider mt-0.5">{lang === 'fr' ? 'Rappelez instantanément vos configurations de scène' : 'Recupere instantaneamente suas configurações de palco'}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" aria-label="Fermer" className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"><X size={18} /></button>
        </div>

        <div className="flex border-b-2 border-[var(--cordel-border)] gap-2 pt-3 flex-shrink-0">
          {(['mine', 'group', 'public'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 border-t-2 border-x-2 text-xs font-bold uppercase cursor-pointer transition-colors ${activeTab === tab ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-surface-elevated)]'}`}>
              {tab === 'mine' ? (lang === 'fr' ? 'Mes Dispositions' : 'Minhas Disposições') : tab === 'group' ? (lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo') : (lang === 'fr' ? 'Publiques' : 'Públicas')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-3 pr-1 flex flex-col gap-2.5 min-h-[220px] custom-scrollbar">
          {isLoadingCloud && <div className="text-center py-2 text-xs text-[var(--cordel-accent-readable)] font-bold animate-pulse">{lang === 'fr' ? 'Synchronisation Cloud...' : 'Sincronizando Nuvem...'}</div>}
          {filteredDispositions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--cordel-text-muted)] gap-2 border-2 border-dashed border-[var(--cordel-border)]">
              <FolderOpen size={30} className="opacity-50" />
              <p className="text-xs uppercase font-bold">{lang === 'fr' ? 'Aucune disposition enregistrée dans cette catégorie' : 'Nenhuma disposição salva nesta categoria'}</p>
            </div>
          ) : (
            filteredDispositions.map((preset) => (
              <LoadDispositionItem key={preset.id} preset={preset} lang={lang} isDeletable={canDelete(preset)} isDeleting={deletingId === preset.id} onLoad={handleLoad} onDelete={handleDelete} />
            ))
          )}
        </div>

        <div className="border-t-2 border-[var(--cordel-border)] pt-3 flex justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer uppercase font-bold text-xs">{lang === 'fr' ? 'Fermer' : 'Fechar'}</button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};
