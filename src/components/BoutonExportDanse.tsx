/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { useCloudAudioBounce } from '../hooks/useCloudAudioBounce';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { launchCrossApp } from '../utils/crossAppAuth';
import { getEcosystemUrl } from '../constants/ecosystemUrls';

/**
 * Composant de la barre d'outils permettant de synchroniser la séquence 
 * vers Firebase pour l'application "O Girador Dança" via le moteur hors-ligne unifié.
 */
export const BoutonExportDanse: React.FC = () => {
  const { genererEtUploaderPresetCloudBounce, isBouncingCloud, bounceError } = useCloudAudioBounce();
  const audio = useAudio();
  
  const [statut, setStatut] = useState<'repos' | 'calcul' | 'succes' | 'erreur'>('repos');
  const [messageErreurUI, setMessageErreurUI] = useState<string>('');

  // Extraction optimisée des données nécessaires du store
  const { 
    bpm, 
    metadata, 
    isLoopRegionActive,
    loopStartMeasure,
    loopEndMeasure,
    loopMode
  } = useSequencerStore(
    useShallow(state => ({
      bpm: state.bpm,
      metadata: state.metadata,
      isLoopRegionActive: state.isLoopRegionActive,
      loopStartMeasure: state.loopStartMeasure,
      loopEndMeasure: state.loopEndMeasure,
      loopMode: state.loopMode
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
        if (wantToSubscribe) {
          launchCrossApp(getEcosystemUrl('orquestrador'), { appKey: 'orquestrador', appLabel: "l'Orquestrador" });
        }
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
        ritmo: currentPresetData.metadata?.ritmo || ''
      };

      const audioUrl = await genererEtUploaderPresetCloudBounce(
        morceauId,
        currentPresetData as any,
        bpm,
        {
          tenantId,
          isLoopRegionActive,
          loopStartMeasure,
          loopEndMeasure,
          loopMode
        }
      );

      if (!audioUrl) {
        throw new Error(bounceError || (lang === 'pt' ? 'Falha ao gerar áudio' : 'Échec de génération du bounce'));
      }

      setStatut('succes');
      setTimeout(() => setStatut('repos'), 3000);
    } catch (err: any) {
      console.error(err);
      setMessageErreurUI(err.message || 'Erreur');
      setStatut('erreur');
      setTimeout(() => {
        setStatut('repos');
        setMessageErreurUI('');
      }, 5000);
    }
  };

  const estOccupe = statut === 'calcul' || isBouncingCloud;

  return (
    <button
      onClick={gererExport}
      disabled={estOccupe}
      className={`
        flex items-center justify-center gap-1.5 px-2 py-1.5 
        cordel-border-sm text-[10px] font-bold font-cactus cursor-pointer 
        transition-colors w-full
        ${estOccupe ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] opacity-70 cursor-not-allowed' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}
        ${statut === 'succes' ? 'bg-[#2ecc71] text-white border-[#27ae60]' : ''}
        ${statut === 'erreur' ? 'bg-[#e74c3c] text-white border-[#c0392b]' : ''}
      `}
      title={lang === 'pt' ? "Sincronizar com O Girador Dança" : "Synchroniser vers O Girador Dança"}
    >
      {statut === 'repos' && !isBouncingCloud && (
        <>
          <UploadCloud className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Sincronizar Dança' : 'Synchroniser Danse'}</span>
        </>
      )}
      
      {(statut === 'calcul' || isBouncingCloud) && (
        <>
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>{lang === 'pt' ? 'Sincronizando...' : 'Synchronisation...'}</span>
        </>
      )}

      {statut === 'succes' && (
        <>
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Sucesso!' : 'Succès !'}</span>
        </>
      )}

      {statut === 'erreur' && (
        <span>{messageErreurUI || (lang === 'pt' ? 'Erro' : 'Erreur')}</span>
      )}
    </button>
  );
};
