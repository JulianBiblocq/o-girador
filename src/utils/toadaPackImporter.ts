/**
 * toadaPackImporter.ts
 * Décodage et injection locale d'un pack Toada (.json / Firestore `/toada_packs`) dans Sequenciador.
 * Téléchargement unique par audioUrl via cache en mémoire (< 135 lignes).
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
  const urlCache = new Map<string, DecodedUrlAudio>(), baseId = Date.now() + 10000;

  const packBpm = Number(pack.project?.bpm || pack.bpm || store.bpm || 88);
  const packIgnoreMelodyPitch = Boolean(pack.ignoreMelodyPitch ?? pack.project?.ignoreMelodyPitch ?? (pack.sequenciadorExportMode === 'rhythm_only'));
  const packTranspositionSt = Number(pack.transpositionSemitones ?? pack.project?.transpositionSemitones ?? 0);
  const sungKey = pack.sungKey || pack.project?.sungKey || pack.toadaMeta?.tonaliteChanteeOrigine;
  const troupeKey = pack.troupeKey || pack.project?.troupeKey || pack.toadaMeta?.tonaliteDefaut;

  for (let i = 0; i < pack.patterns.length; i++) {
    const p = pack.patterns[i], role: 'puxador' | 'coro' = p.role === 'coro' ? 'coro' : 'puxador', numId = baseId + i * 1000;
    patIdMap.set(p.id, numId);
    const variant = p.variants?.[p.activeVariantKey] || p.variants?.['spd100_pit0'] || p.variants?.['spd100_pit+0'] || Object.values(p.variants || {})[0] as any;
    let clipMeta: VocalClipMeta | undefined;
    const effectiveBpm = Number(p.recordedBpm || variant?.recordedBpm || p.baseBpm || p.bpm || packBpm);
    const anacrusisDurationSec = (4 * 60) / effectiveBpm;
    const explicitAnac = p.hasAnacrusis !== undefined ? Boolean(p.hasAnacrusis) : null;
    const hasAnacrusis = explicitAnac !== null
      ? explicitAnac
      : ((p.anacrusisSteps || []).some(isStepActive) || (p.mainSteps && p.mainSteps.length > (p.measuresCount || 1) * 16 && p.mainSteps.slice(0, 16).some(isStepActive)));

    const targetTrack = role === 'coro' ? coroTrack : puxTrack;
    const existingNudge = targetTrack.patterns?.find((ep) => ep.name === p.name || String(ep.id) === p.id)?.vocalClip?.nudgeMs ?? 0;

    let wavBlob: Blob | null = null, audioBuffer: AudioBuffer | null = null;
    const targetUrl = variant?.audioUrl || p.audioUrl || p.speedVariants?.['100'];
    if (variant?.audioBase64) {
      wavBlob = base64ToBlob(variant.audioBase64);
      audioBuffer = await rawCtx.decodeAudioData(await wavBlob.arrayBuffer());
    } else if (targetUrl) {
      try {
        const decoded = await fetchAndDecodeAudioUrl(targetUrl, rawCtx, urlCache);
        if (decoded) { wavBlob = decoded.blob; audioBuffer = decoded.buffer; }
      } catch (err) { console.warn('[toadaPackImporter] Échec fetch audioUrl:', err); }
    }

    const loadedVariantKeys = await importPatternVariants(p.variants, numId, p.id, targetTrack.id, rawCtx, urlCache, p.speedVariants);

    if (wavBlob && audioBuffer) {
      await saveVocalRecording(numId, wavBlob);
      if (String(numId) !== p.id) await saveVocalRecording(p.id, wavBlob);
      const aStore = useAudioStore.getState(), roleTrackId = targetTrack.id;
      [numId, String(numId), p.id, `${roleTrackId}_${numId}`, `${roleTrackId}_${String(numId)}`].forEach((k) => {
        aStore.setVocalBuffer(k, audioBuffer!); aStore.addVocalBlob(k, wavBlob!);
      });
      const trimStartSec = Number(variant?.trimStartSec ?? p.trimStartSec ?? 0);
      const trimEndSec = Number(variant?.trimEndSec ?? p.trimEndSec ?? (variant?.durationSec || audioBuffer.duration));
      const rawStartOffset = variant?.startOffsetSec ?? p.startOffsetSec, rawT1 = variant?.t1OffsetSec ?? p.t1OffsetSec;
      const t1OffsetSec = rawT1 !== undefined ? Number(rawT1) : (rawStartOffset !== undefined ? (trimStartSec - Number(rawStartOffset)) : (hasAnacrusis ? (trimStartSec + anacrusisDurationSec) : trimStartSec));
      const calculatedStartOffset = trimStartSec - t1OffsetSec, anacSec = Math.max(0, -calculatedStartOffset);
      clipMeta = {
        id: numId, patternId: numId, baseBpm: effectiveBpm, sampleBpm: effectiveBpm, recordedBpm: effectiveBpm,
        trimStartSec, trimEndSec, t1OffsetSec, hasTailBeat: Boolean(p.hasTailBeat || p.exitBeat === 1),
        nudgeMs: existingNudge, anacrusisBeats: anacSec > 0 ? (anacSec / (60 / effectiveBpm)) : 0, anacrusisSec: anacSec,
        startOffsetSec: calculatedStartOffset, updatedAt: Date.now(),
        variantKeys: loadedVariantKeys.length > 0 ? loadedVariantKeys : undefined,
        speedVariants: p.speedVariants, packTranspositionSemitones: Number(p.transpositionSemitones ?? packTranspositionSt),
      };
    }

    const patIgnorePitch = p.ignoreMelodyPitch !== undefined ? Boolean(p.ignoreMelodyPitch) : packIgnoreMelodyPitch;
    const newPat = convertToadaPattern(p, role, numId, effectiveBpm, store.totalMeasures, clipMeta, Boolean(wavBlob), hasAnacrusis, patIgnorePitch);
    newPat.sungKey = sungKey; newPat.troupeKey = troupeKey;
    if (loadedVariantKeys.length > 0) newPat.vocalVariantKeys = loadedVariantKeys;
    convertedPats.push({ pat: newPat, role, origId: p.id });
  }

  store.pushUndoState();
  store.setToadaConductorSlots(buildToadaConductorSlots(pack.slots || pack.arrangementSlots, pack.patterns, patIdMap));

  const nextTracks = tracks.map((t) => {
    if (t.id === puxTrack.id || t.id === coroTrack.id) {
      const isPux = t.id === puxTrack.id, newPats = convertedPats.filter((c) => c.role === (isPux ? 'puxador' : 'coro')).map((c) => c.pat);
      const mergedPats = (t.patterns.length === 1 && isBlankPattern(t.patterns[0])) ? newPats : [...t.patterns, ...newPats];
      return { ...t, patterns: mergedPats, selectedPatternId: newPats[0]?.id ?? t.selectedPatternId };
    }
    return t;
  });

  store.setTracks(nextTracks);
  if (packBpm) { store.setGlobalBpm(packBpm); store.setBpm(packBpm); }
  store.setVocalTransposeSteps(packTranspositionSt);
  store.setMetadata({
    ...store.metadata, toada: pack.project?.title || pack.title || store.metadata.toada, toadaPackId: pack.id || pack.project?.id,
    ignoreMelodyPitch: packIgnoreMelodyPitch, sequenciadorExportMode: packIgnoreMelodyPitch ? 'rhythm_only' : 'with_notes',
    sungKey, troupeKey, sungScaleMode: pack.sungScaleMode,
    packTranspositionSemitones: packTranspositionSt, transpositionSemitones: packTranspositionSt,
  });
  useAudioStore.getState().setVocalMode('voice');

  const deployed = options.deployStartMeasureIdx !== null && options.deployStartMeasureIdx !== undefined;
  if (deployed) store.deployToadaCycleAtMeasure(options.deployStartMeasureIdx!);
  const toastMsg = deployed ? `Toada déroulée dès M${options.deployStartMeasureIdx! + 1} (${pack.patterns.length} patterns)` : `Toada importée dans Détail Instrument (${pack.patterns.length} patterns)`;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: toastMsg } }));

  return { success: true, count: pack.patterns.length };
}
