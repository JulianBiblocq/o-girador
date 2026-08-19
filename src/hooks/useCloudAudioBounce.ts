/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as Tone from 'tone';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { telemetryService } from '../services/telemetryService';
import { SavedPattern, TimeSignature, SavedSectionData } from '../types';
import { encoderWav } from '../utils/encodeurWav';
import { CLOUD_PATTERNS_COLLECTION } from '../cloudPatterns';
import { CLOUD_SECTIONS_COLLECTION } from '../cloudSections';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { instrumentsConfig } from '../data';

export function useCloudAudioBounce() {
  const [isBouncingCloud, setIsBouncingCloud] = useState(false);
  const [bounceError, setBounceError] = useState<string | null>(null);

  const genererEtUploaderCloudBounce = async (
    patternId: string,
    patternData: SavedPattern,
    bpm: number,
    timeSig: TimeSignature
  ): Promise<string> => {
    setIsBouncingCloud(true);
    setBounceError(null);

    try {

      
      const beats = parseInt(timeSig.split('/')[0], 10);
      const beatUnit = parseInt(timeSig.split('/')[1], 10);
      const maxTicks = beats * (96 / beatUnit);
      const ticksPerBeat = maxTicks / beats;
      
      const durationSec = (patternData.steps.length / (maxTicks / ticksPerBeat)) * (60 / bpm) + 1.0; // +1s tail
      
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
            
            // @ts-ignore : On force le chargement synchrone via une promesse
            playersToLoad.push(new Promise((resolve, reject) => {
              Tone.Buffer.load(encodedPath).then(buffer => {
                player.buffer = buffer;
                resolve();
              }).catch(reject);
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
            const stepVolMultiplier = baseVol / 100;
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
      

      const storageRef = ref(storage, `bounces/${patternId}.webm`);
      await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
      
      const audioUrl = await getDownloadURL(storageRef);

      

      const documentRef = doc(db, CLOUD_PATTERNS_COLLECTION, patternId);
      await updateDoc(documentRef, { audioUrl });
      
      setIsBouncingCloud(false);
      return audioUrl;
    } catch (err: any) {
      console.error('[Cloud Bounce] Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Pattern');
      setBounceError(err.message || 'Erreur lors de la génération audio cloud');
      setIsBouncingCloud(false);
      throw err;
    }
  }

  const genererEtUploaderSectionCloudBounce = async (
    sectionId: string,
    sectionData: SavedSectionData,
    baseBpm: number
  ): Promise<string> => {
    setIsBouncingCloud(true);
    setBounceError(null);

    try {

      
      let dureeTotaleSec = 0;
      const measureStartTimes: number[] = [];
      const measureTicks: number[] = [];
      const measureBeats: number[] = [];

      for (let i = 0; i < sectionData.numMeasures; i++) {
        measureStartTimes.push(dureeTotaleSec);
        const timeSig = sectionData.timeSigs[i] || '4/4';
        const beats = parseInt(timeSig.split('/')[0], 10);
        const beatUnit = parseInt(timeSig.split('/')[1], 10);
        dureeTotaleSec += (60 / baseBpm) * beats;
        measureBeats.push(beats);
        measureTicks.push(beats * (96 / beatUnit));
      }
      const durationSec = dureeTotaleSec + 3.0; // tail for reverb


      
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
          const channel = new Tone.Channel({
            volume: 40 * Math.log10(Math.max(0.0001, track.volumeVal / 100)),
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
          for (let m = 0; m < sectionData.numMeasures; m++) {
            for (const pattern of track.patterns) {
              if (pattern.measureAssignments?.[m]) {
                const activeStps = pattern.activeSteps || [];
                activeStps.forEach(s => {
                  if (s !== 0 && s !== '0' && s !== '') usedStrokes.add(String(s).trim());
                });
              }
            }
          }
          
          for (const rawStroke of usedStrokes) {
            let normStroke = rawStroke;
            if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instrumentConf.id)) {
              if (normStroke === 't' || normStroke === 'T') normStroke = 'B';
              else if (normStroke === 'C') normStroke = 'c';
            } else if (instrumentConf.id === 'agbe' || instrumentConf.id === 'gongue') {
              if (normStroke === 't') normStroke = 'B';
            }
            
            const strokeDef = audioConfig.strokes.find(s => 
              s.caseSensitive === false 
                ? s.symbol.toUpperCase() === normStroke.toUpperCase()
                : s.symbol === normStroke
            );
            
            if (strokeDef && strokeDef.files.length > 0) {
              const file = strokeDef.files[0];
              const baseUrl = (import.meta as any).env.BASE_URL || '/';
              const cleanPath = file.startsWith('/') ? file : '/' + file;
              const fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
              const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
              
              const player = new Tone.Player(encodedPath).connect(channel);
              strokePlayers.set(rawStroke, player);
              
              playersToLoad.push(new Promise((resolve, reject) => {
                Tone.Buffer.load(encodedPath).then(buffer => {
                  player.buffer = buffer;
                  resolve();
                }).catch(reject);
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
          
          for (let m = 0; m < sectionData.numMeasures; m++) {
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
                    const timeSec = measureStartTime + (tickIdx / maxTicks) * beats * (60 / baseBpm);
                    
                    let baseVol = pattern.volumes?.[step] ?? 80;
                    const stepVolMultiplier = baseVol / 100;
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
      

      const storageRef = ref(storage, `bounces/sections/${sectionId}.webm`);
      await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
      
      const audioUrl = await getDownloadURL(storageRef);

      

      const documentRef = doc(db, CLOUD_SECTIONS_COLLECTION, sectionId);
      await updateDoc(documentRef, { audioUrl });
      
      setIsBouncingCloud(false);
      return audioUrl;
    } catch (err: any) {
      console.error('[Cloud Bounce] Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Section');
      setBounceError(err.message || 'Erreur lors de la génération audio cloud (Section)');
      setIsBouncingCloud(false);
      throw err;
    }
  };

  return {
    genererEtUploaderCloudBounce,
    genererEtUploaderSectionCloudBounce,
    isBouncingCloud,
    bounceError
  };
}
