/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { useAudioBounce } from '../hooks/useAudioBounce';
import { usePublierVersDanca } from '../hooks/usePublierVersDanca';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { useAuth } from '../contexts/AuthContext';

/**
 * Composant de la barre d'outils permettant d'exporter la séquence 
 * vers Firebase pour l'application "O Girador Dança".
 */
export const BoutonExportDanse: React.FC = () => {
  const { genererBounce, estEnCalcul } = useAudioBounce();
  const { publierMasterAudio, estEnCoursPublication } = usePublierVersDanca();
  
  const [statut, setStatut] = useState<'repos' | 'calcul' | 'envoi' | 'succes' | 'erreur'>('repos');
  const [messageErreurUI, setMessageErreurUI] = useState<string>('');

  // Extraction optimisée des données nécessaires du store
  const { bpm, measureBpms, totalMesures, timeSig, metadata, mestreSignals, songSections, measureSignals, measureTimeSigs, measureBpmTransitions } = useSequencerStore(
    useShallow(state => ({
      bpm: state.bpm,
      measureBpms: state.measureBpms,
      totalMesures: state.totalMeasures,
      timeSig: state.timeSig,
      metadata: state.metadata,
      mestreSignals: state.mestreSignals,
      songSections: state.songSections,
      measureSignals: state.measureSignals,
      measureTimeSigs: state.measureTimeSigs,
      measureBpmTransitions: state.measureBpmTransitions
    }))
  );
  
  const { lang, alertAsync, confirmAsync } = useSequencer();
  const { userProfile, isAdmin } = useAuth();

  const gererExport = async () => {
    try {
      const hasAccess = isAdmin || userProfile?.hasDancaAccess;
      
      if (!hasAccess) {
        const wantToSubscribe = await confirmAsync(
          lang === 'fr' 
            ? "Pour envoyer cette musique vers l'application O Girador Dança, vous devez activer le pont entre les deux applications. Souhaitez-vous souscrire à cette option ?"
            : "Para enviar esta música para o aplicativo O Girador Dança, você deve ativar a ponte entre os dois aplicativos. Deseja assinar esta opção?"
        );
        if (wantToSubscribe) {
          window.open('https://orquestrador.o-girador.com', '_blank');
        }
        return;
      }

      setStatut('calcul');
      setMessageErreurUI('');
      const blob = await genererBounce();
      
      setStatut('envoi');
      const tenantId = (metadata as any)?.tenantId || userProfile?.groupId || 'tenant_local';
      const titre = metadata?.toada || 'Nouvelle Toada';
      
      // Utiliser le titre pour le nom de fichier/document (formatage URL-safe)
      const titreFormate = titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const idFallback = titreFormate ? titreFormate : `brouillon_${Date.now()}`;
      const morceauId = (metadata as any)?.morceauId || idFallback;
      
      const expandedMeasures = getExpandedMeasures(totalMesures, songSections || []);
      const sinaisDoMestreAbsolus: any[] = [];
      
      expandedMeasures.forEach((measureInfo, absoluteIndex) => {
        const signalId = measureSignals?.[measureInfo.baseMeasure];
        if (signalId) {
          const mestreSignal = mestreSignals?.find(s => s.id === signalId);
          if (mestreSignal) {
            sinaisDoMestreAbsolus.push({
              mesure: absoluteIndex,
              type: mestreSignal.name
            });
          }
        }
      });
      
      let lastSeenBpm = bpm;
      let lastSeenTransition = 'immediate';
      
      const measureBpmsAbsolus = expandedMeasures.map(measureInfo => {
        if (measureBpms[measureInfo.baseMeasure] !== undefined) {
          lastSeenBpm = measureBpms[measureInfo.baseMeasure];
        }
        return lastSeenBpm;
      });

      const measureBpmTransitionsAbsolus = expandedMeasures.map(measureInfo => {
        if (measureBpmTransitions[measureInfo.baseMeasure] !== undefined) {
          lastSeenTransition = measureBpmTransitions[measureInfo.baseMeasure];
        }
        return lastSeenTransition;
      });

      const measureTimeSigsAbsolus = expandedMeasures.map(measureInfo => measureTimeSigs[measureInfo.baseMeasure] || timeSig);
      
      const bpmReel = measureBpmsAbsolus.length > 0 ? measureBpmsAbsolus[0] : bpm;

      // Filtrer les valeurs undefined pour Firestore
      const payloadBrut = {
        id: morceauId,
        tenantId,
        nom: titre,
        bpm: bpmReel,
        measureBpms: measureBpmsAbsolus,
        measureBpmTransitions: measureBpmTransitionsAbsolus,
        measureTimeSigs: measureTimeSigsAbsolus,
        totalMesures: expandedMeasures.length,
        sinaisDoMestre: sinaisDoMestreAbsolus,
        toada: metadata?.toada,
        nacao: metadata?.nacao,
        compositor: metadata?.compositor,
        ritmo: metadata?.ritmo,
        videoUrl: metadata?.youtubeUrl || (metadata as any)?.link,
        timeSig: timeSig,
        mestreId: (metadata as any)?.mestreId
      };
      
      const payloadPropre = Object.fromEntries(
        Object.entries(payloadBrut).filter(([_, v]) => v !== undefined)
      );

      await publierMasterAudio(blob, payloadPropre as any);
      
      setStatut('succes');
      setTimeout(() => setStatut('repos'), 3000); // Retour au repos après 3s
    } catch (err: any) {
      console.error(err);
      
      const errMsg = err.message || '';
      if (errMsg.includes('Erreur Audio Render')) {
        setMessageErreurUI('Erreur Render');
      } else if (errMsg.includes('Firebase Permission')) {
        setMessageErreurUI('Erreur Permission');
      } else {
        setMessageErreurUI('Erreur Serveur');
      }

      setStatut('erreur');
      alert(`[CRASH EXPORT] ${errMsg}`);
      setTimeout(() => {
        setStatut('repos');
        setMessageErreurUI('');
      }, 5000);
    }
  };

  const estOccupe = statut === 'calcul' || statut === 'envoi';

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
      title={lang === 'pt' ? "Exportar para O Girador Dança" : "Publier la séquence pour l'application O Girador Dança"}
    >
      {statut === 'repos' && (
        <>
          <UploadCloud className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Exportar p/ Dança' : 'Publier pour la Danse'}</span>
        </>
      )}
      
      {statut === 'calcul' && (
        <>
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>{lang === 'pt' ? 'Calculando...' : 'Calcul...'}</span>
        </>
      )}

      {statut === 'envoi' && (
        <>
          <UploadCloud className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          <span>{lang === 'pt' ? 'Enviando...' : 'Envoi...'}</span>
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
