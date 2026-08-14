/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { encoderWav } from '../utils/encodeurWav';

/**
 * Hook pour le rendu hors-ligne (Bounce) de la séquence active via OfflineAudioContext.
 * Respecte les contraintes de non-blocage (Tone.Offline + Web Worker pour l'encodage).
 */
export function useAudioBounce() {
  const [estEnCalcul, setEstEnCalcul] = useState(false);

  const genererBounce = async (): Promise<Blob> => {
    setEstEnCalcul(true);
    try {
      const state = useSequencerStore.getState();
      const { tracks, totalMeasures, measureBpms, measureTimeSigs, bpm, timeSig } = state;

      // 1. Calcul de la durée totale
      let dureeTotaleSec = 0;
      for (let m = 0; m < totalMeasures; m++) {
        const mBpm = measureBpms[m] || bpm;
        const mTimeSig = measureTimeSigs[m] || timeSig || '4/4';
        const beats = parseInt(mTimeSig.split('/')[0], 10);
        dureeTotaleSec += (60 / mBpm) * beats;
      }
      dureeTotaleSec += 1.5; // Marge pour la réverbe/queue

      console.log(`[Export Danse] ÉTAPE 1: Démarrage Tone.Offline... Durée calculée = ${dureeTotaleSec}s`);
      if (isNaN(dureeTotaleSec) || !isFinite(dureeTotaleSec) || dureeTotaleSec <= 0) {
        throw new Error(`Erreur Audio Render: Durée invalide (${dureeTotaleSec}s)`);
      }

      // 2. Rendu Hors-ligne
      const bufferHorsLigne = await Tone.Offline(async () => {
        // Chargement des instruments nécessaires
        const samplers = new Map<string, Tone.Sampler>();

        for (const track of tracks) {
          if (track.isMute || track.isBusFolder || !track.patterns) continue;
          
          const uiConf = instrumentsConfig[track.instrumentIdx];
          if (!uiConf || uiConf.type === 'voice') continue;
          
          const conf = instrumentAudioConfigs.find(c => c.id === uiConf.id);
          if (!conf) continue;

          // Création du Sampler
          if (!samplers.has(conf.id)) {
            const urls: Record<string, string> = {};
            conf.strokes.forEach(stroke => {
              // Prend le premier fichier de chaque stroke pour simplifier (pas de round-robin ici)
              if (stroke.files && stroke.files.length > 0) {
                let path = stroke.files[0];
                if (!path.startsWith('http')) {
                  path = path.startsWith('/') ? `${ASSETS_BASE_URL}${path.slice(1)}` : `${ASSETS_BASE_URL}${path}`;
                }
                urls[stroke.symbol] = path;
              }
            });
            const sampler = new Tone.Sampler({ urls }).toDestination();
            sampler.volume.value = -6; // Headroom
            samplers.set(conf.id, sampler);
          }
        }

        await Tone.loaded();

        // 3. Planification des notes
        let tempsCumule = 0;
        for (let m = 0; m < totalMeasures; m++) {
          const mBpm = measureBpms[m] || bpm;
          const mTimeSig = measureTimeSigs[m] || timeSig || '4/4';
          const parts = mTimeSig.split('/');
          const beats = parseInt(parts[0], 10);
          const beatUnit = parseInt(parts[1], 10);
          const ticksParMesure = beats * (96 / beatUnit);
          const dureeMesureSec = (60 / mBpm) * beats;

          for (const track of tracks) {
            if (track.isMute || track.isBusFolder || !track.patterns) continue;
            const uiConf = instrumentsConfig[track.instrumentIdx];
            if (!uiConf || uiConf.type === 'voice') continue;
            
            const conf = instrumentAudioConfigs.find(c => c.id === uiConf.id);
            if (!conf) continue;

            const sampler = samplers.get(conf.id);
            if (!sampler) continue;

            // Trouve le pattern assigné
            let patternActif = null;
            if (track.linkedToTrackId && !track.isLinkFolder) {
              const parent = tracks.find(t => String(t.id) === String(track.linkedToTrackId));
              if (parent) {
                patternActif = parent.patterns.find(p => p.measureAssignments[m]);
              }
            } else {
              patternActif = track.patterns.find(p => p.measureAssignments[m]);
            }

            if (!patternActif || !patternActif.activeSteps) continue;

            const resArray = patternActif.beatResolutions || Array(beats).fill(patternActif.steps / beats);
            let ticksCumulesStep = 0;
            const carteTicks: number[] = [];

            for (let b = 0; b < beats; b++) {
              const res = resArray[b] || (patternActif.steps / beats);
              const ticksParStep = (ticksParMesure / beats) / res;
              for (let r = 0; r < res; r++) {
                carteTicks.push(Math.round(ticksCumulesStep + r * ticksParStep));
              }
              ticksCumulesStep += (ticksParMesure / beats);
            }

            const stepCount = patternActif.steps;
            for (let s = 0; s < stepCount; s++) {
              const coup = patternActif.activeSteps[s];
              if (!coup || coup === 0 || coup === '0') continue;

              const tick = carteTicks[s] !== undefined ? carteTicks[s] : Math.floor((s * ticksParMesure) / stepCount);
              const ratioSec = tick / ticksParMesure;
              const tempsNote = tempsCumule + (ratioSec * dureeMesureSec);

              let note = typeof coup === 'string' ? coup : String(coup);
              
              // Normalisation minimale
              if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(conf.id)) {
                if (note === 't' || note === 'T') note = 'B';
                else if (note === 'C') note = 'c';
              } else if (conf.id === 'agbe' || conf.id === 'gongue') {
                if (note === 't') note = 'B';
              }

              const volume = (patternActif.volumes?.[s] ?? 80) / 100;
              sampler.triggerAttack(note, tempsNote, volume);
            }
          }
          tempsCumule += dureeMesureSec;
        }
      }, dureeTotaleSec);

      console.log("[Export Danse] ÉTAPE 2: Encodage WAV...");
      // 4. Encodage non-bloquant
      const blob = await encoderWav(bufferHorsLigne.get() as AudioBuffer);
      setEstEnCalcul(false);
      return blob;

    } catch (err) {
      console.error("[Export Danse] Erreur bloquante durant le calcul audio :", err);
      setEstEnCalcul(false);
      throw err;
    }
  };

  return {
    genererBounce,
    estEnCalcul
  };
}
