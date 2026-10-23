/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CloudPattern, Language } from '../../../types';

export interface EditorCloudLoadModalProps {
  loadModalPatternId: number | null;
  onClose: () => void;
  lang: Language;
  trackDisplayName: string;
  existingFolders: string[];
  existingLibraryPatterns: CloudPattern[];
  expandedFolders: Record<string, boolean>;
  toggleFolder: (folder: string) => void;
  handleLoadPatternFromLibrary: (id: string) => void;
  handleDeleteCloudPattern: (id: string) => void;
  genererEtUploaderCloudBounce: (docId: string, ptn: any, bpm: number, sig: string) => Promise<any>;
  currentBpm: number;
  currentTimeSig: string;
  setCloudPatterns: React.Dispatch<React.SetStateAction<CloudPattern[]>>;
}

export const EditorCloudLoadModal: React.FC<EditorCloudLoadModalProps> = React.memo((props) => {
  const {
    loadModalPatternId, onClose, lang, trackDisplayName, existingFolders,
    existingLibraryPatterns, expandedFolders, toggleFolder, handleLoadPatternFromLibrary,
    handleDeleteCloudPattern, genererEtUploaderCloudBounce, currentBpm, currentTimeSig, setCloudPatterns,
  } = props;
  const [bouncingId, setBouncingId] = useState<string | null>(null);

  if (loadModalPatternId === null) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-theme="light" style={{ colorScheme: 'light' }} onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="font-cactus text-3xl font-bold text-[#1a1a1a]">{lang === 'fr' ? 'Catalogue - ' : 'Catálogo - '}{trackDisplayName}</h3>
          <button onClick={onClose} className="text-[#1a1a1a] font-bold text-xl hover:text-[#8b2a1a] cursor-pointer"></button>
        </div>
        {existingFolders.length === 0 ? (
          <div className="text-center py-8 text-[#666] font-bold text-sm italic">{lang === 'fr' ? 'Aucun motif sauvegardé pour cet instrument.' : 'Nenhum padrão salvo para este instrumento.'}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {existingFolders.map((folder) => {
              const isExpanded = expandedFolders[folder] ?? true;
              const folderPatterns = existingLibraryPatterns.filter((p) => p.folder === folder);
              return (
                <div key={folder} className="border border-[#1a1a1a] rounded-sm bg-[#eaddcf]">
                  <button onClick={() => toggleFolder(folder)} className="w-full flex items-center justify-between p-3 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 font-bold text-[#1a1a1a] text-lg font-cactus text-left cursor-pointer">
                    <span className="flex items-center gap-2">{isExpanded ? '' : ''} {folder} <span className="text-xs opacity-60">({folderPatterns.length})</span></span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="flex flex-col divide-y divide-[#1a1a1a]/20">
                      {folderPatterns.map((libPtn) => (
                        <div key={libPtn.id} className="flex items-center justify-between p-3 hover:bg-white/50 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#1a1a1a] flex items-center gap-2">{libPtn.name} {libPtn.audioUrl && <span title={lang === 'fr' ? 'Audio généré' : 'Áudio gerado'}></span>}</span>
                            <span className="text-xs text-[#666]">{new Date(libPtn.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation(); setBouncingId(libPtn.id);
                                try {
                                  const url = await genererEtUploaderCloudBounce(libPtn.id, libPtn as any, currentBpm, currentTimeSig);
                                  setCloudPatterns((prev) => prev.map((p) => p.id === libPtn.id ? { ...p, audioUrl: url } : p));
                                } catch (_) {} finally { setBouncingId(null); }
                              }}
                              className="px-3 py-1 font-bold text-xs cordel-border-sm bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                            >
                              {bouncingId === libPtn.id ? '...' : (libPtn.audioUrl ? 'Audio' : 'Audio')}
                            </button>
                            <button onClick={() => handleLoadPatternFromLibrary(libPtn.id)} className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm hover:bg-[#6b1e11] cursor-pointer">
                              {lang === 'fr' ? 'Charger' : 'Carregar'}
                            </button>
                            <button onClick={() => handleDeleteCloudPattern(libPtn.id)} className="p-1 hover:bg-[#1a1a1a]/10 rounded text-xl cursor-pointer" title={lang === 'fr' ? 'Supprimer' : 'Excluir'}></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

EditorCloudLoadModal.displayName = 'EditorCloudLoadModal';
