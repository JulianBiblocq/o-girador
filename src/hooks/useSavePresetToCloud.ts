import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { CatalogVisibility, Preset } from '../types';
import { useCloudAudioBounce } from './useCloudAudioBounce';
import { useQueryClient } from '@tanstack/react-query';
import { useSequencerStore } from '../stores/useSequencerStore';

interface UseSavePresetOptions {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

/**
 * Hook gérant la logique de validation, vérification de doublons, rebond audio
 * et persistance d'un preset vers Firebase Firestore.
 */
export function useSavePresetToCloud({ presetData, defaultName, onClose, lang }: UseSavePresetOptions) {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();

  const [name, setName] = useState(defaultName || '');
  const [visibility, setVisibility] = useState<CatalogVisibility>('mestre_group');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(true);

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const isSamambaiaMember = Boolean(
    (userProfile?.groupId && userProfile.groupId.toLowerCase().includes('samambaia')) ||
    userProfile?.canWriteSequenciador ||
    userProfile?.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
  );

  const groupDisplayName = userProfile?.groupName || (isSamambaiaMember ? 'Samambaia' : userProfile?.groupId) || 'Cloud';

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);

    try {
      const presetName = name.trim();
      const myGroupMestreId = (userProfile.role === 'mestre' || (userProfile.dbRole as any) === 'mestre')
        ? userProfile.uid
        : (userProfile.mestreId || (isSamambaiaMember ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null));
      
      // Normalisation canonique du groupId en minuscules
      const myGroupId = userProfile.groupId 
        ? userProfile.groupId.trim().toLowerCase() 
        : (isSamambaiaMember ? 'samambaia' : undefined);

      const { savePresetToCloud, fetchCloudPresets } = await import('../cloudLibrary');
      const existingPresets = await fetchCloudPresets(
        userProfile.uid,
        userProfile.role,
        myGroupMestreId,
        myGroupId,
        userProfile.canWriteSequenciador
      );

      let existingPreset = existingPresets.find(p => p.name.trim() === presetName && p.ownerId === userProfile.uid);
      if (!existingPreset && myGroupMestreId) {
        existingPreset = existingPresets.find(p => 
          p.name.trim() === presetName && 
          (p.mestreId === myGroupMestreId || p.ownerId === myGroupMestreId)
        );
      }

      const isFree = !userProfile || (!isAdmin && userProfile.role !== 'mestre');
      if (isFree && !existingPreset) {
        const ownedCount = existingPresets.filter(p => p.ownerId === userProfile.uid).length;
        if (ownedCount >= 3 && !userProfile.email?.includes('@ogirador.com')) {
          await sequencer.alertAsync(lang === 'fr' 
            ? 'Vous avez atteint la limite de 3 morceaux cloud pour un compte gratuit. Mettez à niveau votre compte via Orchestrador pour sauvegarder en illimité.' 
            : 'Você atingiu o limite de 3 músicas na nuvem para uma conta gratuita. Atualize sua conta via Orchestrador para salvar ilimitado.');
          setIsSaving(false);
          return;
        }
      }

      let targetDocId: string | undefined = undefined;
      if (existingPreset) {
        const isOwnPreset = existingPreset.ownerId === userProfile.uid;
        const isMestre = userProfile.role === 'mestre' || (userProfile.dbRole as any) === 'mestre' || userProfile.uid === myGroupMestreId;
        const isPresetLocked = (existingPreset as any).isLocked === true;

        if (isPresetLocked && !isMestre && !isAdmin) {
          await sequencer.alertAsync(lang === 'fr'
            ? `🔒 Le morceau "${presetName}" est verrouillé par le Mestre. Il ne peut être ni modifié ni écrasé par un élève.`
            : `🔒 A música "${presetName}" está bloqueada pelo Mestre. Não pode ser modificada nem sobrescrita.`);
          setIsSaving(false);
          return;
        }

        if (!isOwnPreset && !isMestre && !isAdmin) {
          await sequencer.alertAsync(lang === 'fr'
            ? `⚠️ Le morceau "${presetName}" a été créé par le Mestre ou un autre membre. Vous ne pouvez pas l'écraser. Veuillez choisir un autre nom pour votre version personnelle.`
            : `⚠️ A música "${presetName}" foi criada pelo Mestre ou por outro membro. Você não pode sobrescrevê-la. Escolha outro nome para sua versão pessoal.`);
          setIsSaving(false);
          return;
        }

        const confirmMessage = isOwnPreset
          ? (lang === 'fr' ? `Le preset "${presetName}" existe déjà. Voulez-vous le remplacer ?` : `O preset "${presetName}" já existe. Deseja substituí-lo?`)
          : (lang === 'fr' ? `⚠️ Attention : Le preset "${presetName}" a été créé par un autre utilisateur. En tant que Mestre/Admin, voulez-vous vraiment le remplacer ?` : `⚠️ Atenção: O preset "${presetName}" foi criado por outra pessoa. Deseja substituí-lo?`);
        
        const confirmReplace = await sequencer.confirmAsync(confirmMessage);
        if (!confirmReplace) {
          setIsSaving(false);
          return;
        }
        targetDocId = existingPreset.id;
      }

      const finalPresetData = { ...presetData };
      finalPresetData.metadata = { ...finalPresetData.metadata, toada: presetName } as any;

      let finalVisibility = visibility;
      if (isAdmin && visibility === 'public') {
        finalVisibility = 'admin_global';
      }

      const presetId = await savePresetToCloud(
        presetName,
        finalPresetData,
        userProfile.uid,
        finalVisibility,
        undefined,
        undefined,
        targetDocId,
        myGroupMestreId || undefined,
        myGroupId,
        userProfile.canWriteSequenciador
      );

      if (autoGenerateAudio) {
        try {
          const audioUrl = await genererEtUploaderPresetCloudBounce(presetId, finalPresetData, finalPresetData.bpm || 100);
          await savePresetToCloud(
            presetName,
            finalPresetData,
            userProfile.uid,
            finalVisibility,
            undefined,
            audioUrl ?? null,
            presetId,
            myGroupMestreId || undefined,
            myGroupId,
            userProfile.canWriteSequenciador
          );
        } catch (audioErr) {
          console.warn("useSavePresetToCloud - Échec non bloquant de l'audio cloud:", audioErr);
        }
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set('loadPreset', presetId);
        window.history.replaceState(null, '', url.toString());
        localStorage.setItem('girador_last_loaded_preset_id', presetId);
      } catch (_e) {}

      const newMeta = {
        toada: finalPresetData.metadata?.toada || presetName,
        nacao: finalPresetData.metadata?.nacao || '',
        compositor: finalPresetData.metadata?.compositor || '',
        ritmo: finalPresetData.metadata?.ritmo || '',
        ...finalPresetData.metadata,
        morceauId: presetId
      };
      useSequencerStore.getState().setMetadata(newMeta);
      if (sequencer.setMetadata) {
        sequencer.setMetadata(newMeta);
      }

      window.dispatchEvent(new Event('force-autosave'));
      queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
      window.dispatchEvent(new Event('refresh-cloud-presets'));
      await sequencer.alertAsync(lang === 'pt' ? '✅ Salvo na nuvem!' : '✅ Sauvegardé dans le cloud !');
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
    isSaving,
    autoGenerateAudio,
    setAutoGenerateAudio,
    isBouncingCloud,
    handleSave,
    userProfile,
    groupDisplayName
  };
}
