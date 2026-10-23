/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';
import { WorkspaceTemplateOptions, WorkspaceTemplateTrack, Language } from '../../types';
import { buildTemplateTracks } from './templateTracksBuilder';

interface UseSaveTemplateParams {
  lang: Language;
  onClose: () => void;
}

export function useSaveWorkspaceTemplate({ lang, onClose }: UseSaveTemplateParams) {
  const { userProfile } = useAuth();
  const audio = useAudio();
  const tracks = useSequencerStore((state) => state.tracks);
  const rodaTrackOrder = useSequencerStore((state) => state.rodaTrackOrder);
  const existingTemplates = useWorkspaceTemplateStore((state) => state.templates);

  const baseDefaultName = lang === 'pt' ? 'Modelo Batuque' : 'Gabarit Batuque';

  const computedDefaultName = useMemo(() => {
    if (!existingTemplates.some((t) => t.name.toLowerCase() === baseDefaultName.toLowerCase())) {
      return baseDefaultName;
    }
    let counter = 1;
    while (existingTemplates.some((t) => t.name.toLowerCase() === `${baseDefaultName.toLowerCase()} ${counter}`)) {
      counter++;
    }
    return `${baseDefaultName} ${counter}`;
  }, [existingTemplates, baseDefaultName]);

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [options, setOptions] = useState<WorkspaceTemplateOptions>({
    includeStructure: true,
    includeDisplayOrder: true,
    includeVolumePan: true,
    includeEQ: true,
    includeFX: true,
  });

  const toggleOption = (key: keyof WorkspaceTemplateOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || computedDefaultName;
    if (isSaving) return;

    setIsSaving(true);

    try {
      const templateTracks = buildTemplateTracks(tracks, options);

      const currentMasterFX = useSequencerStore.getState().masterFX;
      const masterSettings = {
        masterVol: audio?.masterVol,
        masterEQ: options.includeEQ ? audio?.masterEQ : undefined,
        masterCompressor: audio?.masterCompressor,
        reverbDecay: options.includeFX ? audio?.reverbDecay : undefined,
        masterReverbVol: options.includeFX ? audio?.masterReverbVol : undefined,
        masterFX: options.includeFX && currentMasterFX ? JSON.parse(JSON.stringify(currentMasterFX)) : undefined,
      };

      const ownerId = userProfile?.uid || 'local';
      const authorName = userProfile?.displayName || (ownerId === 'local' ? 'Local' : 'Utilisateur');

      await useWorkspaceTemplateStore.getState().addTemplate(
        {
          name: finalName,
          ownerId,
          authorName,
          options,
          tracks: templateTracks,
          rodaTrackOrder: options.includeDisplayOrder ? [...rodaTrackOrder] : tracks.map((t) => t.id),
          masterSettings,
        },
        userProfile?.role
      );

      setSuccessMessage(lang === 'pt' ? 'Modelo salvo com sucesso!' : 'Gabarit mémorisé avec succès !');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(lang === 'pt' ? `Erro ao salvar: ${err.message}` : `Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    name,
    setName,
    computedDefaultName,
    isSaving,
    successMessage,
    options,
    toggleOption,
    handleSave,
    tracks,
  };
}
