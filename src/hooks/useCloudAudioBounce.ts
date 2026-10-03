/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as Tone from 'tone';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../firebase/config';
import { telemetryService } from '../services/telemetryService';
import { SavedPattern, TimeSignature, SavedSectionData, Preset } from '../types';
import { useSequencerStore, getEffectiveVolume } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useAudio } from '../contexts/AudioContext';
import { getExpandedMeasures, getBeatsPerMeasure } from '../utils/measureHelpers';
import { encoderWav } from '../utils/encodeurWav';
const CLOUD_PATTERNS_COLLECTION = 'patterns';
import { CLOUD_SECTIONS_COLLECTION } from '../cloudSections';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { instrumentsConfig } from '../data';
import { audioEngine } from './useAudioSync';

/**
 * Chargeur d'échantillon robuste et non bloquant.
 * Réutilise en priorité les ToneAudioBuffer déjà en cache dans AudioEngine.bufferPool.
 */
async function loadSampleBuffer(file: string): Promise<Tone.ToneAudioBuffer | null> {
  if (audioEngine?.bufferPool?.has(file)) {
    const pooled = audioEngine.bufferPool.get(file);
    if (pooled && pooled.loaded) {
      return pooled;
    }
  }

  try {
    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    let fetchPath = file;
    if (file.includes('Mixdown/') || file.includes('mixdown/')) {
      const filename = file.substring(file.lastIndexOf('/') + 1);
      fetchPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}Mixdown/${filename}`;
    } else {
      const cleanPath = file.startsWith('/') ? file : '/' + file;
      fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
    }
    const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(encodedPath, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();

    const liveContext = Tone.getContext().rawContext as AudioContext;
    if (liveContext && typeof liveContext.decodeAudioData === 'function') {
      const decoded = await liveContext.decodeAudioData(arrayBuffer);
      return new Tone.ToneAudioBuffer(decoded);
    } else {
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await tempCtx.decodeAudioData(arrayBuffer);
      tempCtx.close().catch(() => {});
      return new Tone.ToneAudioBuffer(decoded);
    }
  } catch (err) {
    console.warn(`[Cloud Bounce] Échec chargement sample ${file}:`, err);
    return null;
  }
}

export function useCloudAudioBounce() {
  const [isBouncingCloud, setIsBouncingCloud] = useState(false);
  const [bounceError, setBounceError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('');
  const audio = useAudio();

  const genererEtUploaderCloudBounce = async (
    patternId: string,
    patternData: SavedPattern,
    bpm: number,
    timeSig: TimeSignature
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);

    try {

      
      const beats = parseInt(timeSig.split('/')[0], 10);
      const beatUnit = parseInt(timeSig.split('/')[1], 10);
      const maxTicks = beats * (96 / beatUnit);
      const ticksPerBeat = maxTicks / beats;
      
      const rawDurationSec = (patternData.steps.length / (maxTicks / ticksPerBeat)) * (60 / bpm) + 1.0; // +1s tail
      let durationSec = (Number.isFinite(rawDurationSec) && rawDurationSec > 0) ? rawDurationSec : 4;
      durationSec = Math.max(durationSec || 0, 4);
      
      // Trouver la configuration audio
      const audioConfig = instrumentAudioConfigs.find(c => c.id === patternData.instrumentId);
      if (!audioConfig) {
        throw new Error(`Configuration audio introuvable pour l'instrument: ${patternData.instrumentId}`);
      }

      const audioBuffer = await Tone.Offline(async (ctx) => {
        // Chargement des players
        const strokePlayers = new Map<string, Tone.Player>();
        const playersToLoad: Promise<void>[] = [];
        
        // On prépare les sons pour les strokes utilisés dans le pattern
        const usedStrokes = new Set(patternData.steps.filter(s => s !== 0 && s !== '0' && s !== ''));
        
        for (const stroke of usedStrokes) {
          const rawStroke = String(stroke).trim();
          let normStroke = rawStroke;
          // Normalisation basique
          if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(patternData.instrumentId)) {
            if (normStroke === 't' || normStroke === 'T') normStroke = 'B';
            else if (normStroke === 'C') normStroke = 'c';
          } else if (patternData.instrumentId === 'agbe' || patternData.instrumentId === 'gongue') {
            if (normStroke === 't') normStroke = 'B';
          }
          
          const strokeDef = audioConfig.strokes.find(s => 
            s.caseSensitive === false 
              ? s.symbol.toUpperCase() === normStroke.toUpperCase()
              : s.symbol === normStroke
          );
          
          if (strokeDef && strokeDef.files.length > 0) {
            // Prend le premier fichier (round robin ignoré pour ce rendu statique rapide)
            const file = strokeDef.files[0];
            const baseUrl = (import.meta as any).env.BASE_URL || '/';
            const cleanPath = file.startsWith('/') ? file : '/' + file;
            const fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
            const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            
            const player = new Tone.Player(encodedPath).toDestination();
            strokePlayers.set(rawStroke, player);
            
            playersToLoad.push(new Promise<void>((resolve) => {
              const timeoutId = setTimeout(() => {
                console.warn(`[Cloud Bounce] Timeout chargement sample: ${encodedPath}`);
                resolve();
              }, 8000);
              Tone.Buffer.load(encodedPath).then(buffer => {
                clearTimeout(timeoutId);
                player.buffer = new Tone.ToneAudioBuffer(buffer);
                resolve();
              }).catch(err => {
                clearTimeout(timeoutId);
                console.warn(`[Cloud Bounce] Échec chargement sample ${encodedPath}, ignoré:`, err);
                resolve();
              });
            }));
          }
        }
        
        await Promise.all(playersToLoad);

        // Planification
        const stepCount = patternData.steps.length;
        const resArray = Array(beats).fill(stepCount / beats);
        
        let stepTickAccum = 0;
        const stepTickMap: number[] = [];
        for (let b = 0; b < beats; b++) {
          const res = resArray[b] || (stepCount / beats);
          const ticksPerStep = ticksPerBeat / res;
          for (let r = 0; r < res; r++) {
            stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
          }
          stepTickAccum += ticksPerBeat;
        }

        for (let step = 0; step < stepCount; step++) {
          const state = patternData.steps[step];
          if (!state || state === 0 || state === '0') continue;
          
          const targetKey = String(state).trim();
          const player = strokePlayers.get(targetKey);
          if (player) {
            const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
            const timeSec = (tickIdx / maxTicks) * beats * (60 / bpm);
            
            // Gestion du volume (simplifié pour l'export, on ignore variations/microtimings)
            let baseVol = patternData.volumes?.[step] ?? 80;
            const baseVolNum = Array.isArray(baseVol) ? (baseVol[0] ?? 80) : (typeof baseVol === 'number' ? baseVol : 80);
            const stepVolMultiplier = baseVolNum / 100;
            const db = 40 * Math.log10(Math.max(0.0001, stepVolMultiplier));
            
            player.volume.setValueAtTime(db, timeSec);
            player.start(timeSec);
          }
        }
      }, durationSec);

      // L'encodage MediaRecorder va jouer le buffer en temps réel (silencieusement)
      const nativeBuffer = audioBuffer.get();
      if (!nativeBuffer) throw new Error("Le rendu Tone.Offline n'a généré aucun buffer valide.");
      const webmBlob = await encoderWav(nativeBuffer);

      let audioUrl: string | null = null;
      try {
        const storageRef = ref(storage, `bounces/${patternId}.webm`);
        await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
        audioUrl = await getDownloadURL(storageRef);
      } catch (uploadErr: any) {
        console.warn("[Cloud Bounce] Échec upload Storage, repli sur audioUrl: null :", uploadErr?.message || uploadErr);
        telemetryService.logError(uploadErr, 'useCloudAudioBounce_Pattern_StorageUpload');
        audioUrl = null;
      }

      try {
        const documentRef = doc(db, CLOUD_PATTERNS_COLLECTION, patternId);
        await updateDoc(documentRef, { audioUrl });
      } catch (docErr) {
        console.warn("[Cloud Bounce] Échec mise à jour document Firestore :", docErr);
      }
      
      return audioUrl;
    } catch (err: any) {
      console.error('[Cloud Bounce] Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Pattern');
      const errorMsg = 'Échec de la génération audio';
      setBounceError(errorMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errorMsg } }));
      }
      return null;
    } finally {
      setIsBouncingCloud(false);
    }
  };

  const genererEtUploaderSectionCloudBounce = async (
    sectionId: string,
    sectionData: SavedSectionData,
    baseBpm: number
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);

    try {
      let dureeTotaleSec = 0;
      const measureStartTimes: number[] = [];
      const measureTicks: number[] = [];
      const measureBeats: number[] = [];

      const effectiveBpm = (Number.isFinite(baseBpm) && baseBpm > 20) ? baseBpm : 120;
      const numMeasures = Math.max(1, sectionData.numMeasures || 1);

      for (let i = 0; i < numMeasures; i++) {
        measureStartTimes.push(dureeTotaleSec);
        const timeSig = sectionData.timeSigs?.[i] || '4/4';
        const beats = Math.max(1, parseInt(timeSig.split('/')[0], 10) || 4);
        const beatUnit = Math.max(1, parseInt(timeSig.split('/')[1], 10) || 4);
        dureeTotaleSec += (60 / effectiveBpm) * beats;
        measureBeats.push(beats);
        measureTicks.push(beats * (96 / beatUnit));
      }
      let durationSec = (Number.isFinite(dureeTotaleSec) && dureeTotaleSec > 0) ? dureeTotaleSec + 3.0 : 4; // tail for reverb
      durationSec = Math.max(durationSec || 0, 4);

      const audioBuffer = await Tone.Offline(async (ctx) => {
        const playersToLoad: Promise<void>[] = [];
        
        // 1. Create Master FX
        const masterEQ = new Tone.EQ3(0, 0, 0).toDestination();
        const masterReverb = new Tone.Reverb(2).connect(masterEQ);
        const masterDistortion = new Tone.Distortion(0.8).connect(masterEQ);
        await masterReverb.generate();
        
        // 2. Process each track
        const trackPlayers = new Map<number, Map<string, Tone.Player>>();
        
        for (let t = 0; t < sectionData.tracks.length; t++) {
          const track = sectionData.tracks[t];
          if (track.isMute) continue;
          
          const instrumentConf = instrumentsConfig[track.instrumentIdx];
          if (!instrumentConf) continue;
          const audioConfig = instrumentAudioConfigs.find(c => c.id === instrumentConf.id);
          if (!audioConfig) continue;

          // Channel setup
          const effectiveVol = track.id !== undefined ? getEffectiveVolume(sectionData.tracks, track.id) : (track.volumeVal ?? 100);
          const channel = new Tone.Channel({
            volume: 40 * Math.log10(Math.max(0.0001, effectiveVol / 100)),
            pan: track.panVal !== undefined ? track.panVal / 100 : (track.pan !== undefined ? track.pan / 100 : 0)
          }).connect(masterEQ);
          
          if (track.fxSends?.reverb) {
            const revSend = new Tone.Gain(track.fxSends.reverb / 100).connect(masterReverb);
            channel.connect(revSend);
          }
          if (track.fxSends?.distortion) {
            const distSend = new Tone.Gain(track.fxSends.distortion / 100).connect(masterDistortion);
            channel.connect(distSend);
          }
          if (track.reverbVal) {
             const revSend = new Tone.Gain(track.reverbVal / 100).connect(masterReverb);
             channel.connect(revSend);
          }

          const strokePlayers = new Map<string, Tone.Player>();
          trackPlayers.set(t, strokePlayers);
          
          // Load strokes used in this track's active patterns
          const usedStrokes = new Set<string>();
          for (let m = 0; m < numMeasures; m++) {
            for (const pattern of track.patterns) {
              if (pattern.measureAssignments?.[m]) {
                const activeStps = pattern.activeSteps || [];
                activeStps.forEach(s => {
                  if (s && s !== 0 && s !== '0') {
                    usedStrokes.add(String(s).trim());
                  }
                });
              }
            }
          }
          
          for (const rawStroke of usedStrokes) {
            const file = audioConfig.strokes[rawStroke];
            if (file) {
              const baseUrl = (import.meta as any).env.BASE_URL || '/';
              const cleanPath = file.startsWith('/') ? file : '/' + file;
              const fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
              const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
              
              const player = new Tone.Player(encodedPath).connect(channel);
              strokePlayers.set(rawStroke, player);
              
              playersToLoad.push(new Promise<void>((resolve) => {
                const timeoutId = setTimeout(() => {
                  console.warn(`[Cloud Bounce] Timeout chargement sample: ${encodedPath}`);
                  resolve();
                }, 8000);
                Tone.Buffer.load(encodedPath).then(buffer => {
                  clearTimeout(timeoutId);
                  player.buffer = new Tone.ToneAudioBuffer(buffer);
                  resolve();
                }).catch(err => {
                  clearTimeout(timeoutId);
                  console.warn(`[Cloud Bounce] Échec chargement sample ${encodedPath}, ignoré:`, err);
                  resolve();
                });
              }));
            }
          }
        }
        
        await Promise.all(playersToLoad);
        
        // 3. Scheduling
        for (let t = 0; t < sectionData.tracks.length; t++) {
          const track = sectionData.tracks[t];
          if (track.isMute) continue;
          
          const strokePlayers = trackPlayers.get(t);
          if (!strokePlayers) continue;
          
          for (let m = 0; m < numMeasures; m++) {
            const measureStartTime = measureStartTimes[m];
            const beats = measureBeats[m];
            const maxTicks = measureTicks[m];
            const ticksPerBeat = maxTicks / beats;
            
            for (const pattern of track.patterns) {
              if (pattern.measureAssignments?.[m]) {
                const activeStps = pattern.activeSteps || [];
                const stepCount = activeStps.length;
                if (stepCount === 0) break;

                const resArray = Array(beats).fill(stepCount / beats);
                
                let stepTickAccum = 0;
                const stepTickMap: number[] = [];
                for (let b = 0; b < beats; b++) {
                  const res = resArray[b] || (stepCount / beats);
                  const tps = ticksPerBeat / res;
                  for (let r = 0; r < res; r++) {
                    stepTickMap.push(Math.round(stepTickAccum + r * tps));
                  }
                  stepTickAccum += ticksPerBeat;
                }
                
                for (let step = 0; step < stepCount; step++) {
                  const state = activeStps[step];
                  if (!state || state === 0 || state === '0') continue;
                  
                  const targetKey = String(state).trim();
                  const player = strokePlayers.get(targetKey);
                  if (player) {
                    const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
                    const timeSec = measureStartTime + (tickIdx / maxTicks) * beats * (60 / effectiveBpm);
                    
                    let baseVol = pattern.volumes?.[step] ?? 80;
                    const baseVolNum = Array.isArray(baseVol) ? (baseVol[0] ?? 80) : (typeof baseVol === 'number' ? baseVol : 80);
                    const stepVolMultiplier = baseVolNum / 100;
                    const db = 40 * Math.log10(Math.max(0.0001, stepVolMultiplier));
                    
                    player.volume.setValueAtTime(db, timeSec);
                    player.start(timeSec);
                  }
                }
                // Only first active pattern per measure is played (like in normal sequencer)
                break;
              }
            }
          }
        }
      }, durationSec);

      const nativeBuffer = audioBuffer.get();
      if (!nativeBuffer) throw new Error("Le rendu Tone.Offline n'a généré aucun buffer valide.");
      const webmBlob = await encoderWav(nativeBuffer);

      let audioUrl: string | null = null;
      try {
        const storageRef = ref(storage, `bounces/sections/${sectionId}.webm`);
        await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
        audioUrl = await getDownloadURL(storageRef);
      } catch (uploadErr: any) {
        console.warn("[Cloud Bounce] Échec upload Storage, repli sur audioUrl: null :", uploadErr?.message || uploadErr);
        telemetryService.logError(uploadErr, 'useCloudAudioBounce_Section_StorageUpload');
        audioUrl = null;
      }

      try {
        const documentRef = doc(db, CLOUD_SECTIONS_COLLECTION, sectionId);
        await updateDoc(documentRef, { audioUrl });
      } catch (docErr) {
        console.warn("[Cloud Bounce] Échec mise à jour document Firestore :", docErr);
      }
      
      return audioUrl;
    } catch (err: any) {
      console.error('[Cloud Bounce] Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Section');
      const errorMsg = 'Échec de la génération audio';
      setBounceError(errorMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errorMsg } }));
      }
      return null;
    } finally {
      setIsBouncingCloud(false);
    }
  };

  const genererEtUploaderPresetCloudBounce = async (
    presetId: string,
    presetData: Preset,
    baseBpm: number,
    options?: {
      tenantId?: string;
      isLoopRegionActive?: boolean;
      loopStartMeasure?: number | null;
      loopEndMeasure?: number | null;
      loopMode?: 'infinite' | number;
      lang?: 'fr' | 'pt';
    }
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);
    setProgress(0);
    const lang = options?.lang || 'fr';
    const setStage = (pct: number, fr: string, pt: string) => {
      setProgress(pct);
      setStepLabel(lang === 'pt' ? pt : fr);
    };

    let recorder: Tone.Recorder | null = null;
    let progressInterval: any = null;
    let sequenceEndListener: ((e: any) => void) | null = null;
    let safetyTimer: any = null;
    let decayTimer: any = null;

    // Sauvegarde des paramètres utilisateurs à restaurer fidèlement
    const transportState = useTransportStore.getState();
    const prevMetro = transportState.isMetroOn;
    const prevPreRoll = transportState.preRollSettings;
    const storeState = useSequencerStore.getState();
    const prevIsLooping = storeState.isLooping;
    const prevIsLoopRegionActive = storeState.isLoopRegionActive;
    const prevLoopStart = storeState.loopStartMeasure;
    const prevLoopEnd = storeState.loopEndMeasure;
    const prevLoopMode = storeState.loopMode;
    const prevLoopIteration = storeState.currentLoopIteration;
    const prevIsLoopBypassed = storeState.isLoopBypassed;
    const prevIsLoopExitRequested = storeState.isLoopExitRequested;

    try {
      setStage(5, "Initialisation de l'enregistrement...", "Inicializando gravação...");

      // 🛡️ Garde-fou safeTenantId : normalisation et repli robuste (ne contient jamais "undefined")
      const userGroupId = (auth.currentUser as any)?.groupId;
      const rawTenantId = options?.tenantId || (presetData.metadata as any)?.tenantId || userGroupId || 'global';
      let safeTenantId = (rawTenantId || 'global').trim().toLowerCase();
      if (!safeTenantId || safeTenantId === 'undefined' || safeTenantId === 'null') {
        safeTenantId = 'global';
      }

      // 1. Dépliage de la structure temporelle (Intro, Boucle N fois, Outro)
      const rawLoopMode = options?.loopMode ?? storeState.loopMode ?? presetData.loopMode;
      let numLoops = 1;
      if (typeof rawLoopMode === 'number' && rawLoopMode > 0) {
        numLoops = rawLoopMode;
      } else if (typeof rawLoopMode === 'string' && !isNaN(parseInt(rawLoopMode, 10)) && parseInt(rawLoopMode, 10) > 0) {
        numLoops = parseInt(rawLoopMode, 10);
      } else if (rawLoopMode === 'infinite') {
        numLoops = 2; // Repli par défaut à 2 tours pour les exports de boucle infinie
      }

      const loopStart = options?.loopStartMeasure ?? storeState.loopStartMeasure ?? presetData.loopStartMeasure ?? null;
      const loopEnd = options?.loopEndMeasure ?? storeState.loopEndMeasure ?? presetData.loopEndMeasure ?? null;
      const isLoopRegionActive = Boolean(
        (options?.isLoopRegionActive ?? storeState.isLoopRegionActive ?? presetData.isLoopRegionActive) &&
        loopStart !== null && loopEnd !== null && loopStart <= loopEnd
      );

      const loopOptions = {
        isLoopRegionActive,
        loopStartMeasure: loopStart,
        loopEndMeasure: loopEnd,
        loopMode: numLoops,
      };

      const totalMeasures = Math.max(1, presetData.totalMeasures || storeState.totalMeasures || 16);
      let expandedMeasures = getExpandedMeasures(
        totalMeasures,
        presetData.songSections || [],
        loopOptions
      );

      if (!expandedMeasures || !Array.isArray(expandedMeasures) || expandedMeasures.length === 0) {
        expandedMeasures = Array.from({ length: totalMeasures }, (_, i) => ({ baseMeasure: i, iteration: 1 }));
      } else {
        expandedMeasures = expandedMeasures.map((info, idx) => ({
          baseMeasure: (typeof info.baseMeasure === 'number' && Number.isFinite(info.baseMeasure) && info.baseMeasure >= 0 && info.baseMeasure < totalMeasures)
            ? info.baseMeasure
            : (idx % totalMeasures),
          iteration: (typeof info.iteration === 'number' && Number.isFinite(info.iteration) && info.iteration > 0)
            ? info.iteration
            : 1
        }));
      }

      // 2. Calcul précis des durées, transitions de tempo, ticks et signatures
      let dureeTotaleSec = 0;
      const measureStartTimes: number[] = [];
      const measureBpmsAbsolus: number[] = [];
      const measureBpmTransitionsAbsolus: string[] = [];
      const measureTimeSigsAbsolus: string[] = [];

      for (let i = 0; i < expandedMeasures.length; i++) {
        measureStartTimes.push(dureeTotaleSec);
        const m = expandedMeasures[i].baseMeasure;
        const rawCurrentBpm = (presetData.measureBpms && typeof presetData.measureBpms[m] === 'number')
          ? presetData.measureBpms[m]
          : (presetData.bpm || baseBpm || 120);
        const currentMeasureBpm = (Number.isFinite(rawCurrentBpm) && rawCurrentBpm > 20) ? rawCurrentBpm : 120;
        measureBpmsAbsolus.push(currentMeasureBpm);

        const nextM = (i + 1 < expandedMeasures.length) ? expandedMeasures[i + 1].baseMeasure : m;
        const rawNextBpm = (presetData.measureBpms && typeof presetData.measureBpms[nextM] === 'number')
          ? presetData.measureBpms[nextM]
          : currentMeasureBpm;
        const nextMeasureBpm = (Number.isFinite(rawNextBpm) && rawNextBpm > 20) ? rawNextBpm : currentMeasureBpm;

        const transition = (presetData.measureBpmTransitions && presetData.measureBpmTransitions[m]) || 'immediate';
        measureBpmTransitionsAbsolus.push(transition);

        const timeSigStr = (presetData.measureTimeSigs && presetData.measureTimeSigs[m]) || presetData.timeSig || '4/4';
        measureTimeSigsAbsolus.push(timeSigStr);

        const beats = getBeatsPerMeasure(timeSigStr);

        if (transition === 'immediate' || currentMeasureBpm === nextMeasureBpm) {
          dureeTotaleSec += (60 / currentMeasureBpm) * beats;
        } else {
          dureeTotaleSec += (120 * beats) / (currentMeasureBpm + nextMeasureBpm);
        }
      }

      if (isNaN(dureeTotaleSec) || !isFinite(dureeTotaleSec) || dureeTotaleSec <= 0) {
        throw new Error(`Durée du preset invalide (${dureeTotaleSec}s)`);
      }

      // Queue de relâchement de 2.0 secondes pour laisser s'éteindre réverbes et résonances
      const decayTailSec = 2.0;
      const totalDurationSec = dureeTotaleSec + decayTailSec;

      // 3. Métadonnées chorégraphiques pour Dançad'Or
      const mestreSignals = storeState.mestreSignals || [];
      const measureSignals = presetData.measureSignals || storeState.measureSignals || {};

      const sinaisDoMestreAbsolus: any[] = [];
      expandedMeasures.forEach((measureInfo, absoluteIndex) => {
        const signalId = (measureSignals as any)?.[measureInfo.baseMeasure];
        if (signalId) {
          const mestreSignal = mestreSignals.find((s: any) => s.id === signalId);
          if (mestreSignal) {
            sinaisDoMestreAbsolus.push({
              mesure: absoluteIndex,
              type: mestreSignal.name || 'Geste',
              description: mestreSignal.name || '',
              signalId: mestreSignal.id,
              imageUrl: mestreSignal.imageUrl || null
            });
          }
        }
      });

      const expandedMeasuresData = expandedMeasures.map((info, idx) => ({
        index: idx,
        baseMeasure: info.baseMeasure,
        iteration: info.iteration,
        bpm: measureBpmsAbsolus[idx],
        timeSig: measureTimeSigsAbsolus[idx],
        bpmTransition: measureBpmTransitionsAbsolus[idx]
      }));

      // 4. Préparation Audio : arrêt préalable, réveil du contexte et préchargement
      if (audio.isPlaying) {
        audio.handleStop();
        await new Promise(r => setTimeout(r, 100));
      } else {
        audio.handleStop();
      }

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      if (rawCtx && rawCtx.state !== 'running') {
        try { await rawCtx.resume(); } catch (_) {}
      }
      if (Tone.context && Tone.context.state !== 'running') {
        try { await Tone.context.resume(); } catch (_) {}
      }
      if (Tone.start) {
        try { await Tone.start(); } catch (_) {}
      }
      if (audioEngine && audioEngine.bufferPool.size === 0) {
        try { await audioEngine.loadAllSamples(); } catch (_) {}
      }
      if (Tone.loaded) {
        try { await Tone.loaded(); } catch (_) {}
      }

      // Configuration d'enregistrement : désactiver formellement métronome & précompte pour mix propre
      transportState.setIsMetroOn(false);
      transportState.setPreRollSettings({ ...prevPreRoll, enabled: false });

      // Configuration nominale de la boucle pour le bounce
      if (isLoopRegionActive && loopStart !== null && loopEnd !== null) {
        useSequencerStore.setState({
          isLooping: true,
          isLoopRegionActive: true,
          loopStartMeasure: loopStart,
          loopEndMeasure: loopEnd,
          loopMode: numLoops,
          currentLoopIteration: 1,
          isLoopBypassed: false,
          isLoopExitRequested: false,
        });
      } else {
        useSequencerStore.setState({
          isLooping: false,
          isLoopRegionActive: false,
          loopStartMeasure: null,
          loopEndMeasure: null,
          loopMode: numLoops,
          currentLoopIteration: 1,
          isLoopBypassed: false,
          isLoopExitRequested: false,
        });
      }

      // Calage absolu à la mesure 0
      try {
        Tone.Transport.position = 0;
        Tone.Transport.seconds = 0;
      } catch (_) {}
      storeState.setCurrentMeasure(0);
      if (audioEngine) {
        audioEngine.currentMeasure = 0;
        audioEngine.currentStep = 0;
        audioEngine.schedulingMeasure = 0;
        audioEngine.schedulingStep = 0;
      }

      // 5. Instanciation Tone.Recorder connecté directement sur Tone.getDestination()
      recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorder.start();

      // Démarrage de la lecture live (sans précompte et calé à la mesure 0)
      await audio.handleTogglePlay({ skipPreRoll: true, targetMeasure: 0 });

      // 6. Synchronisation de fin de séquence ('o-girador-sequence-end')
      // + Ticker de progression en direct (10 Hz / 100ms) sans render thrashing
      const startTime = Date.now();

      progressInterval = setInterval(() => {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const ratio = Math.min(1, elapsedSec / totalDurationSec);
        const currentPct = Math.min(85, Math.max(5, Math.round(ratio * 85)));
        setProgress(currentPct);

        let curMeasure = 0;
        for (let m = measureStartTimes.length - 1; m >= 0; m--) {
          if (elapsedSec >= measureStartTimes[m]) {
            curMeasure = m;
            break;
          }
        }

        if (elapsedSec >= dureeTotaleSec) {
          setStepLabel(
            lang === 'pt'
              ? `Finalizando ressonância... (${currentPct}%)`
              : `Fin de résonance du mix... (${currentPct}%)`
          );
        } else {
          setStepLabel(
            lang === 'pt'
              ? `Gravando mix ao vivo... Compasso ${curMeasure + 1}/${expandedMeasures.length} (${currentPct}%)`
              : `Enregistrement du mix en direct... Mesure ${curMeasure + 1}/${expandedMeasures.length} (${currentPct}%)`
          );
        }
      }, 100);

      // Attente réactive de la fin réelle de la séquence
      let sequenceEndPromiseResolve: (() => void) | null = null;
      const sequenceEndPromise = new Promise<void>((resolve) => {
        sequenceEndPromiseResolve = resolve;
      });

      sequenceEndListener = () => {
        if (decayTimer) return; // Ne pas réagir deux fois
        decayTimer = setTimeout(() => {
          sequenceEndPromiseResolve?.();
        }, decayTailSec * 1000);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('o-girador-sequence-end', sequenceEndListener, { once: true });
      }

      // Garde-fou de sécurité : timeout après (totalDurationSec + 3)s si l'événement n'a pas été reçu
      safetyTimer = setTimeout(() => {
        console.warn("[Cloud Bounce] Timeout de sécurité atteint avant l'événement o-girador-sequence-end");
        sequenceEndPromiseResolve?.();
      }, (totalDurationSec + 3) * 1000);

      await sequenceEndPromise;

      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      if (decayTimer) {
        decayTimer = null;
      }
      if (sequenceEndListener && typeof window !== 'undefined') {
        window.removeEventListener('o-girador-sequence-end', sequenceEndListener);
        sequenceEndListener = null;
      }
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // 7. Arrêt strict de l'enregistrement et récupération du Blob (Éradication absolue du rebond de mesure 0)
      // 1. Déconnexion immédiate du recorder
      // 2. Arrêt du recorder et extraction du blob audio
      // 3. Arrêt des moteurs audio
      setStage(87, "Finalisation de l'audio...", "Finalizando o áudio...");
      try {
        Tone.getDestination().disconnect(recorder);
      } catch (_) {}
      const audioBlob = await recorder.stop();
      try {
        recorder.dispose();
        recorder = null;
      } catch (_) {}
      audioEngine?.stop();
      audio.handleStop();

      // Restauration immédiate des paramètres de lecture
      useTransportStore.getState().setIsMetroOn(prevMetro);
      useTransportStore.getState().setPreRollSettings(prevPreRoll);
      useSequencerStore.setState({
        isLooping: prevIsLooping,
        isLoopRegionActive: prevIsLoopRegionActive,
        loopStartMeasure: prevLoopStart,
        loopEndMeasure: prevLoopEnd,
        loopMode: prevLoopMode,
        currentLoopIteration: prevLoopIteration,
        isLoopBypassed: prevIsLoopBypassed,
        isLoopExitRequested: prevIsLoopExitRequested,
      });

      // 8. Téléversement Firebase Storage
      setStage(88, "Téléversement vers le Cloud...", "Enviando para a nuvem...");
      let audioUrl: string | null = null;
      try {
        const storageRef = ref(storage, `bounces/presets/${presetId}.webm`);
        const blobType = audioBlob.type || 'audio/webm;codecs=opus';
        const uploadTask = uploadBytesResumable(storageRef, audioBlob, { contentType: blobType });

        uploadTask.on('state_changed', (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const uploadPct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 8);
            setProgress(Math.min(96, 88 + uploadPct));
          }
        });

        await uploadTask;
        audioUrl = await getDownloadURL(storageRef);
      } catch (uploadErr: any) {
        console.warn("[Cloud Bounce] Échec upload Storage, repli sur audioUrl: null :", uploadErr?.message || uploadErr);
        telemetryService.logError(uploadErr, 'useCloudAudioBounce_Preset_StorageUpload');
        audioUrl = null;
      }

      // 9. Double écriture Firestore résiliente
      setStage(98, "Finalisation Firestore...", "Finalizando Firestore...");

      // A. Collection presets
      try {
        const documentRef = doc(db, 'presets', presetId);
        await setDoc(documentRef, { audioUrl, updatedAt: serverTimestamp() }, { merge: true });
      } catch (docErr) {
        console.warn("[Cloud Bounce] Échec mise à jour document Firestore presets :", docErr);
      }

      // B. Collection audio_masters (Dançad'Or)
      const cleanPresetId = (presetId || '').trim();
      if (audioUrl && cleanPresetId && cleanPresetId !== 'undefined') {
        try {
          const documentId = `${safeTenantId}_${cleanPresetId}`;
          const audioMasterRef = doc(db, 'audio_masters', documentId);

          const titre = presetData.metadata?.toada || (presetData as any).name || 'Morceau sans titre';
          const bpmPrincipal = measureBpmsAbsolus.length > 0 ? measureBpmsAbsolus[0] : (presetData.bpm || baseBpm || 120);

          const payloadDanse: any = {
            id: presetId,
            tenantId: safeTenantId,
            nom: titre,
            titre: titre,
            audioUrl: audioUrl,
            bpm: bpmPrincipal,
            totalMesures: expandedMeasures.length,
            sinaisDoMestre: sinaisDoMestreAbsolus,
            expandedMeasures: expandedMeasuresData,
            measureBpms: measureBpmsAbsolus,
            measureBpmTransitions: measureBpmTransitionsAbsolus,
            measureTimeSigs: measureTimeSigsAbsolus,
            toada: presetData.metadata?.toada || null,
            nacao: presetData.metadata?.nacao || null,
            compositor: presetData.metadata?.compositor || null,
            ritmo: presetData.metadata?.ritmo || null,
            videoUrl: (presetData.metadata as any)?.youtubeUrl || (presetData.metadata as any)?.link || null,
            timeSig: presetData.timeSig || '4/4',
            mestreId: (presetData.metadata as any)?.mestreId || null,
            updatedAt: serverTimestamp()
          };

          const cleanPayload = Object.fromEntries(
            Object.entries(payloadDanse).filter(([_, v]) => v !== undefined)
          );

          await setDoc(audioMasterRef, cleanPayload, { merge: true });
        } catch (dancaErr) {
          console.warn("[Cloud Bounce] Échec mise à jour audio_masters (non bloquant) :", dancaErr);
        }
      }

      setStage(100, "Terminé !", "Concluído!");
      return audioUrl;
    } catch (err: any) {
      console.error('[Cloud Bounce] Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Preset');
      const errorMsg = 'Échec de la génération audio';
      setBounceError(errorMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'error', message: errorMsg }
        }));
      }
      return null;
    } finally {
      if (sequenceEndListener && typeof window !== 'undefined') {
        window.removeEventListener('o-girador-sequence-end', sequenceEndListener);
        sequenceEndListener = null;
      }
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      if (decayTimer) {
        clearTimeout(decayTimer);
        decayTimer = null;
      }
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (recorder) {
        try {
          Tone.getDestination().disconnect(recorder);
          recorder.dispose();
          recorder = null;
        } catch (_) {}
      }
      // Sécurité : restaurer impérativement l'état initial complet
      useTransportStore.getState().setIsMetroOn(prevMetro);
      useTransportStore.getState().setPreRollSettings(prevPreRoll);
      useSequencerStore.setState({
        isLooping: prevIsLooping,
        isLoopRegionActive: prevIsLoopRegionActive,
        loopStartMeasure: prevLoopStart,
        loopEndMeasure: prevLoopEnd,
        loopMode: prevLoopMode,
        currentLoopIteration: prevLoopIteration,
        isLoopBypassed: prevIsLoopBypassed,
        isLoopExitRequested: prevIsLoopExitRequested,
      });
      setIsBouncingCloud(false);
    }
  };

  return {
    genererEtUploaderCloudBounce,
    genererEtUploaderSectionCloudBounce,
    genererEtUploaderPresetCloudBounce,
    isBouncingCloud,
    bounceError,
    progress,
    stepLabel
  };
}
