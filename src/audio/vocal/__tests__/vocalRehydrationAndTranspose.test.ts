/**
 * vocalRehydrationAndTranspose.test.ts — Validation verrouillée P0.2 (< 138 lignes) :
 * - Mutex singleton `rehydratingPromise` (4 appels concurrents => 1 seul scan IDB + 1 seule écriture atomique).
 * - Cascade stricte `${trackId}_${patternId}` -> `Number(id)` -> `String(id)` -> `vocalClip.id` (bus `isToadaBus` passif).
 * - Persistance intégrale de `vocalTransposeSteps` (`-12..+12`) et normalisation Firestore `measureAssignments`.
 */
import assert from 'node:assert/strict';
import { buildVocalRecordingCandidateKeys, getVocalRecording, saveVocalRecording } from '../../../db';
import { collectEligibleVocalTargets } from '../vocalKeyCascadeResolver';
import { VocalRehydration, setVocalDecodeContextForTests } from '../vocalRehydration';
import { useAudioStore } from '../../../stores/useAudioStore';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { buildCurrentPresetData } from '../../../contexts/audio/audioPresetDataBuilder';
import { migrateAndSanitizePresetTracks } from '../../../contexts/audio/audioPresetTracksMigrator';
import { resolvePresetVocalTransposeSteps, restorePresetAutomationsAndVocal } from '../../../contexts/audio/presetSerializationHelpers';
import { buildAutosavePayload } from '../../../hooks/app-audio/autosavePayloadBuilder';

