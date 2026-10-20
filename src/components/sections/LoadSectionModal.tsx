/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CloudSection } from '../../types';
import { fetchCloudSections, deleteCloudSection, getCloudSectionData } from '../../cloudSections';
import { useCloudAudioBounce } from '../../hooks/useCloudAudioBounce';

interface LoadSectionModalProps {
  insertAtMeasure: number;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const LoadSectionModal: React.FC<LoadSectionModalProps> = ({ insertAtMeasure, onClose, lang }) => {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();

  const [sections, setSections] = useState<CloudSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bouncingSectionId, setBouncingSectionId] = useState<string | null>(null);

  const { genererEtUploaderSectionCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  useEffect(() => {
    if (!userProfile) return;
    fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null, userProfile.canWriteSequenciador).then((data) => {
      setSections(data);
      setIsLoading(false);
    });
  }, [userProfile]);

  const handleLoad = async (sectionInfo: CloudSection) => {
    try {
      const data = await getCloudSectionData(sectionInfo.id);
      if (data && sequencer.handleInsertCloudSection) {
        const hasFullPlayback = useSequencerStore.getState().hasFullPlaybackAccess;
        if (!userProfile || (userProfile.role !== 'mestre' && userProfile.role !== 'admin' && !hasFullPlayback)) {
          if (insertAtMeasure + data.numMeasures > 30) {
            useSequencerStore.getState().openSubscriptionModal();
            return;
          }
        }
        sequencer.handleInsertCloudSection(data, insertAtMeasure);
        onClose();
      }
    } catch (err) {
      console.error(err);
      await sequencer.alertAsync(lang === 'fr' ? 'Erreur lors du chargement.' : 'Erro ao carregar.');
    }
  };

  const handleDelete = async (sectionInfo: CloudSection) => {
    if (await sequencer.confirmAsync(lang === 'fr' ? 'Supprimer définitivement cette section ?' : 'Excluir permanentemente esta seção?')) {
      try {
        await deleteCloudSection(sectionInfo.id);
        setSections((prev) => prev.filter((s) => s.id !== sectionInfo.id));
      } catch (err) {
        console.error(err);
        await sequencer.alertAsync(lang === 'fr' ? 'Erreur lors de la suppression.' : 'Erro ao excluir.');
      }
    }
  };

  const handleGenerateAudio = async (sec: CloudSection) => {
    if (isBouncingCloud) return;
    setBouncingSectionId(sec.id);
    try {
      const data = await getCloudSectionData(sec.id);
      if (data) {
        const currentBpm = useSequencerStore.getState().bpm || 100;
        const newAudioUrl = await genererEtUploaderSectionCloudBounce(sec.id, data, currentBpm);
        setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, audioUrl: newAudioUrl } : s)));
        await sequencer.alertAsync(lang === 'fr' ? 'Audio généré avec succès !' : 'Áudio gerado com sucesso!');
      }
    } catch (err: any) {
      await sequencer.alertAsync((lang === 'fr' ? 'Erreur lors de la génération audio: ' : 'Erro na geração de áudio: ') + (err.message || String(err)));
    } finally {
      setBouncingSectionId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a]">{lang === 'fr' ? 'Importer une Section' : 'Importar uma Seção'}</h3>
          <button onClick={onClose} className="text-2xl hover:text-[#8b2a1a]">×</button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[#666] font-bold">{lang === 'fr' ? 'Chargement...' : 'Carregando...'}</div>
        ) : sections.length === 0 ? (
          <div className="py-8 text-center text-[#666] italic">{lang === 'fr' ? 'Aucune section trouvée.' : 'Nenhuma seção encontrada.'}</div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
            {sections.map((sec) => (
              <div key={sec.id} className="bg-white/50 border border-[#1a1a1a]/20 p-3 flex justify-between items-center hover:bg-white/80 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
                    {sec.name}
                    {sec.audioUrl && <span title={lang === 'fr' ? 'Audio généré' : 'Áudio gerado'} className="text-sm">🔊</span>}
                  </span>
                  <span className="text-xs text-[#666]">{new Date(sec.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLoad(sec)} className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs hover:bg-[#6b1e11] transition-colors cordel-border-sm">
                    {lang === 'fr' ? 'Insérer' : 'Inserir'}
                  </button>
                  {(isAdmin || userProfile?.uid === sec.ownerId) && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateAudio(sec); }}
                        disabled={isBouncingCloud}
                        className={`px-3 py-1 font-bold text-xs transition-colors cordel-border-sm flex items-center justify-center min-w-[70px] ${isBouncingCloud && bouncingSectionId === sec.id ? 'bg-amber-500 text-black' : (sec.audioUrl ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]')}`}
                        title={lang === 'fr' ? "Générer l'audio de la section" : 'Gerar áudio da seção'}
                      >
                        {isBouncingCloud && bouncingSectionId === sec.id ? '⏳...' : (sec.audioUrl ? '🔄 Audio' : '☁️ Audio')}
                      </button>
                      <button onClick={() => handleDelete(sec)} className="p-1 hover:bg-[#1a1a1a]/10 rounded transition-colors text-xl" title={lang === 'fr' ? 'Supprimer' : 'Excluir'}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
