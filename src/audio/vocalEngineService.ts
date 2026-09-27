/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
export { useAudioStore, useSequencerStore };
import { saveVocalRecording, getVocalRecording, getAllVocalRecordings, deleteVocalRecording } from '../db';
import { channels, masterVolumeNode } from './effectsChain';
import { instrumentsConfig } from '../data';
import { calculateDeterministicVocalClipMeta } from '../utils/audioBufferUtils';
import { VocalClipMeta } from '../types/store.types';
import { getBeatsPerMeasure } from '../utils/measureHelpers';

// Background-immune high-precision worker timer helpers to bypass browser tab throttling
let timerWorker: Worker | null = null;
let nextTimerId = 1;
const pendingCallbacks = new Map<number, () => void>();

function getTimerWorker(): Worker {
  if (typeof window === 'undefined') return null as any;
  if (!timerWorker) {
    const code = `
      let activeTimers = new Map();
      self.onmessage = (e) => {
        const { type, id, delay } = e.data;
        if (type === 'setTimeout') {
          const timerId = setTimeout(() => {
            postMessage({ type: 'timeout', id });
            activeTimers.delete(id);
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearTimeout') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearTimeout(timerId);
            activeTimers.delete(id);
          }
        } else if (type === 'setInterval') {
          const timerId = setInterval(() => {
            postMessage({ type: 'interval', id });
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearInterval') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearInterval(timerId);
            activeTimers.delete(id);
          }
        }
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    timerWorker = new Worker(url);
    URL.revokeObjectURL(url);

    timerWorker.onmessage = (e) => {
      const { type, id } = e.data;
      const callback = pendingCallbacks.get(id);
      if (callback) {
        callback();
        if (type === 'timeout') {
          pendingCallbacks.delete(id);
        }
      }
    };
  }
  return timerWorker;
}

export function workerSetTimeout(callback: () => void, delay: number): number {
  const id = nextTimerId++;
  pendingCallbacks.set(id, callback);
  getTimerWorker().postMessage({ type: 'setTimeout', id, delay });
  return id;
}

export function workerClearTimeout(id: number) {
  pendingCallbacks.delete(id);
  const worker = getTimerWorker();
  if (worker) {
    worker.postMessage({ type: 'clearTimeout', id });
  }
}

export interface ActiveVocal {
  mainPlayer: Tone.GrainPlayer;
  mainGain: Tone.Gain;
  currentBuffer: AudioBuffer | null;
  haasNodes?: {
    input: GainNode;
    delay: DelayNode;
    filter: BiquadFilterNode;
    rightGain: GainNode;
    merger: ChannelMergerNode;
  };
  chorusPlayers: Tone.GrainPlayer[];
  chorusGains: Tone.Gain[];
  panners: Tone.Panner[];
}

// Persistent GrainPlayer instance cache to prevent GC spikes and Web Audio leaks (Safeguard 2)
// Étanchéité stricte : indexé par clé composite `${trackId}_${patternId}` (Directive 2.D)
const activeVocals = new Map<string, ActiveVocal>();

let rehydratingPromise: Promise<void> | null = null;

function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(';base64,');
  const contentType = parts[0]?.split(':')[1] || 'audio/wav';
  const raw = typeof window !== 'undefined' ? window.atob(parts[1] || parts[0]) : '';
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export const vocalEngineService = {
  /**
   * Retourne la promesse de réhydratation active s'il y en a une en cours.
   */
  getRehydratingPromise(): Promise<void> | null {
    return rehydratingPromise;
  },

  /**
   * Réhydrate automatiquement l'ensemble des motifs vocaux enregistrés (IndexedDB -> RAM).
   * Scanne récursivement les pistes et sous-pistes vocales (toada, voice, puxador, coro),
   * récupère les Blobs depuis IndexedDB, les décode via le contexte Web Audio natif et les injecte dans useAudioStore
   * sous double indexation : patternId (accès direct) et `${track.id}_${patternId}` (accès séquenceur/anacrouse).
   */
  async rehydrateVocalBuffers(tracksToScan?: any[]): Promise<void> {
    // 🛡️ RACE CONDITION GUARD: Si une réhydratation précédente tourne déjà, attendre sa complétion avant d'enchaîner
    if (rehydratingPromise) {
      try {
        await rehydratingPromise;
      } catch (_) {}
    }

    let currentPromise: Promise<void> | null = null;
    currentPromise = (async () => {
      try {
        // 1. Audit console systématique au démarrage
        const records = await getAllVocalRecordings();
        console.log(`🔍 [IDB AUDIT] ${records.length} enregistrement(s) trouvé(s) :`, records.map(r => ({ id: r.patternId, type: typeof r.patternId })));

        // Sécuriser l'accès au contexte audio sans exiger d'interaction utilisateur préalable
        let rawCtx: AudioContext | null = null;
        try {
          rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
        } catch (_) {}
        if (!rawCtx || typeof rawCtx.decodeAudioData !== 'function') {
          const AudioCtxClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
          if (AudioCtxClass) {
            rawCtx = new AudioCtxClass();
          }
        }
        if (!rawCtx) {
          console.warn('🎙️ [VOCAL REHYDRATE] Contexte audio indisponible pour le décodage.');
          return;
        }

        const sequencerStore = useSequencerStore.getState();
        const rawTracks = tracksToScan && tracksToScan.length > 0 ? tracksToScan : sequencerStore.tracks;

        // Aplatissement récursif de l'arbre des pistes et sous-pistes (toada bus, link folders, subTracks)
        const flattenTracks = (trackList: any[]): any[] => {
          const result: any[] = [];
          const visitedIds = new Set<string | number>();

          const collect = (list: any[]) => {
            if (!Array.isArray(list)) return;
            for (const t of list) {
              if (!t) continue;
              if (!visitedIds.has(t.id)) {
                visitedIds.add(t.id);
                result.push(t);
              }
              if (t.subTracks && Array.isArray(t.subTracks)) {
                collect(t.subTracks);
              }
              if (t.tracks && Array.isArray(t.tracks)) {
                collect(t.tracks);
              }
            }
          };

          collect(trackList);
          return result;
        };

        const allTracks = flattenTracks(rawTracks || []);
        const entriesToBatch: Array<{ key: string | number; buffer: AudioBuffer; blob?: Blob }> = [];

        // 2. Traitement prioritaire des enregistrements IDB audités
        if (records.length > 0) {
          for (const rec of records) {
            try {
              const pid = rec.patternId;
              const numPid = Number(pid);
              const strPid = String(pid);

              // Trouver la piste et le pattern associés dans allTracks (par patternId OU vocalClip.id)
              let matchingPattern: any = null;
              const matchingTrack = allTracks.find(t =>
                Array.isArray(t.patterns) && t.patterns.some((p: any) => {
                  if (!p) return false;
                  const match = (
                    p.id === pid || String(p.id) === strPid || (!isNaN(numPid) && Number(p.id) === numPid) ||
                    (p.vocalClip && (
                      p.vocalClip.id === pid ||
                      String(p.vocalClip.id) === strPid ||
                      (!isNaN(numPid) && Number(p.vocalClip.id) === numPid)
                    ))
                  );
                  if (match) matchingPattern = p;
                  return match;
                })
              );

              const compositeKey = matchingTrack ? `${matchingTrack.id}_${pid}` : null;
              const currentBuffers = useAudioStore.getState().vocalBuffers;

              if (currentBuffers[pid] && (!compositeKey || currentBuffers[compositeKey])) {
                continue;
              }

              const arrayBuffer = await rec.audioBlob.arrayBuffer();
              const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

              // 1. Injection sous la clé de l'enregistrement IDB (numérique et string)
              useAudioStore.getState().setVocalBuffer(pid, audioBuffer);
              useAudioStore.getState().addVocalBlob(pid, rec.audioBlob);
              entriesToBatch.push({ key: pid, buffer: audioBuffer, blob: rec.audioBlob });

              if (!isNaN(numPid) && numPid !== pid) {
                useAudioStore.getState().setVocalBuffer(numPid, audioBuffer);
                useAudioStore.getState().addVocalBlob(numPid, rec.audioBlob);
                entriesToBatch.push({ key: numPid, buffer: audioBuffer, blob: rec.audioBlob });
              }
              if (strPid !== pid) {
                useAudioStore.getState().setVocalBuffer(strPid, audioBuffer);
                useAudioStore.getState().addVocalBlob(strPid, rec.audioBlob);
                entriesToBatch.push({ key: strPid, buffer: audioBuffer, blob: rec.audioBlob });
              }

              // 2. Injection sous la clé composite ${track.id}_${pid}
              if (matchingTrack) {
                const compKey = `${matchingTrack.id}_${pid}`;
                useAudioStore.getState().setVocalBuffer(compKey, audioBuffer);
                useAudioStore.getState().addVocalBlob(compKey, rec.audioBlob);
                entriesToBatch.push({ key: compKey, buffer: audioBuffer, blob: rec.audioBlob });

                if (!isNaN(numPid) && numPid !== pid) {
                  const compKeyNum = `${matchingTrack.id}_${numPid}`;
                  useAudioStore.getState().setVocalBuffer(compKeyNum, audioBuffer);
                  useAudioStore.getState().addVocalBlob(compKeyNum, rec.audioBlob);
                  entriesToBatch.push({ key: compKeyNum, buffer: audioBuffer, blob: rec.audioBlob });
                }

                // 3. Si le pattern associé porte un ID distinct (ex: ptn-toada-1 ou vocalClip.id)
                if (matchingPattern) {
                  const patId = matchingPattern.id;
                  const patCompKey = `${matchingTrack.id}_${patId}`;
                  useAudioStore.getState().setVocalBuffer(patId, audioBuffer);
                  useAudioStore.getState().addVocalBlob(patId, rec.audioBlob);
                  useAudioStore.getState().setVocalBuffer(patCompKey, audioBuffer);
                  useAudioStore.getState().addVocalBlob(patCompKey, rec.audioBlob);

                  if (matchingPattern.vocalClip?.id) {
                    const clipId = matchingPattern.vocalClip.id;
                    const clipCompKey = `${matchingTrack.id}_${clipId}`;
                    useAudioStore.getState().setVocalBuffer(clipId, audioBuffer);
                    useAudioStore.getState().addVocalBlob(clipId, rec.audioBlob);
                    useAudioStore.getState().setVocalBuffer(clipCompKey, audioBuffer);
                    useAudioStore.getState().addVocalBlob(clipCompKey, rec.audioBlob);
                  }
                }
              }

              console.log(`🎙️ [REHYDRATE SUCCESS] Buffer chargé depuis IDB pour motif ${pid}${matchingTrack ? ` (piste ${matchingTrack.id})` : ''}`);
            } catch (err) {
              console.error(`🎙️ [VOCAL REHYDRATE] Erreur décodage IDB record ${rec.patternId}:`, err);
            }
          }
        }

        // 3. Scanner les pistes vocales pour des données distantes (vocalAudioData / vocalAudioUrl) non présentes dans IDB
        const isVocalTrack = (t: any): boolean => {
          const inst = instrumentsConfig[t.instrumentIdx];
          const instId = inst?.id || (typeof t.instrumentId === 'string' ? t.instrumentId : '');
          const instType = inst?.type || (typeof t.instrumentType === 'string' ? t.instrumentType : '');
          const hasVocalInstrument = Boolean(
            instType === 'voice' ||
            instId === 'toada' ||
            instId === 'puxador' ||
            instId === 'coro' ||
            instId === 'voice'
          );
          const hasVocalPatterns = Array.isArray(t.patterns) && t.patterns.some((p: any) =>
            p && (p.vocalMode === 'micro' || Boolean(p.vocalClip) || Boolean(p.vocalAudioData) || Boolean(p.vocalAudioUrl))
          );
          return hasVocalInstrument || hasVocalPatterns;
        };

        const vocalTracks = allTracks.filter(isVocalTrack);

        for (const track of vocalTracks) {
          if (!track.patterns || track.patterns.length === 0) continue;

          for (const pattern of track.patterns) {
            const patternId = Number(pattern.id);
            const compositeKey = `${track.id}_${patternId}`;
            const currentBuffers = useAudioStore.getState().vocalBuffers;

            // Déjà en RAM sous les deux clés ?
            if (currentBuffers[compositeKey] && currentBuffers[patternId]) {
              continue;
            }

            // try / catch individuel par motif pour qu'un sample corrompu ne bloque pas les autres pistes
            try {
              let blob: Blob | null = null;

              // 1. Récupération depuis IndexedDB
              blob = await getVocalRecording(patternId);
              if (!blob && pattern.id !== patternId) {
                blob = await getVocalRecording(pattern.id);
              }

              // 2. Si non présent dans IndexedDB mais données audio embarquées (preset importé ou partagé)
              if (!blob && pattern.vocalAudioData) {
                try {
                  blob = base64ToBlob(pattern.vocalAudioData);
                  await saveVocalRecording(patternId, blob);
                } catch (b64Err) {
                  console.warn(`🎙️ [VOCAL REHYDRATE] Échec décodage base64 pour motif ${patternId}:`, b64Err);
                }
              } else if (!blob && pattern.vocalAudioUrl) {
                try {
                  const res = await fetch(pattern.vocalAudioUrl);
                  if (res.ok) {
                    blob = await res.blob();
                    await saveVocalRecording(patternId, blob);
                  }
                } catch (urlErr) {
                  console.warn(`🎙️ [VOCAL REHYDRATE] Échec téléchargement URL pour motif ${patternId}:`, urlErr);
                }
              }

              if (!blob) {
                continue;
              }

              // 3. Décodage Web Audio
              const arrayBuffer = await blob.arrayBuffer();
              const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

              // 4. Double indexation RAM immédiate (patternId + `${track.id}_${patternId}`)
              useAudioStore.getState().setVocalBuffer(patternId, audioBuffer);
              useAudioStore.getState().setVocalBuffer(compositeKey, audioBuffer);

              entriesToBatch.push(
                { key: patternId, buffer: audioBuffer, blob },
                { key: compositeKey, buffer: audioBuffer, blob }
              );

              // 5. Log de contrôle explicite obligatoire
              console.log(`🎙️ [REHYDRATE SUCCESS] Buffer chargé pour ${track.id} (motif ${patternId})`);
            } catch (err) {
              console.error(`🎙️ [VOCAL REHYDRATE] Erreur lors de la réhydratation du motif ${patternId}:`, err);
            }
          }
        }

        if (entriesToBatch.length > 0) {
          useAudioStore.getState().setVocalBuffersBatch(entriesToBatch);
        }
      } catch (globalErr) {
        console.error('🎙️ [VOCAL REHYDRATE] Erreur globale lors de la réhydratation:', globalErr);
      } finally {
        if (rehydratingPromise === currentPromise) {
          rehydratingPromise = null;
        }
      }
    })();

    rehydratingPromise = currentPromise;
    return currentPromise;
  },

  /**
   * Helper to scan vocal pattern and find the exact temporal start offset (in seconds)
   * of the first active syllable (either in pre-roll or main grid).
   */
  getPatternFirstNoteOffset(pattern: any, bpm: number): number {
    const beatsPerMeasure = 4;
    const measureDurationSec = (beatsPerMeasure * 60) / bpm;
    
    // 1. Scan Pre-roll (Mesure -1)
    if (pattern.preRollActiveSteps) {
      for (let i = 0; i < 16; i++) {
        const stepVal = pattern.preRollActiveSteps[i];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationPreRoll = measureDurationSec / 16;
          return -measureDurationSec + (i * stepDurationPreRoll);
        }
      }
    }
    
    // 2. Scan main measure grid
    if (pattern.activeSteps) {
      const steps = pattern.steps || 16;
      for (let j = 0; j < steps; j++) {
        const stepVal = pattern.activeSteps[j];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationMain = measureDurationSec / steps;
          return j * stepDurationMain;
        }
      }
    }
    
    return 0;
  },

  /**
   * Loads a vocal recording from IndexedDB and pre-decodes it into RAM.
   */
  async loadVocalRecording(patternId: number): Promise<Blob | null> {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        useAudioStore.getState().addVocalBlob(patternId, blob);
        
        // Zero-latency RAM pre-decode
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
          useAudioStore.getState().setVocalBuffer(patternId, audioBuffer);
        } catch (decErr) {
          console.error(`Failed to pre-decode vocal recording for pattern ${patternId}:`, decErr);
        }

        return blob;
      }
    } catch (err) {
      console.error(`Failed to load vocal recording for pattern ${patternId}:`, err);
    }
    return null;
  },

  /**
   * Deletes a vocal recording from IndexedDB and RAM, and cleans up audio nodes.
   */
  async deleteVocalRecording(patternId: number) {
    try {
      await deleteVocalRecording(patternId);
      useAudioStore.getState().removeVocalBlob(patternId);
      useAudioStore.getState().removeVocalBuffer(patternId);
      this.disposeVocalPlayer(patternId);

      // Reset pattern vocalMode to 'synth' in sequencer store
      const sequencerStore = useSequencerStore.getState();
      const tracks = sequencerStore.tracks;
      const newTracks = tracks.map((t) => {
        const hasPattern = t.patterns.some((p) => Number(p.id) === Number(patternId));
        if (hasPattern) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (Number(p.id) === Number(patternId)) {
                return {
                  ...p,
                  vocalMode: 'synth',
                  vocalClip: undefined,
                  vocalNudge: 0,
                  vocalTrimStart: 0,
                  vocalBaseBpm: undefined,
                  vocalBpmSync: undefined
                } as any;
              }
              return p;
            })
          };
        }
        return t;
      });
      sequencerStore.setTracks(newTracks);
    } catch (err) {
      console.error(`Failed to delete vocal recording for pattern ${patternId}:`, err);
    }
  },

  /**
   * Safeguard 2: Reusable Tone.GrainPlayer instance cache.
   * Prevents node recreation and memory churn on high frequency iterations.
   * Indexé par clé composite pour étanchéité Puxador vs Coro.
   * Module Haas (Option B) : élargissement spatial stéréo du Coro avec lecteur unique.
   */
  getOrCreateVocalPlayer(
    vocalKey: string,
    audioBuffer: AudioBuffer,
    outputNode: any,
    isCoroTrack: boolean = false
  ): ActiveVocal {
    let entry = activeVocals.get(vocalKey);

    if (entry) {
      // Re-use existing player and update buffer if modified
      if (entry.currentBuffer !== audioBuffer) {
        entry.mainPlayer.buffer.set(audioBuffer);
        entry.currentBuffer = audioBuffer;
      }
      entry.mainPlayer.loop = false; // 🛡️ SÉCURITÉ ANTI-LOOP IMPÉRATIVE
      (entry.mainPlayer as any).fadeIn = 0;
      entry.mainPlayer.onstop = () => {};
      return entry;
    }

    // Allocate once and persist
    const mainPlayer = new Tone.GrainPlayer(audioBuffer);
    mainPlayer.grainSize = 0.09;
    mainPlayer.overlap = 0.04;
    mainPlayer.volume.value = 0; // Unity gain
    mainPlayer.loop = false; // 🛡️ SÉCURITÉ ANTI-LOOP IMPÉRATIVE
    (mainPlayer as any).fadeIn = 0;
    mainPlayer.onstop = () => {};

    const mainGain = new Tone.Gain(1);
    mainPlayer.connect(mainGain);

    const isEcoMode = useSequencerStore.getState().isEcoMode;
    let haasNodes: ActiveVocal['haasNodes'] = undefined;

    // 🎧 Module Haas Stéréo pour le Coro (Zéro surcoût CPU, 4 nœuds Web Audio natifs légers)
    if (isCoroTrack && !isEcoMode) {
      const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;

      // 1. Forçage mono sur l'entrée Haas pour séparation stéréo parfaite même sur sample stéréo
      const haasInput = rawCtx.createGain();
      haasInput.channelCount = 1;
      haasInput.channelCountMode = 'explicit';

      // 2. Branche retardée (R) : 18 ms (psychoacoustique de Haas)
      const delayNode = rawCtx.createDelay(0.05);
      delayNode.delayTime.value = 0.018;

      // 3. Filtre coupe-bas à 280 Hz pour immunité sommation mono et intégrité des basses
      const filterNode = rawCtx.createBiquadFilter();
      filterNode.type = 'highpass';
      filterNode.frequency.value = 280;

      // 4. Atténuation de compensation de préséance (-1 dB / 0.88)
      const rightGain = rawCtx.createGain();
      rightGain.gain.value = 0.88;

      // 5. Fusion stéréo 2 canaux
      const merger = rawCtx.createChannelMerger(2);

      // Câblage :
      mainGain.connect(haasInput);

      // Branche L directe -> Canal 0
      haasInput.connect(merger, 0, 0);

      // Branche R retardée & filtrée -> Canal 1
      haasInput.connect(delayNode);
      delayNode.connect(filterNode);
      filterNode.connect(rightGain);
      rightGain.connect(merger, 0, 1);

      // Sortie vers le bus de tranche de piste
      const destNode = (outputNode && (outputNode.input || outputNode)) || (masterVolumeNode && (masterVolumeNode.input || masterVolumeNode)) || rawCtx.destination;
      merger.connect(destNode);

      haasNodes = {
        input: haasInput,
        delay: delayNode,
        filter: filterNode,
        rightGain: rightGain,
        merger: merger,
      };
    } else {
      // Puxador (mono centré pan 0) ou Mode Éco (bypass immédiat)
      mainGain.connect(outputNode || masterVolumeNode || Tone.Destination);
    }

    entry = {
      mainPlayer,
      mainGain,
      currentBuffer: audioBuffer,
      haasNodes,
      chorusPlayers: [],
      chorusGains: [],
      panners: []
    };

    activeVocals.set(vocalKey, entry);
    return entry;
  },

  /**
   * Safely stops, disconnects and disposes cached vocal player instances.
   * Gère les clés composites directes (${trackId}_${patternId}) ou par patternId.
   */
  disposeVocalPlayer(trackIdOrKey: string | number, patternId?: number) {
    const keysToDispose = new Set<string>();
    if (patternId !== undefined) {
      keysToDispose.add(`${trackIdOrKey}_${patternId}`);
    } else {
      const keyStr = String(trackIdOrKey);
      keysToDispose.add(keyStr);
      activeVocals.forEach((_, k) => {
        if (k.endsWith(`_${keyStr}`) || k === keyStr) {
          keysToDispose.add(k);
        }
      });
    }

    keysToDispose.forEach((k) => {
      const entry = activeVocals.get(k);
      if (entry) {
        try { entry.mainPlayer.stop(); entry.mainPlayer.disconnect(); entry.mainPlayer.dispose(); } catch (_) {}
        try { entry.mainGain.disconnect(); entry.mainGain.dispose(); } catch (_) {}
        if (entry.haasNodes) {
          try {
            entry.haasNodes.input.disconnect();
            entry.haasNodes.delay.disconnect();
            entry.haasNodes.filter.disconnect();
            entry.haasNodes.rightGain.disconnect();
            entry.haasNodes.merger.disconnect();
          } catch (_) {}
        }
        entry.chorusPlayers.forEach(p => { try { p.stop(); p.disconnect(); p.dispose(); } catch (_) {} });
        entry.chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
        entry.panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
        activeVocals.delete(k);
      }
    });
  },

  /**
   * Libère systématiquement toutes les instances Tone.GrainPlayer de activeVocals
   * lors du rechargement de projet / preset ou du nettoyage mémoire.
   */
  disposeAllVocalPlayers() {
    activeVocals.forEach((entry) => {
      try {
        entry.mainPlayer.onstop = () => {};
        entry.mainPlayer.stop();
        entry.mainPlayer.disconnect();
        entry.mainPlayer.dispose();
      } catch (_) {}
      try { entry.mainGain.disconnect(); entry.mainGain.dispose(); } catch (_) {}
      if (entry.haasNodes) {
        try {
          entry.haasNodes.input.disconnect();
          entry.haasNodes.delay.disconnect();
          entry.haasNodes.filter.disconnect();
          entry.haasNodes.rightGain.disconnect();
          entry.haasNodes.merger.disconnect();
        } catch (_) {}
      }
      entry.chorusPlayers.forEach(p => { try { p.stop(); p.disconnect(); p.dispose(); } catch (_) {} });
      entry.chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
      entry.panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
    });
    activeVocals.clear();
  },

  /**
   * Stops playback of a pattern without disposing the persistent player instance.
   */
  stopVocalPattern(patternId: number | string, trackId?: string | number) {
    if (trackId !== undefined) {
      const k = `${trackId}_${patternId}`;
      const entry = activeVocals.get(k);
      if (entry) {
        try { entry.mainPlayer.stop(); } catch (_) {}
        entry.chorusPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
      }
    } else {
      activeVocals.forEach((entry, k) => {
        if (k.endsWith(`_${patternId}`) || k === String(patternId)) {
          try { entry.mainPlayer.stop(); } catch (_) {}
          entry.chorusPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
        }
      });
    }
  },

  /**
   * Stops all active vocal playback.
   */
  stopAllVocalPlayback() {
    activeVocals.forEach((entry) => {
      try {
        entry.mainPlayer.onstop = () => {};
        entry.mainPlayer.stop();
      } catch (_) {}
      entry.chorusPlayers.forEach(p => {
        try {
          p.onstop = () => {};
          p.stop();
        } catch (_) {}
      });
    });
  },

  /**
   * Saves a validated recording to IndexedDB and registers it in the store.
   */
  async saveValidatedRecording(patternId: number | string, blob: Blob) {
    const numId = Number(patternId);
    const strId = String(patternId);

    await saveVocalRecording(patternId, blob);
    if (strId !== patternId) {
      await saveVocalRecording(strId, blob);
    }
    if (!isNaN(numId) && numId !== patternId) {
      await saveVocalRecording(numId, blob);
    }

    useAudioStore.getState().addVocalBlob(patternId, blob);
    if (strId !== patternId) {
      useAudioStore.getState().addVocalBlob(strId, blob);
    }
    if (!isNaN(numId) && numId !== patternId) {
      useAudioStore.getState().addVocalBlob(numId, blob);
    }
  },

  /**
   * Plays a vocal pattern locally (for preview or solo auditioning).
   */
  async playVocalPattern(patternId: number, time: number, onStop?: () => void, trackId?: string | number) {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = trackId
      ? sequencerStore.tracks.find(t => String(t.id) === String(trackId))
      : sequencerStore.tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));

    const compositeKey = voiceTrack ? `${voiceTrack.id}_${patternId}` : String(patternId);
    let audioBuffer = store.vocalBuffers[compositeKey] || store.vocalBuffers[patternId];
    if (!audioBuffer) {
      const blob = store.vocalBlobs[compositeKey] || store.vocalBlobs[patternId] || await this.loadVocalRecording(patternId);
      if (!blob) return;
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        store.setVocalBuffer(compositeKey, audioBuffer);
        store.setVocalBuffer(patternId, audioBuffer);
      } catch (err) {
        console.error(`Error decoding vocal blob for pattern ${patternId}:`, err);
        return;
      }
    }

    const outputNode = (voiceTrack && channels[voiceTrack.id]) || masterVolumeNode || Tone.Destination;
    const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 100) : 100;
    const isCoro = voiceTrack ? instrumentsConfig[voiceTrack.instrumentIdx]?.id === 'coro' : false;

    // Détermination du BPM d'ancrage effectif de la mesure assignée
    const ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
    const initialMeasureIdx = ptnRef?.measureAssignments?.indexOf(true) !== -1 
      ? (ptnRef?.measureAssignments?.indexOf(true) ?? 0) 
      : 0;
    const anchorBpm = sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;

    const beatDurationSec = 60 / anchorBpm;
    const anacrusisBeats = ptnRef?.vocalClip?.anacrusisBeats ?? 0;
    const anacrusisSec = ptnRef?.vocalClip?.anacrusisSec ?? (anacrusisBeats * beatDurationSec);
    const nudgeMs = ptnRef?.vocalClip?.nudgeMs ?? (ptnRef?.vocalNudge ?? 0);

    // En écoute solo (pré-écoute), décaler le trigger pour que le sample démarre dès l'offset 0 à l'instant 'time'
    const previewTime = time + anacrusisSec - (nudgeMs / 1000);

    this.playSequencerVocal(voiceTrack?.id ?? 0, patternId, previewTime, anchorBpm, outputNode, trackVolPct, isCoro, onStop);
  },

  /**
   * Plays a vocal pattern aligned with the sequencer timeline.
   * Directives de calage strictes (Suppression du conflit de double rognage & étanchéité Puxador vs Coro) :
   * 1. L'offset interne de lecture est strictement 0 par défaut (player.start(triggerTime, 0)).
   * 2. Le calage musical est uniquement géré par triggerTime = measureStartTime - anacrusisSec + (nudgeMs / 1000).
   * 3. Cas limite Mesure 0 absolue (triggerTime < 0) :
   *    internalBufferOffset = (-triggerTime) * playbackRate
   *    player.start(actualTime, internalBufferOffset)
   */
  playSequencerVocal(
    trackId: string | number,
    patternId: number | string,
    measureStartTime: number,
    currentBpm: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean,
    onStop?: () => void,
    isDirectStep0: boolean = false
  ) {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find(t => String(t.id) === String(trackId));
    if (!voiceTrack) return null;

    // Étanchéité & tolérance d'ID (id direct, id numérique, vocalClip.id)
    const ptnRef = voiceTrack.patterns.find(p =>
      p && (
        p.id === patternId ||
        String(p.id) === String(patternId) ||
        (!isNaN(Number(patternId)) && Number(p.id) === Number(patternId)) ||
        (p.vocalClip && (
          p.vocalClip.id === patternId ||
          String(p.vocalClip.id) === String(patternId) ||
          (!isNaN(Number(patternId)) && Number(p.vocalClip.id) === Number(patternId))
        ))
      )
    );
    if (!ptnRef) return null;

    // Autoriser la lecture dès qu'un sample audio est présent ou paramétré
    const isSamplePattern = Boolean(
      ptnRef.vocalMode === 'micro' ||
      ptnRef.vocalMode === 'audio' ||
      ptnRef.vocalMode === 'recorded' ||
      ptnRef.vocalClip ||
      ptnRef.vocalAudioData ||
      ptnRef.vocalAudioUrl
    );
    if (!isSamplePattern) return null;

    const clip = ptnRef.vocalClip;
    const patId = ptnRef.id;
    const clipId = clip?.id;

    // Résolution du buffer avec chaîne de repli complète (trackId_patId, patId, trackId_clipId, clipId, string & number)
    const audioBuffer = (
      store.vocalBuffers[`${trackId}_${patId}`] ||
      store.vocalBuffers[patId] ||
      (clipId ? store.vocalBuffers[`${trackId}_${clipId}`] || store.vocalBuffers[clipId] : undefined) ||
      store.vocalBuffers[`${trackId}_${patternId}`] ||
      store.vocalBuffers[patternId] ||
      (!isNaN(Number(patId)) ? store.vocalBuffers[`${trackId}_${Number(patId)}`] || store.vocalBuffers[Number(patId)] : undefined) ||
      (clipId && !isNaN(Number(clipId)) ? store.vocalBuffers[`${trackId}_${Number(clipId)}`] || store.vocalBuffers[Number(clipId)] : undefined)
    );
    if (!audioBuffer) return null;

    const compositeKey = `${trackId}_${patId}`;

    // Détermination du BPM effectif de la mesure d'ancrage
    let initialMeasureIdx = 0;
    if (Array.isArray(ptnRef.measureAssignments)) {
      const foundIdx = ptnRef.measureAssignments.indexOf(true);
      if (foundIdx !== -1) initialMeasureIdx = foundIdx;
    } else if (ptnRef.measureAssignments && typeof ptnRef.measureAssignments === 'object') {
      const keys = Object.keys(ptnRef.measureAssignments).map(k => parseInt(k, 10)).filter(k => !isNaN(k)).sort((a, b) => a - b);
      if (keys.length > 0) initialMeasureIdx = keys[0];
    }
    const anchorMeasureBpm = sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;
    const effectiveBpm = currentBpm || anchorMeasureBpm;

    // 1. Time-stretching calculation : verrouillé strictement à 1.0 au BPM nominal
    const baseBpm = clip?.baseBpm || ptnRef.vocalBaseBpm || anchorMeasureBpm || effectiveBpm;
    const targetRate = effectiveBpm / (baseBpm || effectiveBpm);
    const playbackRate = (Number.isFinite(targetRate) && targetRate > 0) ? targetRate : 1.0;

    // 2. Mathématique de l'Anacrouse basée sur le BPM effectif de la mesure
    const beatDurationSec = 60 / effectiveBpm;
    const anacrusisBeats = clip?.anacrusisBeats ?? 0;
    const anacrusisSec = clip?.anacrusisSec ?? (anacrusisBeats * beatDurationSec);
    const nudgeMs = clip?.nudgeMs ?? (ptnRef.vocalNudge ?? 0);

    // Calcul de l'instant de déclenchement sur la timeline
    const triggerTime = measureStartTime - anacrusisSec + (nudgeMs / 1000);
    const bufferDuration = audioBuffer.duration;
    const actualStartTime = triggerTime >= 0 ? triggerTime : 0;

    // 3. Cycle de vie propre de oldPlayer :
    // Couper tout ancien lecteur résiduel sur cette piste (trackId) avec micro fondu
    activeVocals.forEach((entry, k) => {
      if (k.startsWith(`${trackId}_`)) {
        try {
          // 🛡️ TONE.JS SAFETY: Toujours une fonction no-op () => {}, JAMAIS null, car Tone.Source appelle this.onstop()
          entry.mainPlayer.onstop = () => {};
          const oldGain = entry.mainGain.gain;
          const now = Tone.now();
          const fadeStart = Math.max(now, actualStartTime);
          oldGain.cancelScheduledValues(fadeStart);
          oldGain.setValueAtTime(oldGain.value, fadeStart);
          oldGain.linearRampToValueAtTime(0.0001, fadeStart + 0.015);
          entry.mainPlayer.stop(fadeStart + 0.02);

          const oldPlayer = entry.mainPlayer;
          const oldGainNode = entry.mainGain;
          const oldHaasNodes = entry.haasNodes;
          const oldChorusPlayers = entry.chorusPlayers;
          const oldChorusGains = entry.chorusGains;
          const oldPanners = entry.panners;

          const delayMs = Math.max(50, (fadeStart + 0.1 - now) * 1000);
          setTimeout(() => {
            try {
              oldPlayer.onstop = () => {};
              oldPlayer.disconnect();
              oldPlayer.dispose();
              oldGainNode.disconnect();
              oldGainNode.dispose();
              if (oldHaasNodes) {
                oldHaasNodes.input.disconnect();
                oldHaasNodes.delay.disconnect();
                oldHaasNodes.filter.disconnect();
                oldHaasNodes.rightGain.disconnect();
                oldHaasNodes.merger.disconnect();
              }
              oldChorusPlayers.forEach(p => { try { p.onstop = () => {}; p.stop(); p.disconnect(); p.dispose(); } catch (_) {} });
              oldChorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
              oldPanners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
            } catch (_) {}
          }, Math.min(delayMs, 5000));
        } catch (_) {}
        activeVocals.delete(k);
      }
    });

    // 4. Instancier et armer immédiatement la nouvelle voix pour triggerTime
    const activeEntry = this.getOrCreateVocalPlayer(compositeKey, audioBuffer, outputNode, isCoroTrack);
    const mainPlayer = activeEntry.mainPlayer;
    const mainGain = activeEntry.mainGain;

    mainPlayer.playbackRate = playbackRate;
    mainPlayer.loop = false; // 🛡️ SÉCURITÉ ANTI-LOOP IMPÉRATIVE : forcé systématiquement avant chaque déclenchement
    (mainPlayer as any).fadeIn = 0; // Pas de fondu d'attaque qui étouffe les consonnes

    // Track volume gain
    const baseGainLinear = Math.pow(trackVolPct / 100, 2);

    // 🛡️ ÉLIMINATION DU DOUBLE DÉCALAGE :
    // Lorsqu'un fichier est importé et validé, le buffer audio stocké est déjà physiquement propre.
    // Aucun internalBufferOffset supplémentaire n'est appliqué à l'intérieur du sample dès lors que triggerTime >= 0.
    // Le calage dans le temps est uniquement régi par l'instant de déclenchement triggerTime.
    if (triggerTime >= 0) {
      mainGain.gain.setValueAtTime(baseGainLinear, triggerTime);
      mainPlayer.start(triggerTime, 0);
    } else {
      // Cas limite Mesure 0 absolue (triggerTime < 0, anacrouse avant T=0)
      const internalBufferOffset = Math.abs(triggerTime) * playbackRate;
      const remainingDuration = Math.max(0, bufferDuration - internalBufferOffset);
      if (remainingDuration <= 0) {
        return null;
      }
      mainGain.gain.setValueAtTime(baseGainLinear, 0);
      mainPlayer.start(0, internalBufferOffset, remainingDuration / playbackRate);
    }

    // 🛡️ TONE.JS SAFETY: Toujours une fonction valide
    mainPlayer.onstop = typeof onStop === 'function' ? () => {
      try {
        onStop();
      } catch (_) {}
    } : () => {};

    return {
      mainPlayer,
      stop: () => {
        try {
          mainPlayer.onstop = () => {};
          mainPlayer.stop();
        } catch (_) {}
      }
    };
  }
};
