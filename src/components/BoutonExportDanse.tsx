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
  const { bpm, totalMesures, timeSig, metadata, mestreSignals } = useSequencerStore(
    useShallow(state => ({
      bpm: state.bpm,
      totalMesures: state.totalMeasures,
      timeSig: state.timeSig,
      metadata: state.metadata,
      mestreSignals: state.mestreSignals
    }))
  );
  
  const { lang } = useSequencer();

  const gererExport = async () => {
    try {
      console.log("[Export Danse] Clic sur le bouton d'export !");
      setStatut('calcul');
      setMessageErreurUI('');
      const blob = await genererBounce();
      
      setStatut('envoi');
      const tenantId = (metadata as any)?.tenantId || 'tenant_local';
      const morceauId = (metadata as any)?.morceauId || `brouillon_${Date.now()}`;
      const titre = metadata?.toada || 'Nouvelle Toada';
      
      await publierMasterAudio(blob, {
        id: morceauId,
        tenantId,
        nom: titre,
        bpm,
        totalMesures,
        sinaisDoMestre: mestreSignals || [],
        toada: metadata?.toada,
        nacao: metadata?.nacao,
        compositor: metadata?.compositor,
        ritmo: metadata?.ritmo,
        videoUrl: metadata?.youtubeUrl || (metadata as any)?.link,
        timeSig: timeSig,
        mestreId: (metadata as any)?.mestreId
      });
      
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
