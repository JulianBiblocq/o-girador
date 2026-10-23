
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { SongSection, CatalogVisibility } from '../../types';
import { saveSectionToCloud, fetchCloudSections } from '../../cloudSections';
import { useCloudAudioBounce } from '../../hooks/useCloudAudioBounce';
import { extractSectionData } from './sectionDataExtractor';

interface UseSaveSectionParams {
  section: SongSection;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export function useSaveSectionAction({ section, onClose, lang }: UseSaveSectionParams) {
  const { userProfile } = useAuth();
  const sequencer = useSequencer();
  const [name, setName] = useState(section.name);
  const [visibility, setVisibility] = useState<CatalogVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);
  const { genererEtUploaderSectionCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);
    try {
      const storeState = useSequencerStore.getState();
      const savedData = extractSectionData(section, storeState);
      const existingSections = await fetchCloudSections(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null, userProfile.canWriteSequenciador);
      const existingSection = existingSections.find((s) => s.name.trim() === name.trim() && s.ownerId === userProfile.uid);
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
        name.trim(), savedData, userProfile.uid, visibility, userProfile.role,
        targetDocId, myGroupMestreId, myGroupId, userProfile.canWriteSequenciador
      );

      if (autoGenerateAudio) {
        try {
          await genererEtUploaderSectionCloudBounce(sectionId, savedData, storeState.bpm || 100);
        } catch (audioErr) {
          console.error('Audio generation failed after save', audioErr);
        }
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      await sequencer.alertAsync((lang === 'fr' ? 'Erreur lors de la sauvegarde : ' : 'Erro ao salvar : ') + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    name,
    setName,
    visibility,
    setVisibility,
    autoGenerateAudio,
    setAutoGenerateAudio,
    handleSave,
    busy: isSaving || isBouncingCloud,
    userProfile,
  };
}
