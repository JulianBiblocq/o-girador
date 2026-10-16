/**
 * toadaPackImporter.ts
 * Décodage et injection locale d'un pack Toada (.json) dans Sequenciador.
 * Zéro écriture Firestore (RAM Zustand + IndexedDB vocalRecordings).
 * Strictement < 125 lignes.
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { saveVocalRecording } from '../db';
import { instrumentsConfig } from '../data';
import { buildToadaConductorSlots } from './toadaArrangement';
import { convertToadaPattern, isStepActive } from './toadaPatternConverter';
import type { TrackGroup, Pattern, VocalClipMeta } from '../types/store.types';

export interface ToadaImportOptions {
  deployStartMeasureIdx?: number | null;
  pack?: any;
}

function base64ToBlob(b64: string): Blob {
  const bin = atob(b64.replace(/^data:audio\/\w+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/wav' });
}

function isBlankPattern(p?: Pattern): boolean {
  if (!p) return true;
  const hasNotes = p.notes?.some((n) => n && n !== '' && n !== '───');
  const hasActive = p.activeSteps?.some((s) => s && s !== 0 && s !== '───');
  return !hasNotes && !hasActive && !p.vocalClip && p.vocalMode !== 'micro';
}

function getOrCreateTrack(tracks: TrackGroup[], role: 'puxador' | 'coro'): TrackGroup {
  const found = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === role);
  if (found) return found;
  const idx = instrumentsConfig.findIndex((i) => i.id === role);
  const maxId = Math.max(100, ...tracks.map((t) => Number(t.id) || 0));
  return {
    id: maxId + (role === 'puxador' ? 1 : 2), instrumentIdx: idx !== -1 ? idx : (role === 'puxador' ? 10 : 11),
    patterns: [], isMute: false, isSolo: false, isHidden: false, volumeVal: 80, selectedPatternId: 0,
    reverbVal: 0, panVal: 0, pan: 0, tuning: 0, fxSends: { reverb: 0, distortion: 0 }
  };
}

export async function importToadaPackIntoSequencer(
  file: File | null,
  options: ToadaImportOptions = {}
): Promise<{ success: boolean; count: number }> {
  const pack = options.pack || (file ? JSON.parse(await file.text()) : null);
  if (!pack?.patterns || !Array.isArray(pack.patterns)) throw new Error('Fichier Toada invalide');

  const store = useSequencerStore.getState();
  let tracks = [...store.tracks];
  const puxTrack = getOrCreateTrack(tracks, 'puxador'), coroTrack = getOrCreateTrack(tracks, 'coro');
  if (!tracks.some((t) => t.id === puxTrack.id)) tracks.push(puxTrack);
  if (!tracks.some((t) => t.id === coroTrack.id)) tracks.push(coroTrack);
  const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
  const patIdMap = new Map<string, number>(), convertedPats: Array<{ pat: Pattern; role: 'puxador' | 'coro'; origId: string }> = [];

  for (let i = 0; i < pack.patterns.length; i++) {
    const p = pack.patterns[i];
    const role: 'puxador' | 'coro' = p.role === 'coro' ? 'coro' : 'puxador';
    const numId = Date.now() + Math.floor(Math.random() * 500) + i;
    patIdMap.set(p.id, numId);

    const variant = p.variants?.[p.activeVariantKey] || p.variants?.['spd100_pit0'] || Object.values(p.variants || {})[0] as any;
    let clipMeta: VocalClipMeta | undefined;
    const effectiveBpm = p.baseBpm || pack.project?.bpm || store.bpm;
    const anacrusisDurationSec = (4 * 60) / effectiveBpm;
    const explicitAnac = p.hasAnacrusis !== undefined ? Boolean(p.hasAnacrusis) : null;
    const hasAnacrusis = explicitAnac !== null
      ? explicitAnac
      : ((p.anacrusisSteps || []).some(isStepActive) || (p.mainSteps && p.mainSteps.length > (p.measuresCount || 1) * 16 && p.mainSteps.slice(0, 16).some(isStepActive)));

    const targetTrack = role === 'coro' ? coroTrack : puxTrack;
    const existingPat = targetTrack.patterns?.find((ep) => ep.name === p.name || String(ep.id) === p.id);
    const existingNudge = existingPat?.vocalClip?.nudgeMs ?? 0;

    let wavBlob: Blob | null = null;
    if (variant?.audioBase64) {
      wavBlob = base64ToBlob(variant.audioBase64);
    } else if (variant?.audioUrl || p.audioUrl) {
      try {
        const resp = await fetch(variant?.audioUrl || p.audioUrl);
        if (resp.ok) wavBlob = await resp.blob();
      } catch (err) {
        console.warn('[toadaPackImporter] Échec fetch audioUrl:', err);
      }
    }

    if (wavBlob) {
      const audioBuffer = await rawCtx.decodeAudioData(await wavBlob.arrayBuffer());
      await saveVocalRecording(numId, wavBlob);
      if (String(numId) !== p.id) await saveVocalRecording(p.id, wavBlob);
      const aStore = useAudioStore.getState();
      const roleTrackId = role === 'coro' ? coroTrack.id : puxTrack.id;
      [numId, String(numId), p.id, `${roleTrackId}_${numId}`, `${roleTrackId}_${String(numId)}`].forEach((k) => {
        aStore.setVocalBuffer(k, audioBuffer); aStore.addVocalBlob(k, wavBlob!);
      });
      clipMeta = {
        id: numId, patternId: numId, baseBpm: effectiveBpm, sampleBpm: effectiveBpm,
        trimStartSec: variant?.trimStartSec ?? 0,
        trimEndSec: variant?.trimEndSec ?? (variant?.durationSec || audioBuffer.duration),
        nudgeMs: existingNudge, anacrusisBeats: hasAnacrusis ? 4 : 0, anacrusisSec: hasAnacrusis ? anacrusisDurationSec : 0,
        startOffsetSec: hasAnacrusis ? -anacrusisDurationSec : 0, updatedAt: Date.now(),
      };
    }

    const newPat = convertToadaPattern(p, role, numId, effectiveBpm, store.totalMeasures, clipMeta, Boolean(wavBlob));
    convertedPats.push({ pat: newPat, role, origId: p.id });
  }

  // Sauvegarde de l'état avant import pour permettre le retour en arrière (Ctrl+Z)
  store.pushUndoState();

  // Mémorisation de la frise conducteur
  const conductorSlots = buildToadaConductorSlots(pack.arrangementSlots, pack.patterns, patIdMap);
  store.setToadaConductorSlots(conductorSlots);

  // Remplacement si pattern vierge par défaut, sinon injection ordonnée
  const nextTracks = tracks.map((t) => {
    if (t.id === puxTrack.id || t.id === coroTrack.id) {
      const isPux = t.id === puxTrack.id;
      const newPats = convertedPats.filter((c) => c.role === (isPux ? 'puxador' : 'coro')).map((c) => c.pat);
      const isSingleBlank = t.patterns.length === 1 && isBlankPattern(t.patterns[0]);
      const mergedPats = isSingleBlank ? newPats : [...t.patterns, ...newPats];
      return { ...t, patterns: mergedPats, selectedPatternId: newPats[0]?.id ?? t.selectedPatternId };
    }
    return t;
  });

  store.setTracks(nextTracks);
  if (pack.project?.bpm) store.setBpm(pack.project.bpm);
  if (pack.project?.title) store.setMetadata({ ...store.metadata, toada: pack.project.title });
  useAudioStore.getState().setVocalMode('voice');

  const deployed = options.deployStartMeasureIdx !== null && options.deployStartMeasureIdx !== undefined;
  if (deployed) store.deployToadaCycleAtMeasure(options.deployStartMeasureIdx!);
  const toastMsg = deployed
    ? `Toada déroulée dès M${options.deployStartMeasureIdx! + 1} (${pack.patterns.length} patterns)`
    : `Toada importée dans Détail Instrument (${pack.patterns.length} patterns)`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: toastMsg } }));

  return { success: true, count: pack.patterns.length };
}
