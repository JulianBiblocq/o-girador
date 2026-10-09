import React, { useState, useMemo } from 'react';
import { useAuth, checkHasFullPlaybackAccess } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { CatalogVisibility, Preset, CloudPreset } from '../types';
import { useCloudAudioBounce } from './useCloudAudioBounce';
import { useQueryClient } from '@tanstack/react-query';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useCloudPresets, normalizePresetName } from './queries/useCloudPresets';
import { SANCTUARIZED_PRESET_IDS } from '../cloudPresetsStorage';

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
  // 🛡️ Option « Générer l'audio » décochée par défaut à l'ouverture (sauvegarde Firestore instantanée)
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, progress, stepLabel } = useCloudAudioBounce();

  const isSamambaiaMember = Boolean(
    (userProfile?.groupId && userProfile.groupId.toLowerCase().includes('samambaia')) ||
    userProfile?.canWriteSequenciador ||
    userProfile?.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
  );

  const groupDisplayName = userProfile?.groupName || (isSamambaiaMember ? 'Samambaia' : userProfile?.groupId) || 'Cloud';

  const effectiveMestreId = (userProfile?.role === 'mestre' || (userProfile?.dbRole as any) === 'mestre')
    ? userProfile?.uid
    : (userProfile?.mestreId || (isSamambaiaMember ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null));

  const effectiveGroupId = userProfile?.groupId 
    ? userProfile.groupId.trim().toLowerCase() 
    : (isSamambaiaMember ? 'samambaia' : undefined);

  const isMestre = Boolean(
    userProfile?.role === 'mestre' ||
    (userProfile?.dbRole as any) === 'mestre' ||
    userProfile?.role === 'admin' ||
    (userProfile?.role as string) === 'super-admin' ||
    isAdmin ||
    userProfile?.canWriteSequenciador ||
    userProfile?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (effectiveMestreId && userProfile?.uid === effectiveMestreId)
  );

  const { data: cloudPresets = [] } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: userProfile?.role || 'visiteur',
    mestreId: effectiveMestreId || null,
    groupId: effectiveGroupId || null,
    groupName: userProfile?.groupName || null,
    canWriteSequenciador: userProfile?.canWriteSequenciador
  });

  const loadedMorceauId = (presetData.metadata as any)?.morceauId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('loadPreset') : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('girador_last_loaded_preset_id') : null);

  const matchedPreset = useMemo(() => {
    const trimmedName = name.trim();
    if (!trimmedName && !loadedMorceauId) return null;

    // 1. Chercher par ID de morceau chargé
    if (loadedMorceauId) {
      const byId = cloudPresets.find(p => p.id === loadedMorceauId);
      if (byId) return byId;
    }

    if (trimmedName) {
      // 2. Chercher dans les morceaux sanctuarisés par nom normalisé
      const sanctuarized = cloudPresets.find(p =>
        SANCTUARIZED_PRESET_IDS.has(p.id) &&
        normalizePresetName(p.name) === normalizePresetName(trimmedName)
      );
      if (sanctuarized) return sanctuarized;

      // 3. Chercher parmi les presets possédés par l'utilisateur
      const own = cloudPresets.find(p =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        p.ownerId === userProfile?.uid
      );
      if (own) return own;

      // 4. Chercher parmi les presets du groupe / mestre
      if (effectiveMestreId) {
        const groupPreset = cloudPresets.find(p =>
          p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (p.mestreId === effectiveMestreId || p.ownerId === effectiveMestreId)
        );
        if (groupPreset) return groupPreset;
      }

      // 5. Pour le Mestre ou Admin, matcher tout preset du catalogue du même nom
      if (isMestre || isAdmin) {
        const anyPreset = cloudPresets.find(p =>
          p.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (anyPreset) return anyPreset;
      }
    }

    return null;
  }, [cloudPresets, name, loadedMorceauId, userProfile?.uid, effectiveMestreId, isMestre, isAdmin]);

  const isExistingPreset = Boolean(matchedPreset);
  const isLocked = matchedPreset
    ? ((matchedPreset as any).isLocked === true || SANCTUARIZED_PRESET_IDS.has(matchedPreset.id))
    : false;
  const isOwnPreset = matchedPreset ? matchedPreset.ownerId === userProfile?.uid : false;
  const canUpdate = isMestre || isAdmin || (!isLocked && isOwnPreset);

  const handleSave = async (options?: { forceNew?: boolean }) => {
    if (!name.trim()) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);

    try {
      const presetName = name.trim();
      const myGroupMestreId = effectiveMestreId;
      const myGroupId = effectiveGroupId;

      const { savePresetToCloud, fetchCloudPresets } = await import('../cloudLibrary');

      let targetDocId: string | undefined = undefined;

      // Si l'utilisateur choisit de mettre à jour le morceau existant (ou par défaut sans forcer la création d'une copie)
      if (!options?.forceNew) {
        let targetPreset: CloudPreset | undefined = matchedPreset ?? undefined;

        if (!targetPreset) {
          const freshPresets = await fetchCloudPresets(
            userProfile.uid,
            userProfile.role,
            myGroupMestreId ?? null,
            myGroupId,
            userProfile.canWriteSequenciador
          );
          if (loadedMorceauId) {
            targetPreset = freshPresets.find(p => p.id === loadedMorceauId);
          }
          if (!targetPreset) {
            targetPreset = freshPresets.find(p =>
              SANCTUARIZED_PRESET_IDS.has(p.id) &&
              normalizePresetName(p.name) === normalizePresetName(presetName)
            );
          }
          if (!targetPreset) {
            targetPreset = freshPresets.find(p => p.name.trim().toLowerCase() === presetName.toLowerCase() && p.ownerId === userProfile.uid);
          }
          if (!targetPreset && myGroupMestreId) {
            targetPreset = freshPresets.find(p =>
              p.name.trim().toLowerCase() === presetName.toLowerCase() &&
              (p.mestreId === myGroupMestreId || p.ownerId === myGroupMestreId)
            );
          }
          if (!targetPreset && (isMestre || isAdmin)) {
            targetPreset = freshPresets.find(p => p.name.trim().toLowerCase() === presetName.toLowerCase());
          }
        }

        if (targetPreset) {
          const isOwn = targetPreset.ownerId === userProfile.uid;
          const isPresetLocked = (targetPreset as any).isLocked === true || SANCTUARIZED_PRESET_IDS.has(targetPreset.id);

          if (isPresetLocked && !isMestre && !isAdmin) {
            await sequencer.alertAsync(lang === 'fr'
              ? `🔒 Le morceau "${presetName}" est verrouillé par le Mestre. Il ne peut être ni modifié ni écrasé par un élève.`
              : `🔒 A música "${presetName}" está bloqueada pelo Mestre. Não pode ser modificada nem sobrescrita.`);
            setIsSaving(false);
            return;
          }

          if (!isOwn && !isMestre && !isAdmin) {
            await sequencer.alertAsync(lang === 'fr'
              ? `⚠️ Le morceau "${presetName}" a été créé par le Mestre ou un autre membre. Vous ne pouvez pas l'écraser. Veuillez choisir un autre nom pour votre version personnelle.`
              : `⚠️ A música "${presetName}" foi criada pelo Mestre ou por outro membro. Você não pode sobrescrevê-la. Escolha outro nome para sua versão pessoal.`);
            setIsSaving(false);
            return;
          }

          targetDocId = targetPreset.id;
        }
      }

      // Limite de 3 morceaux cloud pour un compte gratuit si nouveau morceau
      const isFree = !checkHasFullPlaybackAccess(userProfile, isAdmin);
      if (isFree && !targetDocId) {
        const ownedCount = cloudPresets.filter(p => p.ownerId === userProfile.uid).length;
        if (ownedCount >= 3 && !userProfile.email?.includes('@ogirador.com')) {
          await sequencer.alertAsync(lang === 'fr' 
            ? 'Vous avez atteint la limite de 3 morceaux cloud pour un compte gratuit. Mettez à niveau votre compte via Orchestrador pour sauvegarder en illimité.' 
            : 'Você atingiu o limite de 3 músicas na nuvem para uma conta gratuita. Atualize sua conta via Orchestrador para salvar ilimitado.');
          setIsSaving(false);
          return;
        }
      }

      const storeState = useSequencerStore.getState();
      const currentMarkers = Array.isArray(storeState.songMarkers) ? JSON.parse(JSON.stringify(storeState.songMarkers)) : [];
      const currentSections = Array.isArray(storeState.songSections) ? JSON.parse(JSON.stringify(storeState.songSections)) : [];
      const currentSignals = Array.isArray(storeState.measureSignals) ? JSON.parse(JSON.stringify(storeState.measureSignals)) : [];

      const currentVocalPreset = useAudioStore.getState().vocalPreset || presetData.vocalPreset || 'guide';
      const finalPresetData = {
        ...presetData,
        vocalPreset: currentVocalPreset,
        songMarkers: currentMarkers.length > 0 ? currentMarkers : (presetData.songMarkers || []),
        songSections: currentSections.length > 0 ? currentSections : (presetData.songSections || []),
        measureSignals: currentSignals.length > 0 ? currentSignals : (presetData.measureSignals || []),
      };
      finalPresetData.metadata = { ...finalPresetData.metadata, toada: presetName, vocalPreset: currentVocalPreset } as any;

      let finalVisibility = visibility;
      if (isAdmin && visibility === 'public') {
        finalVisibility = 'admin_global';
      }

      const preservedDraft = matchedPreset?.isDraft;
      const presetId = await savePresetToCloud(
        presetName,
        finalPresetData,
        userProfile.uid,
        finalVisibility,
        undefined,
        undefined, // 🛡️ audioUrl undefined : préserve scrupuleusement l'audioUrl existant dans Firestore via { merge: true } sans l'écraser
        targetDocId,
        myGroupMestreId || undefined,
        myGroupId,
        userProfile.canWriteSequenciador,
        preservedDraft,
        userProfile.role
      );

      if (autoGenerateAudio) {
        try {
          const audioUrl = await genererEtUploaderPresetCloudBounce(
            presetId,
            finalPresetData,
            finalPresetData.bpm || 100,
            {
              tenantId: myGroupId,
              isLoopRegionActive: storeState.isLoopRegionActive,
              loopStartMeasure: storeState.loopStartMeasure,
              loopEndMeasure: storeState.loopEndMeasure,
              loopMode: storeState.loopMode,
              lang
            }
          );
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
            userProfile.canWriteSequenciador,
            preservedDraft,
            userProfile.role
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
    groupDisplayName,
    progress,
    stepLabel,
    matchedPreset,
    isExistingPreset,
    isLocked,
    isMestre,
    canUpdate
  };
}
