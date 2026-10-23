/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Section Accordéon pour afficher et restaurer les brouillons hors-ligne (< 95 lignes).
 */

import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Check } from 'lucide-react';
import { getOfflineDrafts, syncOfflineDraftsIfOnline, OfflineDraftItem } from '../../utils/offlineDraftStorage';

interface DraftsSectionProps {
  lang: 'pt' | 'fr';
  onSelectDraft: (presetData: any, name: string) => void;
}

export const PresetAccordionDraftsSection: React.FC<DraftsSectionProps> = ({
  lang,
  onSelectDraft,
}) => {
  const [drafts, setDrafts] = useState<OfflineDraftItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshDrafts = () => {
    setDrafts(getOfflineDrafts());
  };

  useEffect(() => {
    refreshDrafts();
  }, []);

  if (drafts.length === 0) return null;

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

  return (
    <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
      >
        <span className="flex items-center gap-1.5 truncate">
          <FileText size={13} className="shrink-0 text-[#b94a2c]" />
          <span className="truncate">{lang === 'pt' ? 'Rascunhos Offline' : 'Brouillons Hors-Ligne'}</span>
          <span className="text-[10px] opacity-60 font-sans">({drafts.length})</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 hover:bg-black/10 rounded-xs transition-colors cursor-pointer"
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
            <button
              key={d.id}
              type="button"
              title={d.name}
              onClick={() => onSelectDraft(d.presetData, d.name)}
              className="w-full text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            >
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileText size={11} className="shrink-0 opacity-70" />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="text-[9px] opacity-60 font-mono">
                {new Date(d.savedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
