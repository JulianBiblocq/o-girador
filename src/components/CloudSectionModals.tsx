import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { SongSection, SavedSectionData, CatalogVisibility, CloudSection, TrackGroup, Pattern } from '../types';
import { saveSectionToCloud, fetchCloudSections, deleteCloudSection, getCloudSectionData } from '../cloudSections';
import { SubscriptionModal } from './SubscriptionModal';
import { VisitorAuthModal } from './VisitorAuthModal';
import { useCloudAudioBounce } from '../hooks/useCloudAudioBounce';

interface SaveSectionModalProps {
  section: SongSection;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SaveSectionModal: React.FC<SaveSectionModalProps> = ({ section, onClose, lang }) => {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  
  const [name, setName] = useState(section.name);
  const [visibility, setVisibility] = useState<CatalogVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(true);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  const { genererEtUploaderSectionCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!userProfile) {
      setShowVisitorModal(true);
      return;
    }
    setIsSaving(true);
    
    try {
      const numMeasures = section.endMeasure - section.startMeasure + 1;
      const start = section.startMeasure;
      const end = section.endMeasure;

      // Extract section data
      const storeState = useSequencerStore.getState();
      const timeSigs = storeState.measureTimeSigs.slice(start, end + 1);
      const vols = storeState.measureVols.slice(start, end + 1);
      const volTransitions = storeState.measureVolTransitions.slice(start, end + 1);
      const signals = storeState.measureSignals.slice(start, end + 1);

      const sectionTracks = useSequencerStore.getState().tracks.map(t => {
        // Filter patterns that overlap with [start, end]
        const sectionPatterns = t.patterns.map(p => {
          if (!p.measureAssignments) return null;
          const isAssigned = p.measureAssignments.slice(start, end + 1).some(v => v);
          if (!isAssigned) return null;

          // Truncate assignments to just the section
          const newAssignments = p.measureAssignments.slice(start, end + 1);
          return { ...p, measureAssignments: newAssignments };
        }).filter(Boolean) as Pattern[];

        return {
          instrumentIdx: t.instrumentIdx,
          isMute: t.isMute,
          isSolo: t.isSolo,
          volumeVal: t.volumeVal,
          reverbVal: t.reverbVal,
          panVal: t.panVal,
          swingIntensity: t.swingIntensity,
          patterns: sectionPatterns
        };
      }).filter(t => t.patterns.length > 0);

      const savedData: SavedSectionData = {
        numMeasures,
        timeSigs,
        vols,
        volTransitions,
        signals,
        tracks: sectionTracks
      };

      const existingSections = await fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null);
      const existingSection = existingSections.find(s => s.name.trim() === name.trim() && s.ownerId === userProfile.uid);
      let targetDocId: string | undefined = undefined;

      if (existingSection) {
        const confirmReplace = await sequencer.confirmAsync(lang === 'fr' ? `La section "${name.trim()}" existe déjà. Voulez-vous la remplacer ?` : `A seção "${name.trim()}" já existe. Deseja substituí-la?`);
        if (!confirmReplace) {
          setIsSaving(false);
          return;
        }
        targetDocId = existingSection.id;
      }

      const myGroupMestreId = (userProfile.role === 'mestre' || (userProfile.dbRole as any) === 'mestre')
        ? userProfile.uid
        : (userProfile.mestreId || undefined);
      const myGroupId = userProfile.groupId || undefined;

      const sectionId = await saveSectionToCloud(
        name.trim(),
        savedData,
        userProfile.uid,
        visibility,
        userProfile.role,
        targetDocId,
        myGroupMestreId,
        myGroupId
      );

      if (autoGenerateAudio) {
        try {
          await genererEtUploaderSectionCloudBounce(sectionId, savedData, storeState.bpm || 100);
        } catch (audioErr) {
          console.error("Audio generation failed after save", audioErr);
          // Don't fail the whole save if audio fails
        }
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      alert((lang === 'fr' ? 'Erreur lors de la sauvegarde : ' : 'Erro ao salvar : ') + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
        <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a] mb-4">
          {lang === 'fr' ? 'Sauvegarder Section Cloud' : 'Salvar Seção na Nuvem'}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
            {lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
            disabled={isSaving || isBouncingCloud}
          />
        </div>
        {(userProfile?.role === 'mestre' || isAdmin) && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="visibilityGlobal"
              checked={visibility === 'admin_global'}
              onChange={(e) => setVisibility(e.target.checked ? 'admin_global' : 'private')}
              disabled={isSaving || isBouncingCloud}
              className="w-4 h-4 accent-[#8b2a1a]"
            />
            <label htmlFor="visibilityGlobal" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
              {lang === 'fr' ? 'Partager dans le catalogue public' : 'Compartilhar no catálogo público'}
            </label>
          </div>
        )}
        <div className="mb-6 flex items-center gap-2">
          <input
            type="checkbox"
            id="autoGenerateAudio"
            checked={autoGenerateAudio}
            onChange={(e) => setAutoGenerateAudio(e.target.checked)}
            disabled={isSaving || isBouncingCloud}
            className="w-4 h-4 accent-[#8b2a1a]"
          />
          <label htmlFor="autoGenerateAudio" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
            {lang === 'fr' ? 'Générer l\'aperçu audio (☁️)' : 'Gerar áudio (☁️)'}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition-colors"
            disabled={isSaving || isBouncingCloud}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || isBouncingCloud || !userProfile}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px]"
            title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
          >
            {(isSaving || isBouncingCloud) ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {lang === 'fr' ? 'En cours...' : 'Salvando...'}
              </span>
            ) : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
      {showVisitorModal && (
        <VisitorAuthModal lang={lang} onClose={() => setShowVisitorModal(false)} />
      )}
    </div>
  );
};

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
  const [showSubModal, setShowSubModal] = useState(false);
  const [bouncingSectionId, setBouncingSectionId] = useState<string | null>(null);
  
  const { genererEtUploaderSectionCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  useEffect(() => {
    if (!userProfile) return;
    fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null).then(data => {
      setSections(data);
      setIsLoading(false);
    });
  }, [userProfile]);

  const handleLoad = async (sectionInfo: CloudSection) => {
    try {
      const data = await getCloudSectionData(sectionInfo.id);
      if (data && sequencer.handleInsertCloudSection) {
        if (!userProfile || (userProfile.role !== 'mestre' && userProfile.role !== 'admin')) {
          if (insertAtMeasure + data.numMeasures > 20) {
            setShowSubModal(true);
            return;
          }
        }
        sequencer.handleInsertCloudSection(data, insertAtMeasure);
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'fr' ? 'Erreur lors du chargement.' : 'Erro ao carregar.');
    }
  };

  const handleDelete = async (sectionInfo: CloudSection) => {
    if (await sequencer.confirmAsync(lang === 'fr' ? 'Supprimer définitivement cette section ?' : 'Excluir permanentemente esta seção?')) {
      try {
        await deleteCloudSection(sectionInfo.id);
        setSections(prev => prev.filter(s => s.id !== sectionInfo.id));
      } catch (err) {
        console.error(err);
        alert(lang === 'fr' ? 'Erreur lors de la suppression.' : 'Erro ao excluir.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a]">
            {lang === 'fr' ? 'Importer une Section' : 'Importar uma Seção'}
          </h3>
          <button onClick={onClose} className="text-2xl hover:text-[#8b2a1a]">×</button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[#666] font-bold">
            {lang === 'fr' ? 'Chargement...' : 'Carregando...'}
          </div>
        ) : sections.length === 0 ? (
          <div className="py-8 text-center text-[#666] italic">
            {lang === 'fr' ? 'Aucune section trouvée.' : 'Nenhuma seção encontrada.'}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
            {sections.map(sec => (
              <div key={sec.id} className="bg-white/50 border border-[#1a1a1a]/20 p-3 flex justify-between items-center hover:bg-white/80 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
                    {sec.name}
                    {sec.audioUrl && (
                      <span title={lang === 'fr' ? 'Audio généré' : 'Áudio gerado'} className="text-sm">🔊</span>
                    )}
                  </span>
                  <span className="text-xs text-[#666]">{new Date(sec.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoad(sec)}
                    className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs hover:bg-[#6b1e11] transition-colors cordel-border-sm"
                  >
                    {lang === 'fr' ? 'Insérer' : 'Inserir'}
                  </button>
                  {(isAdmin || userProfile?.uid === sec.ownerId) && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isBouncingCloud) return;
                          setBouncingSectionId(sec.id);
                          try {
                            const data = await getCloudSectionData(sec.id);
                            if (data) {
                              const storeState = useSequencerStore.getState();
                              const currentBpm = storeState.bpm || 100;
                              const newAudioUrl = await genererEtUploaderSectionCloudBounce(sec.id, data, currentBpm);
                              setSections(prev => prev.map(s => s.id === sec.id ? { ...s, audioUrl: newAudioUrl } : s));
                              alert(lang === 'fr' ? 'Audio généré avec succès !' : 'Áudio gerado com sucesso!');
                            }
                          } catch(err: any) {
                            alert((lang === 'fr' ? 'Erreur lors de la génération audio: ' : 'Erro na geração de áudio: ') + (err.message || String(err)));
                          } finally {
                            setBouncingSectionId(null);
                          }
                        }}
                        disabled={isBouncingCloud}
                        className={`px-3 py-1 font-bold text-xs transition-colors cordel-border-sm flex items-center justify-center min-w-[70px] ${isBouncingCloud && bouncingSectionId === sec.id ? 'bg-amber-500 text-black' : (sec.audioUrl ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]')}`}
                        title={lang === 'fr' ? "Générer l'audio de la section" : "Gerar áudio da seção"}
                      >
                        {isBouncingCloud && bouncingSectionId === sec.id ? '⏳...' : (sec.audioUrl ? '🔄 Audio' : '☁️ Audio')}
                      </button>
                      <button
                        onClick={() => handleDelete(sec)}
                        className="p-1 hover:bg-[#1a1a1a]/10 rounded transition-colors text-xl"
                        title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                      >
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
      {showSubModal && (
        <SubscriptionModal lang={lang} onClose={() => setShowSubModal(false)} />
      )}
    </div>
  );
};
