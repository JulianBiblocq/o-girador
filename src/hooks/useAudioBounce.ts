/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { useAudio } from '../contexts/AudioContext';
import { telemetryService } from '../services/telemetryService';

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
      const { 
        totalMeasures, 
        measureBpms, 
        measureTimeSigs, 
        bpm, 
        timeSig, 
        songSections, 
        measureBpmTransitions 
      } = state;

      const expandedMeasures = getExpandedMeasures(totalMeasures, songSections);

      // 1. Calcul de la durée totale (avec prise en compte des rampes de BPM)
      let dureeTotaleSec = 0;
      for (let i = 0; i < expandedMeasures.length; i++) {
        const m = expandedMeasures[i].baseMeasure;
        const currentMeasureBpm = measureBpms[m] || bpm || 120;
        
        // Obtenir le BPM de la mesure suivante (pour la formule de rampe)
        const nextM = (i + 1 < expandedMeasures.length) ? expandedMeasures[i + 1].baseMeasure : m;
        const nextMeasureBpm = measureBpms[nextM] || currentMeasureBpm;
        
        const transition = measureBpmTransitions[m] || 'immediate';
        const timeSigStr = measureTimeSigs[m] || timeSig || '4/4';
        const beatsPerMeasure = parseInt(timeSigStr.split('/')[0], 10) || 4;
        
        if (transition === 'immediate' || currentMeasureBpm === nextMeasureBpm) {
          dureeTotaleSec += (60 / currentMeasureBpm) * beatsPerMeasure;
        } else {
          dureeTotaleSec += (120 * beatsPerMeasure) / (currentMeasureBpm + nextMeasureBpm);
        }
      }

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

      // Désactivation de la boucle pour l'export (pour ne pas enregistrer le début d'un 2ème cycle)
      const previousIsLooping = state.isLooping;
      if (previousIsLooping) {
        state.setIsLooping(false);
      }

      // 2. Initialisation de l'enregistreur
      const recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorder.start();
      
      // Laisser l'enregistreur s'initialiser et capter le premier transitoire
      await new Promise(r => setTimeout(r, 100));

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
      
      // Restauration de l'état de boucle
      if (previousIsLooping) {
        state.setIsLooping(true);
      }

      setEstEnCalcul(false);
      return blob;

    } catch (err: any) {
      console.error("[Export Danse] Erreur bloquante durant l'enregistrement :", err);
      telemetryService.logError(err, 'useAudioBounce');
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
