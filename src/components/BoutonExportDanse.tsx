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
  const { bpm, totalMesures, timeSig, metadata } = useSequencerStore(
    useShallow(state => ({
      bpm: state.bpm,
      totalMesures: state.totalMeasures,
      timeSig: state.timeSig,
      metadata: state.metadata
    }))
  );

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
        tenantId,
        morceauId,
        titre,
        bpm,
        totalMesures,
        signature: timeSig || '4/4',
        dateExport: Date.now()
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
        cordel-border-sm text-[10px] md:text-xs font-bold font-cactus uppercase cursor-pointer 
        transition-colors h-[28px] md:h-[36px]
        ${estOccupe ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] opacity-70 cursor-not-allowed' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}
        ${statut === 'succes' ? 'bg-[#2ecc71] text-white border-[#27ae60]' : ''}
        ${statut === 'erreur' ? 'bg-[#e74c3c] text-white border-[#c0392b]' : ''}
      `}
      title="Publier la séquence pour l'application O Girador Dança"
    >
      {statut === 'repos' && (
        <>
          <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
          <span className="hidden md:inline">Publier pour la Danse</span>
        </>
      )}
      
      {statut === 'calcul' && (
        <>
          <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 animate-spin" />
          <span>Calcul...</span>
        </>
      )}

      {statut === 'envoi' && (
        <>
          <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 animate-bounce" />
          <span>Envoi...</span>
        </>
      )}

      {statut === 'succes' && (
        <>
          <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
          <span>Succès !</span>
        </>
      )}

      {statut === 'erreur' && (
        <span>{messageErreurUI || 'Erreur'}</span>
      )}
    </button>
  );
};
