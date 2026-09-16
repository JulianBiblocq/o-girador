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
        measureBpmTransitions,
        isLoopRegionActive,
        loopStartMeasure,
        loopEndMeasure,
        loopMode
      } = state;

      const isFiniteLoop = Boolean(
        isLoopRegionActive &&
        typeof loopMode === 'number' &&
        loopMode > 0 &&
        loopStartMeasure !== null &&
        loopEndMeasure !== null
      );

      const expandedMeasures = getExpandedMeasures(totalMeasures, songSections, {
        isLoopRegionActive,
        loopStartMeasure,
        loopEndMeasure,
        loopMode
      });

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

      // Sauvegarde et configuration de la boucle pour l'export
      const previousIsLooping = state.isLooping;
      const previousLoopIteration = state.currentLoopIteration;
      if (isFiniteLoop) {
        // En boucle finie N fois : garder la boucle active avec réinitialisation à l'itération 1
        state.setIsLooping(true);
        state.setCurrentLoopIteration(1);
      } else {
        // Sinon : désactiver la boucle pour ne jouer qu'un seul cycle linéaire
        state.setIsLooping(false);
      }

      // 2. Initialisation de l'enregistreur
      const recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorder.start();

      // 3. Démarrage immédiat de la lecture (aucun blanc artificiel au début)
      await audio.handleTogglePlay();

      // 4. Attente automatique de la durée exacte déroulée
      await new Promise(resolve => setTimeout(resolve, dureeTotaleSec * 1000));

      // 5. Clôture STRICTE de l'enregistrement pour éliminer tout rebond ou échantillon de la mesure 0
      // 🛡️ VIGILANCE 2 : Tone.getDestination().disconnect(recorder) -> await recorder.stop() -> audio.handleStop()
      Tone.getDestination().disconnect(recorder);
      const blob = await recorder.stop();
      recorder.dispose();
      audio.handleStop();
      
      // Restauration de l'état de boucle
      state.setIsLooping(previousIsLooping);
      state.setCurrentLoopIteration(previousLoopIteration);

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
