/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useCloudAudioBounce } from './useCloudAudioBounce';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { launchCrossApp } from '../utils/crossAppAuth';
import { getEcosystemUrl } from '../constants/ecosystemUrls';

export function useBoutonExportDanse() {
  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, bounceError, progress, stepLabel } = useCloudAudioBounce();
  const audio = useAudio();
  const [statut, setStatut] = useState<'repos' | 'calcul' | 'succes' | 'erreur'>('repos');
  const [messageErreurUI, setMessageErreurUI] = useState<string>('');

  const { bpm, metadata, isLoopRegionActive, loopStartMeasure, loopEndMeasure, loopMode } = useSequencerStore(
    useShallow(state => ({
      bpm: state.bpm,
      metadata: state.metadata,
      isLoopRegionActive: state.isLoopRegionActive,
      loopStartMeasure: state.loopStartMeasure,
      loopEndMeasure: state.loopEndMeasure,
      loopMode: state.loopMode,
    }))
  );

  const { lang, confirmAsync } = useSequencer();
  const { userProfile, isAdmin } = useAuth();

  const gererExport = async () => {
    try {
      const hasAccess = isAdmin || userProfile?.hasDancaAccess || userProfile?.canWriteDansador;
      if (!hasAccess) {
        const wantToSubscribe = await confirmAsync(
          lang === 'fr'
            ? "Pour envoyer cette musique vers l'application O Girador Dança, vous devez activer le pont entre les deux applications. Souhaitez-vous souscrire à cette option ?"
            : "Para enviar esta música para o aplicativo O Girador Dança, você deve ativar a ponte entre os dois aplicativos. Deseja assinar esta opção?"
        );
        if (wantToSubscribe) launchCrossApp(getEcosystemUrl('orquestrador'), { appKey: 'orquestrador', appLabel: "l'Orquestrador" });
        return;
      }

      setStatut('calcul');
      setMessageErreurUI('');

      const tenantId = (metadata as any)?.tenantId || userProfile?.groupId || 'global';
      const titre = metadata?.toada || 'Nouvelle Toada';
      const titreFormate = titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const lastPresetId = localStorage.getItem('girador_last_loaded_preset_id') || new URLSearchParams(window.location.search).get('loadPreset');
      const rawMorceauId = (metadata as any)?.morceauId || lastPresetId || (titreFormate ? titreFormate : `brouillon_${Date.now()}`);
      const morceauId = (rawMorceauId && rawMorceauId !== 'undefined' && rawMorceauId !== 'null') ? String(rawMorceauId).trim() : `brouillon_${Date.now()}`;

      const currentPresetData = audio.getCurrentPresetData();
      currentPresetData.metadata = {
        ...(currentPresetData.metadata || {}),
        toada: titre,
        nacao: currentPresetData.metadata?.nacao || '',
        compositor: currentPresetData.metadata?.compositor || '',
        ritmo: currentPresetData.metadata?.ritmo || '',
      };

      const audioUrl = await genererEtUploaderPresetCloudBounce(
        morceauId,
        currentPresetData as any,
        bpm,
        { tenantId, isLoopRegionActive, loopStartMeasure, loopEndMeasure, loopMode }
      );

      if (!audioUrl) throw new Error(bounceError || (lang === 'pt' ? 'Falha ao gerar áudio' : 'Échec de génération du bounce'));

      setStatut('succes');
      setTimeout(() => setStatut('repos'), 3000);
    } catch (err: any) {
      console.error(err);
      setMessageErreurUI(err.message || 'Erreur');
      setStatut('erreur');
      setTimeout(() => { setStatut('repos'); setMessageErreurUI(''); }, 5000);
    }
  };

  return {
    statut,
    messageErreurUI,
    gererExport,
    isBouncingCloud,
    progress,
    stepLabel,
    lang,
  };
}
