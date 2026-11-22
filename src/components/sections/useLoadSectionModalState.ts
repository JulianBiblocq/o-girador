import { useEffect, useMemo, useState } from 'react';
import LZString from 'lz-string';
import { deleteCloudSection, fetchCloudSections, getCloudSectionData } from '../../cloudSections';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useCloudAudioBounce } from '../../hooks/useCloudAudioBounce';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CloudSection, SavedSectionData, SectionImportMode } from '../../types';
import { inspectSectionTrackMatch } from '../../utils/sections/sectionImportTrackMatcher';

function decodeInlineSectionData(raw: string | undefined): SavedSectionData | null {
  if (!raw) return null;
  try {
    const json = LZString.decompressFromBase64(raw);
    return json ? (JSON.parse(json) as SavedSectionData) : null;
  } catch {
    return null;
  }
}

export function useLoadSectionModalState(insertAtMeasure: number, onClose: () => void, lang: 'fr' | 'pt') {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const tracks = useSequencerStore((s) => s.tracks);
  const currentBpm = useSequencerStore((s) => s.bpm);

  const [sections, setSections] = useState<CloudSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<SectionImportMode>('insert');
  const [createMissingTracks, setCreateMissingTracks] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [bouncingSectionId, setBouncingSectionId] = useState<string | null>(null);
  const { genererEtUploaderSectionCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  useEffect(() => {
    if (!userProfile) return;
    fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null, userProfile.canWriteSequenciador).then((data) => {
      setSections(data);
      if (data.length > 0) setSelectedId((prev) => prev ?? data[0].id);
      setIsLoading(false);
    });
  }, [userProfile]);

  const decodedById = useMemo(() => {
    const map = new Map<string, SavedSectionData>();
    sections.forEach((sec) => {
      const parsed = decodeInlineSectionData(sec.data);
      if (parsed) map.set(sec.id, parsed);
    });
    return map;
  }, [sections]);

  const activeData = selectedId ? decodedById.get(selectedId) ?? null : null;
  const matchInfo = useMemo(() => inspectSectionTrackMatch(activeData, tracks), [activeData, tracks]);

  const handleLoad = async (sectionInfo: CloudSection) => {
    try {
      const data = decodedById.get(sectionInfo.id) ?? (await getCloudSectionData(sectionInfo.id));
      if (data && sequencer.handleInsertCloudSection) {
        const applied = sequencer.handleInsertCloudSection(data, insertAtMeasure, {
          mode: importMode, createMissingTracks, sectionName: sectionInfo.name,
        });
        if (applied !== false) onClose();
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
      const data = decodedById.get(sec.id) ?? (await getCloudSectionData(sec.id));
      if (data) {
        const newAudioUrl = await genererEtUploaderSectionCloudBounce(sec.id, data, currentBpm || 100);
        setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, audioUrl: newAudioUrl } : s)));
        await sequencer.alertAsync(lang === 'fr' ? 'Audio généré avec succès !' : 'Áudio gerado com sucesso!');
      }
    } catch (err: any) {
      await sequencer.alertAsync((lang === 'fr' ? 'Erreur génération audio : ' : 'Erro geração de áudio: ') + (err.message || String(err)));
    } finally {
      setBouncingSectionId(null);
    }
  };

  return {
    userProfile, isAdmin, sections, selectedId, setSelectedId, importMode, setImportMode,
    createMissingTracks, setCreateMissingTracks, isLoading, bouncingSectionId, isBouncingCloud,
    decodedById, matchInfo, handleLoad, handleDelete, handleGenerateAudio,
  };
}
