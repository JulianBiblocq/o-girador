/**
 * toadaPackImporter.ts
 * Décodage et injection locale d'un pack Toada (.json) dans Sequenciador.
 * Zéro écriture Firestore (RAM Zustand + IndexedDB vocalRecordings).
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { saveVocalRecording } from '../db';
import { instrumentsConfig } from '../data';
import type { TrackGroup, Pattern, VocalClipMeta } from '../types/store.types';

function base64ToBlob(base64: string): Blob {
  const clean = base64.replace(/^data:audio\/\w+;base64,/, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/wav' });
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

export async function importToadaPackIntoSequencer(file: File): Promise<{ success: boolean; count: number }> {
  const text = await file.text();
  const pack = JSON.parse(text);
  if (!pack?.patterns || !Array.isArray(pack.patterns)) throw new Error('Fichier Toada invalide');

  const store = useSequencerStore.getState();
  let tracks = [...store.tracks];
  const puxTrack = getOrCreateTrack(tracks, 'puxador');
  const coroTrack = getOrCreateTrack(tracks, 'coro');
  if (!tracks.some((t) => t.id === puxTrack.id)) tracks.push(puxTrack);
  if (!tracks.some((t) => t.id === coroTrack.id)) tracks.push(coroTrack);

  const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
  const patIdMap = new Map<string, number>();
  const convertedPats: Array<{ pat: Pattern; role: 'puxador' | 'coro'; origId: string }> = [];

  for (let i = 0; i < pack.patterns.length; i++) {
    const p = pack.patterns[i];
    const role: 'puxador' | 'coro' = p.role === 'coro' ? 'coro' : 'puxador';
    const roleSymbol = role === 'coro' ? 'C' : 'P';
    const numId = Date.now() + Math.floor(Math.random() * 500) + i;
    patIdMap.set(p.id, numId);
    const stepsCount = (p.measuresCount || 1) * 16;
    const activeSteps: any[] = Array(stepsCount).fill(0);
    const notes: string[] = Array(stepsCount).fill('');
    const lyrics: string[] = Array(stepsCount).fill('');

    (p.mainSteps || []).forEach((s: any, idx: number) => {
      if (idx < stepsCount && s.active && s.note !== '───') {
        activeSteps[idx] = roleSymbol; notes[idx] = s.note || ''; lyrics[idx] = s.syllable || '';
      }
    });

    const hasAnacrusis = (p.anacrusisSteps || []).some((s: any) => s.active && s.note !== '───');
    const variant = p.variants?.['spd100_pit0'] || Object.values(p.variants || {})[0] as any;
    let clipMeta: VocalClipMeta | undefined;

    if (variant?.audioBase64) {
      const wavBlob = base64ToBlob(variant.audioBase64);
      const audioBuffer = await rawCtx.decodeAudioData(await wavBlob.arrayBuffer());
      await saveVocalRecording(numId, wavBlob);
      if (String(numId) !== p.id) await saveVocalRecording(p.id, wavBlob);
      const aStore = useAudioStore.getState();
      [numId, p.id].forEach((k) => { aStore.setVocalBuffer(k, audioBuffer); aStore.addVocalBlob(k, wavBlob); });
      const trackId = role === 'coro' ? coroTrack.id : puxTrack.id;
      aStore.setVocalBuffer(`${trackId}_${numId}`, audioBuffer);
      clipMeta = { baseBpm: pack.project?.bpm || store.bpm, sampleBpm: pack.project?.bpm || store.bpm, trimStartSec: 0, trimEndSec: variant.durationSec || audioBuffer.duration, nudgeMs: 0, anacrusisBeats: hasAnacrusis ? 4 : 0, startOffsetSec: 0, updatedAt: Date.now() };
    }

    const newPat: Pattern = {
      id: numId, name: p.name || (role === 'coro' ? 'Coro' : 'Puxador'), steps: stepsCount, activeSteps, notes, lyrics, measureAssignments: [],
      vocalMode: variant?.audioBase64 ? 'micro' : 'synth', vocalClip: clipMeta, vocalBpmSync: true, vocalBaseBpm: pack.project?.bpm || store.bpm,
      preRollActiveSteps: hasAnacrusis ? p.anacrusisSteps.map((s: any) => (s.active && s.note !== '───') ? roleSymbol : 0) : undefined,
      preRollNotes: hasAnacrusis ? p.anacrusisSteps.map((s: any) => s.note || '') : undefined,
      preRollLyrics: hasAnacrusis ? p.anacrusisSteps.map((s: any) => s.syllable || '') : undefined,
    };
    convertedPats.push({ pat: newPat, role, origId: p.id });
  }

  // Application de la Frise Conducteur
  let currentM = 0;
  const slotList: Array<{ pux?: string; coro?: string; span: number; startM: number }> = [];
  for (const s of (pack.arrangementSlots || [])) {
    const pPat = pack.patterns.find((x: any) => x.id === s.puxadorPatternId);
    const cPat = pack.patterns.find((x: any) => x.id === s.coroPatternId);
    const span = Math.max(pPat?.measuresCount || 0, cPat?.measuresCount || 0, 1);
    slotList.push({ pux: s.puxadorPatternId || undefined, coro: s.coroPatternId || undefined, span, startM: currentM });
    currentM += span;
  }

  const totalMeasures = Math.max(currentM, store.totalMeasures);
  if (totalMeasures > store.totalMeasures) store.setTotalMeasures(totalMeasures, true);

  convertedPats.forEach(({ pat }) => { pat.measureAssignments = Array(totalMeasures).fill(false); });
  slotList.forEach(({ pux, coro, span, startM }) => {
    [pux, coro].forEach((id) => {
      if (!id) return;
      const target = convertedPats.find((c) => c.origId === id);
      if (target) for (let m = startM; m < startM + span && m < totalMeasures; m++) target.pat.measureAssignments[m] = true;
    });
  });

  const nextTracks = tracks.map((t) => {
    if (t.id === puxTrack.id) {
      const puxPats = convertedPats.filter((c) => c.role === 'puxador').map((c) => c.pat);
      return { ...t, patterns: [...t.patterns, ...puxPats], selectedPatternId: puxPats[0]?.id ?? t.selectedPatternId };
    }
    if (t.id === coroTrack.id) {
      const coroPats = convertedPats.filter((c) => c.role === 'coro').map((c) => c.pat);
      return { ...t, patterns: [...t.patterns, ...coroPats], selectedPatternId: coroPats[0]?.id ?? t.selectedPatternId };
    }
    return t;
  });

  store.setTracks(nextTracks);
  if (pack.project?.bpm) store.setBpm(pack.project.bpm);
  if (pack.project?.title) store.setMetadata({ ...store.metadata, toada: pack.project.title });
  useAudioStore.getState().setVocalMode('voice');

  const msg = `Toada importée : ${pack.patterns.length} patterns Puxador/Coro calés sur la grille`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  return { success: true, count: pack.patterns.length };
}
