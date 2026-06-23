import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { SongSection, SavedSectionData, CatalogVisibility, CloudSection, TrackGroup, Pattern } from '../types';
import { saveSectionToCloud, fetchCloudSections, deleteCloudSection, getCloudSectionData } from '../cloudSections';
import { SubscriptionModal } from './SubscriptionModal';

interface SaveSectionModalProps {
  section: SongSection;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SaveSectionModal: React.FC<SaveSectionModalProps> = ({ section, onClose, lang }) => {
  const { userProfile } = useAuth();
  const sequencer = useSequencer();
  
  const [name, setName] = useState(section.name);
  const [visibility, setVisibility] = useState<CatalogVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !userProfile) return;
    setIsSaving(true);
    
    try {
      const numMeasures = section.endMeasure - section.startMeasure + 1;
      const start = section.startMeasure;
      const end = section.endMeasure;

      // Extract section data
      const timeSigs = sequencer.measureTimeSigs.slice(start, end + 1);
      const vols = sequencer.measureVols.slice(start, end + 1);
      const volTransitions = sequencer.measureVolTransitions.slice(start, end + 1);
      const signals = sequencer.measureSignals.slice(start, end + 1);

      const sectionTracks = sequencer.tracks.map(t => {
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

      await saveSectionToCloud(
        name.trim(),
        savedData,
        userProfile.uid,
        visibility,
        userProfile.mestreId || undefined
      );

      onClose();
    } catch (err) {
      console.error(err);
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde.' : 'Erro ao salvar.');
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
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
            {lang === 'fr' ? 'Visibilité' : 'Visibilidade'}
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as CatalogVisibility)}
            className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
          >
            <option value="private">{lang === 'fr' ? 'Privé (Uniquement moi)' : 'Privado (Somente eu)'}</option>
            {userProfile?.role === 'mestre' && (
              <option value="mestre_group">{lang === 'fr' ? 'Mon groupe' : 'Meu grupo'}</option>
            )}
            {userProfile?.role === 'admin' && (
              <option value="admin_global">{lang === 'fr' ? 'Global (Tout le monde)' : 'Global (Todos)'}</option>
            )}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition-colors"
            disabled={isSaving}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          >
            {isSaving ? '...' : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface LoadSectionModalProps {
  insertAtMeasure: number;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const LoadSectionModal: React.FC<LoadSectionModalProps> = ({ insertAtMeasure, onClose, lang }) => {
  const { userProfile } = useAuth();
  const sequencer = useSequencer();
  
  const [sections, setSections] = useState<CloudSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null).then(data => {
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
    if (confirm(lang === 'fr' ? 'Supprimer définitivement cette section ?' : 'Excluir permanentemente esta seção?')) {
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
                  <span className="font-bold text-[#1a1a1a]">{sec.name}</span>
                  <span className="text-xs text-[#666]">{new Date(sec.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoad(sec)}
                    className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs hover:bg-[#6b1e11] transition-colors cordel-border-sm"
                  >
                    {lang === 'fr' ? 'Insérer' : 'Inserir'}
                  </button>
                  {(userProfile?.role === 'admin' || userProfile?.uid === sec.ownerId) && (
                    <button
                      onClick={() => handleDelete(sec)}
                      className="p-1 hover:bg-[#1a1a1a]/10 rounded transition-colors text-xl"
                      title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                    >
                      🗑️
                    </button>
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
