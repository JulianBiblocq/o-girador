/**
 * toadaPackImporter.ts
 * Décodage et injection locale d'un pack Toada (.json / Firestore) dans Sequenciador.
 * Téléchargement unique par audioUrl via cache en mémoire.
 * Strictement < 130 lignes.
 */
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { saveVocalRecording } from '../db';
import { buildToadaConductorSlots, deployToadaCycle } from './toadaArrangement';
import { convertToadaPattern, isStepActive } from './toadaPatternConverter';
import { isBlankPattern, getOrCreateTrack } from './vocal/toadaImportHelpers';
import { importPatternVariants, base64ToBlob, fetchAndDecodeAudioUrl, type DecodedUrlAudio } from './vocal/toadaVariantImporter';
import type { Pattern, VocalClipMeta } from '../types/store.types';

export { buildToadaConductorSlots, deployToadaCycle };

export interface ToadaImportOptions {
  deployStartMeasureIdx?: number | null;
  pack?: any;
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
  const urlCache = new Map<string, DecodedUrlAudio>();
  const baseId = Date.now() + 10000;

  for (let i = 0; i < pack.patterns.length; i++) {
    const p = pack.patterns[i];
    const role: 'puxador' | 'coro' = p.role === 'coro' ? 'coro' : 'puxador';
    const numId = baseId + i * 1000;
    patIdMap.set(p.id, numId);

    const variant = p.variants?.[p.activeVariantKey] || p.variants?.['spd100_pit0'] || Object.values(p.variants || {})[0] as any;
    let clipMeta: VocalClipMeta | undefined;
    const effectiveBpm = Number(p.baseBpm || p.bpm || pack.project?.bpm || pack.bpm || store.bpm || 88);
    const anacrusisDurationSec = (4 * 60) / effectiveBpm;
    const explicitAnac = p.hasAnacrusis !== undefined ? Boolean(p.hasAnacrusis) : null;
    const hasAnacrusis = explicitAnac !== null
      ? explicitAnac
      : ((p.anacrusisSteps || []).some(isStepActive) || (p.mainSteps && p.mainSteps.length > (p.measuresCount || 1) * 16 && p.mainSteps.slice(0, 16).some(isStepActive)));

    const targetTrack = role === 'coro' ? coroTrack : puxTrack;
    const existingPat = targetTrack.patterns?.find((ep) => ep.name === p.name || String(ep.id) === p.id);
    const existingNudge = existingPat?.vocalClip?.nudgeMs ?? 0;

    let wavBlob: Blob | null = null;
    let audioBuffer: AudioBuffer | null = null;
    const targetUrl = variant?.audioUrl || p.audioUrl;

    if (variant?.audioBase64) {
      wavBlob = base64ToBlob(variant.audioBase64);
      audioBuffer = await rawCtx.decodeAudioData(await wavBlob.arrayBuffer());
    } else if (targetUrl) {
      try {
        const decoded = await fetchAndDecodeAudioUrl(targetUrl, rawCtx, urlCache);
        if (decoded) {
          wavBlob = decoded.blob;
          audioBuffer = decoded.buffer;
        }
      } catch (err) {
        console.warn('[toadaPackImporter] Échec fetch audioUrl:', err);
      }
    }

    const loadedVariantKeys = await importPatternVariants(p.variants, numId, p.id, targetTrack.id, rawCtx, urlCache);

    if (wavBlob && audioBuffer) {
      await saveVocalRecording(numId, wavBlob);
      if (String(numId) !== p.id) await saveVocalRecording(p.id, wavBlob);
      const aStore = useAudioStore.getState();
      const roleTrackId = targetTrack.id;
      [numId, String(numId), p.id, `${roleTrackId}_${numId}`, `${roleTrackId}_${String(numId)}`].forEach((k) => {
        aStore.setVocalBuffer(k, audioBuffer!); aStore.addVocalBlob(k, wavBlob!);
      });
      const rawStartOffset = variant?.startOffsetSec ?? p.startOffsetSec;
      const rawT1 = variant?.t1OffsetSec ?? p.t1OffsetSec;
      const calculatedStartOffset = rawStartOffset !== undefined
        ? rawStartOffset
        : (rawT1 !== undefined ? -rawT1 : (hasAnacrusis ? -anacrusisDurationSec : 0));
      const anacSec = Math.max(0, -calculatedStartOffset);
      const anacBeats = anacSec > 0 ? (anacSec / (60 / effectiveBpm)) : 0;

      clipMeta = {
        id: numId, patternId: numId, baseBpm: effectiveBpm, sampleBpm: effectiveBpm,
        trimStartSec: variant?.trimStartSec ?? 0,
        trimEndSec: variant?.trimEndSec ?? (variant?.durationSec || audioBuffer.duration),
        nudgeMs: existingNudge, anacrusisBeats: anacBeats, anacrusisSec: anacSec,
        startOffsetSec: calculatedStartOffset, updatedAt: Date.now(),
        variantKeys: loadedVariantKeys.length > 0 ? loadedVariantKeys : undefined,
      };
    }

    const newPat = convertToadaPattern(p, role, numId, effectiveBpm, store.totalMeasures, clipMeta, Boolean(wavBlob), hasAnacrusis);
    if (loadedVariantKeys.length > 0) newPat.vocalVariantKeys = loadedVariantKeys;
    convertedPats.push({ pat: newPat, role, origId: p.id });
  }

  store.pushUndoState();
  const conductorSlots = buildToadaConductorSlots(pack.arrangementSlots || pack.slots, pack.patterns, patIdMap);
  store.setToadaConductorSlots(conductorSlots);

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
  const packBpm = pack.project?.bpm || pack.bpm;
  if (packBpm) store.setBpm(Number(packBpm));
  const packTitle = pack.project?.title || pack.title;
  if (packTitle) store.setMetadata({ ...store.metadata, toada: packTitle });
  useAudioStore.getState().setVocalMode('voice');

  const deployed = options.deployStartMeasureIdx !== null && options.deployStartMeasureIdx !== undefined;
  if (deployed) store.deployToadaCycleAtMeasure(options.deployStartMeasureIdx!);
  const toastMsg = deployed
    ? `Toada déroulée dès M${options.deployStartMeasureIdx! + 1} (${pack.patterns.length} patterns)`
    : `Toada importée dans Détail Instrument (${pack.patterns.length} patterns)`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: toastMsg } }));

  return { success: true, count: pack.patterns.length };
}
