/**
 * Section Accordéon pour afficher, synchroniser et supprimer les brouillons hors-ligne (< 115 lignes).
 */
import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canDeleteCatalogPreset, isMestreOrAdminProfile } from '../../utils/presetPermissions';
import {
  getOfflineDrafts,
  deleteOfflineDraft,
  syncOfflineDraftsIfOnline,
  OfflineDraftItem,
} from '../../utils/offlineDraftStorage';

interface DraftsSectionProps {
  lang: 'pt' | 'fr';
  onSelectDraft: (presetData: any, name: string) => void;
}

export const PresetAccordionDraftsSection: React.FC<DraftsSectionProps> = ({
  lang,
  onSelectDraft,
}) => {
  const { userProfile, currentUser } = useAuth();
  const effectiveProfile = userProfile
    ? { ...userProfile, uid: userProfile.uid || currentUser?.uid || '' }
    : (currentUser ? { uid: currentUser.uid } : null);

  const [drafts, setDrafts] = useState<OfflineDraftItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshDrafts = () => setDrafts(getOfflineDrafts());

  useEffect(() => {
    refreshDrafts();
  }, []);

  if (drafts.length === 0) return null;

  const canDeleteDraft = (draft: OfflineDraftItem): boolean => {
    if (isMestreOrAdminProfile(effectiveProfile)) return true;
    if (!draft.ownerId) return Boolean(userProfile?.canWriteSequenciador);
    return canDeleteCatalogPreset({ id: draft.id, ownerId: draft.ownerId }, effectiveProfile);
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await syncOfflineDraftsIfOnline();
      refreshDrafts();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, draft: OfflineDraftItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDeleteDraft(draft)) return;
    deleteOfflineDraft(draft.id);
    refreshDrafts();
  };

  return (
    <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
      >
        <span className="flex items-center gap-1.5 truncate">
          <FileText size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span className="truncate">{lang === 'pt' ? 'Rascunhos Offline' : 'Brouillons Hors-Ligne'}</span>
          <span className="text-[10px] opacity-60 font-sans">({drafts.length})</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 hover:bg-[var(--cordel-surface)] rounded-xs transition-colors cursor-pointer"
            title={lang === 'pt' ? 'Sincronizar rascunhos' : 'Synchroniser les brouillons'}
          >
            <RefreshCw size={11} className={`text-[var(--cordel-text)] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[9px] opacity-70">{isOpen ? '▼' : '►'}</span>
        </div>
      </div>
      {isOpen && (
        <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-48 overflow-y-auto border-t border-[var(--cordel-border)]/20">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-1 w-full min-w-0">
              <button
                type="button"
                title={d.name}
                onClick={() => onSelectDraft(d.presetData, d.name)}
                className="flex-1 text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
              >
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText size={11} className="shrink-0 opacity-70" />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="text-[9px] opacity-60 font-mono">{new Date(d.savedAt).toLocaleDateString()}</span>
              </button>
              {canDeleteDraft(d) && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, d)}
                  title={lang === 'pt' ? 'Excluir rascunho' : 'Supprimer ce brouillon'}
                  className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-colors text-[var(--cordel-text)] opacity-40 hover:opacity-100 hover:text-[var(--cordel-status-danger)]"
                >
                  <Trash2 size={13} className="shrink-0" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
