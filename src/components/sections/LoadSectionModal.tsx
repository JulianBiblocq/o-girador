import React from 'react';
import { Trash2, Volume2, X } from 'lucide-react';
import { LoadSectionOptionsPanel } from './LoadSectionOptionsPanel';
import { useLoadSectionModalState } from './useLoadSectionModalState';

interface LoadSectionModalProps {
  insertAtMeasure: number;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const LoadSectionModal: React.FC<LoadSectionModalProps> = ({ insertAtMeasure, onClose, lang }) => {
  const s = useLoadSectionModalState(insertAtMeasure, onClose, lang);

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-5 max-w-lg w-full rounded-sm cordel-shadow flex flex-col max-h-[82vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--cordel-border)]/30">
          <h3 className="font-cactus text-2xl font-bold">{lang === 'fr' ? 'Importer une Section' : 'Importar uma Seção'}</h3>
          <button type="button" onClick={onClose} className="p-1 hover:opacity-75 cursor-pointer" aria-label="Fermer"><X size={20} /></button>
        </div>
        {!s.isLoading && s.sections.length > 0 && (
          <LoadSectionOptionsPanel
            lang={lang} mode={s.importMode} onModeChange={s.setImportMode}
            createMissingTracks={s.createMissingTracks} onCreateMissingChange={s.setCreateMissingTracks}
            missingTracks={s.matchInfo.missingTracks} matchedCount={s.matchInfo.matchedCount} insertAtMeasure={insertAtMeasure}
          />
        )}
        {s.isLoading ? (
          <div className="py-8 text-center opacity-70 font-bold">{lang === 'fr' ? 'Chargement...' : 'Carregando...'}</div>
        ) : s.sections.length === 0 ? (
          <div className="py-8 text-center opacity-70 italic">{lang === 'fr' ? 'Aucune section trouvée.' : 'Nenhuma seção encontrada.'}</div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
            {s.sections.map((sec) => {
              const info = s.decodedById.get(sec.id);
              const isSelected = s.selectedId === sec.id;
              return (
                <div key={sec.id} onMouseEnter={() => s.setSelectedId(sec.id)} onClick={() => s.setSelectedId(sec.id)} className={`border p-3 flex justify-between items-center transition-colors cursor-pointer ${isSelected ? 'border-[var(--cordel-border)] bg-[var(--cordel-border)]/10' : 'border-[var(--cordel-border)]/25 hover:bg-[var(--cordel-border)]/5'}`}>
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold truncate">{sec.name}</span>
                    <span className="text-xs opacity-70">
                      {info ? `${info.numMeasures} ${lang === 'fr' ? 'mes.' : 'comp.'} • ${info.tracks.length} instr.` : new Date(sec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={(e) => { e.stopPropagation(); s.handleLoad(sec); }} className="px-3 py-1.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold text-xs hover:opacity-90 transition-opacity cordel-border-sm cursor-pointer">
                      {s.importMode === 'overwrite' ? (lang === 'fr' ? 'Écraser' : 'Sobrescrever') : (lang === 'fr' ? 'Insérer' : 'Inserir')}
                    </button>
                    {(s.isAdmin || s.userProfile?.uid === sec.ownerId) && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); s.handleGenerateAudio(sec); }} disabled={s.isBouncingCloud} className="px-2.5 py-1.5 font-bold text-xs border border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex items-center gap-1 cursor-pointer" title={lang === 'fr' ? "Générer l'audio" : 'Gerar áudio'}>
                          <Volume2 size={13} />
                          <span>{s.isBouncingCloud && s.bouncingSectionId === sec.id ? '...' : 'Audio'}</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); s.handleDelete(sec); }} className="p-1.5 hover:bg-[var(--cordel-border)]/15 rounded transition-colors cursor-pointer" title={lang === 'fr' ? 'Supprimer' : 'Excluir'}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
