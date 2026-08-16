/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { useAudio } from '../contexts/AudioContext';

/**
 * Hook pour le rendu Temps-Réel (Bounce) de la séquence active.
 * Utilise Tone.Recorder connecté à la sortie Master et joue la séquence
 * en direct pour capturer tous les effets, eq, compression, et swing.
 */
export function useAudioBounce() {
  const [estEnCalcul, setEstEnCalcul] = useState(false);
  const audio = useAudio();

  const genererBounce = async (): Promise<Blob> => {
    setEstEnCalcul(true);
    try {
      const state = useSequencerStore.getState();
      const { totalMeasures, measureBpms, measureTimeSigs, bpm, timeSig, songSections } = state;

      const expandedMeasures = getExpandedMeasures(totalMeasures, songSections);

      // 1. Calcul de la durée totale
      let dureeTotaleSec = 0;
      for (let i = 0; i < expandedMeasures.length; i++) {
        const m = expandedMeasures[i].baseMeasure;
        const mBpm = measureBpms[m] || bpm;
        const mTimeSig = measureTimeSigs[m] || timeSig || '4/4';
        const beats = parseInt(mTimeSig.split('/')[0], 10);
        dureeTotaleSec += (60 / mBpm) * beats;
      }
      dureeTotaleSec += 1.5; // Marge pour la réverbe/queue

      console.log(`[Export Danse] ÉTAPE 1: Démarrage Enregistrement Temps-Réel... Durée calculée = ${dureeTotaleSec}s`);
      if (isNaN(dureeTotaleSec) || !isFinite(dureeTotaleSec) || dureeTotaleSec <= 0) {
        throw new Error(`Erreur Audio Render: Durée invalide (${dureeTotaleSec}s)`);
      }

      // Arrêt préalable du séquenceur au cas où il serait en lecture
      if (audio.isPlaying) {
        audio.handleStop();
        await new Promise(r => setTimeout(r, 100)); // Attendre l'arrêt
      } else {
        audio.handleStop(); // Remise à zéro au début
      }

      // 2. Initialisation de l'enregistreur
      const recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorder.start();

      // 3. Démarrage de la lecture
      await audio.handleTogglePlay();

      // 4. Attente automatique (blocage asynchrone non-bloquant pour le UI)
      await new Promise(resolve => setTimeout(resolve, dureeTotaleSec * 1000));

      // 5. Fin de l'enregistrement
      const blob = await recorder.stop();
      
      // Nettoyage
      Tone.getDestination().disconnect(recorder);
      recorder.dispose();
      audio.handleStop();

      console.log("[Export Danse] ÉTAPE 2: Enregistrement terminé !");
      setEstEnCalcul(false);
      return blob;

    } catch (err) {
      console.error("[Export Danse] Erreur bloquante durant l'enregistrement :", err);
      audio.handleStop(); // Sécurité
      setEstEnCalcul(false);
      throw err;
    }
  };

  return {
    genererBounce,
    estEnCalcul
  };
}