function installMockOGiradorDB() {
  const vocalMap = new Map<number | string, any>();
  let getAllCount = 0;
  const makeStore = () => ({
    put(val: any) { vocalMap.set(val.patternId, val); },
    delete(k: any) { vocalMap.delete(k); },
    clear() { vocalMap.clear(); },
    get(k: any) {
      const req: any = { result: vocalMap.get(k), onsuccess: null, onerror: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
    getAll() {
      getAllCount++;
      const sorted = Array.from(vocalMap.entries()).sort(([a], [b]) =>
        typeof a === typeof b ? String(a).localeCompare(String(b)) : typeof a === 'number' ? -1 : 1
      ).map(([, v]) => v);
      const req: any = { result: sorted, onsuccess: null, onerror: null };
      setTimeout(() => req.onsuccess?.(), 15);
      return req;
    },
  });
  const mockDb = {
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const store = makeStore();
      const tx: any = { objectStore: () => store, oncomplete: null, onerror: null, onabort: null };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
  };
  (globalThis as any).indexedDB = {
    open: () => {
      const req: any = { result: mockDb, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
  return { vocalMap, getGetAllCount: () => getAllCount };
}

(async () => {
  const idb = installMockOGiradorDB();
  const makeTaggedBlob = (tag: number, corrupt = false) =>
    new Blob([new Uint8Array(corrupt ? [255, 0, 255] : [tag, 1, 2, 3])], { type: 'audio/wav' });

  setVocalDecodeContextForTests({
    sampleRate: 48000,
    decodeAudioData: async (ab: ArrayBuffer) => {
      const bytes = new Uint8Array(ab);
      if (bytes[0] === 255) throw new Error('Corrupted audio payload');
      return { length: bytes[0] * 100, duration: 1, sampleRate: 48000, numberOfChannels: 1 } as unknown as AudioBuffer;
    },
  } as unknown as AudioContext);

  assert.deepEqual(
    buildVocalRecordingCandidateKeys('10_501', { trackId: 10, patternId: '501', vocalClipId: '888' }),
    ['10_501', 501, '501', 888, '888', '10_888']
  );
  await saveVocalRecording(501, makeTaggedBlob(1));
  await saveVocalRecording('10_501', makeTaggedBlob(9));
  idb.vocalMap.set('502', { patternId: '502', audioBlob: makeTaggedBlob(4) });
  idb.vocalMap.set('909', { patternId: '909', audioBlob: makeTaggedBlob(7) });
  await saveVocalRecording('11_599', makeTaggedBlob(0, true));

  const resolvedComposite = await getVocalRecording(501, { trackId: 10, patternId: 501, vocalClipId: 909 });
  assert.equal(new Uint8Array(await resolvedComposite!.arrayBuffer())[0], 9, 'Composite key must win over numeric key');
  const resolvedClipStr = await getVocalRecording('11_503', { trackId: 11, patternId: 503, vocalClipId: 909 });
  assert.equal(new Uint8Array(await resolvedClipStr!.arrayBuffer())[0], 7, 'Must fallback to String(vocalClip.id)');

  const tracks = [{
    id: 'toada', customName: 'Toada', isBusFolder: true, instrumentIdx: 10, patterns: [{ id: 501, vocalMode: 'micro' }],
    subTracks: [
      { id: 10, instrumentIdx: 10, role: 'puxador', patterns: [{ id: 501, vocalMode: 'micro' }, { id: 502, vocalMode: 'recorded' }] },
      { id: 11, instrumentIdx: 11, role: 'coro', patterns: [{ id: 599, vocalMode: 'audio' }, { id: 503, hasVocalAudio: true, vocalClip: { id: 909 } }] },
    ],
  }];
  assert.equal(collectEligibleVocalTargets(tracks).some((t) => t.track.id === 'toada'), false, 'isToadaBus must stay passive');

  useAudioStore.setState({ vocalBuffers: {}, vocalBlobs: {} });
  let storeUpdates = 0;
  const unsub = useAudioStore.subscribe(() => { storeUpdates++; });
  await Promise.all([
    VocalRehydration.rehydrateVocalBuffers(tracks),
    VocalRehydration.rehydrateVocalBuffers(tracks),
    VocalRehydration.rehydrateVocalBuffers(tracks),
    VocalRehydration.rehydrateVocalBuffers(tracks),
  ]);
  unsub();

  assert.equal(idb.getGetAllCount(), 1, '4 concurrent calls must execute strictly 1 IDB scan');
  assert.equal(storeUpdates, 1, 'Decoded vocal buffers must be injected in 1 single atomic batch');
  const bufs = useAudioStore.getState().vocalBuffers;
  assert.equal(bufs['10_501']?.length, 900);
  assert.equal(bufs['10_502']?.length, 400);
  assert.equal(bufs['11_503']?.length, 700);
  assert.equal(bufs['toada_501'], undefined);

  await VocalRehydration.rehydrateVocalBuffers([{ id: 10, instrumentIdx: 10, patterns: [{ id: 501, vocalMode: 'micro' }] }]);
  assert.equal(idb.getGetAllCount(), 1, 'Must short-circuit immediately when RAM buffers are present');

  useSequencerStore.setState({ tracks: [{ id: 10, instrumentIdx: 10, patterns: [] } as any] });
  useSequencerStore.getState().setVocalTransposeSteps(-5);
  const builtPreset = buildCurrentPresetData({ bpm: 92, timeSig: '4/4' }, { low: 0, mid: 0, high: 0 }, { threshold: -6, ratio: 2 }, 0, {});
  const autosaved = buildAutosavePayload({});
  assert.equal(builtPreset.vocalTransposeSteps, -5);
  assert.equal(builtPreset.metadata?.vocalTransposeSteps, -5);
  assert.equal(autosaved?.vocalTransposeSteps, -5);

  useSequencerStore.getState().setVocalTransposeSteps(0);
  restorePresetAutomationsAndVocal({ metadata: { transpositionSemitones: '-7' } });
  assert.equal(useSequencerStore.getState().vocalTransposeSteps, -7);
  assert.equal(resolvePresetVocalTransposeSteps(builtPreset), -5);
  assert.equal(resolvePresetVocalTransposeSteps({ transpositionSemitones: 6 }), 6);

  const sanitizedTracks = migrateAndSanitizePresetTracks({
    version: 3,
    tracks: [{ id: 10, instrumentIdx: 10, patterns: [{ id: 1, steps: 16, vocalTransposeSteps: 4, measureAssignments: { '1': true, '3': true } }] }],
  }, 4);
  assert.deepEqual(sanitizedTracks[0].patterns[0].measureAssignments, [false, true, false, true]);
  assert.equal(sanitizedTracks[0].patterns[0].vocalTransposeSteps, 4);

  setVocalDecodeContextForTests(null);
  console.log('vocalRehydrationAndTranspose.test.ts: ALL ASSERTIONS PASSED');
})();
