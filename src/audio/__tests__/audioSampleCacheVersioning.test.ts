/**
 * audioSampleCacheVersioning.test.ts — Validation du cache PCM IndexedDB versionné & signé (P0.1) (< 140 lignes).
 */
import assert from 'node:assert/strict';
import {
  clearAudioSampleCache, clearSampleRevisionOverrides, computeExpectedSampleHash, getCachedPcmSample, getCachedSampleBuffer,
  getSampleCacheKey, getSampleRevisionTag, resetAudioSampleCacheSingletonForTests, SAMPLE_CACHE_VERSION, saveCachedPcmSample,
  setSampleRevisionOverride,
} from '../audioSampleCache';

function createMockAudioContext(sampleRate = 48000): AudioContext {
  return {
    sampleRate,
    createBuffer: (channels: number, length: number, sr: number) => {
      const chData = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        sampleRate: sr, length, duration: length / sr, numberOfChannels: channels,
        getChannelData: (c: number) => chData[c],
        copyToChannel: (src: Float32Array, c: number) => chData[c].set(src),
      } as unknown as AudioBuffer;
    },
  } as unknown as AudioContext;
}

function installMockBrowserCaches() {
  const idbRows = new Map<string, any>();
  const ls = new Map<string, string>();
  const deletedSwCaches: string[] = [];

  const mockStore = {
    put(val: any) { idbRows.set(val.id, val); },
    delete(k: string) { idbRows.delete(String(k)); },
    clear() { idbRows.clear(); },
    get(k: string) {
      const req: any = { result: idbRows.get(String(k)), onsuccess: null, onerror: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
    openKeyCursor() {
      const keys = Array.from(idbRows.keys());
      let idx = 0;
      const req: any = { result: null, onsuccess: null };
      const step = () => {
        if (idx >= keys.length) { req.result = null; req.onsuccess?.(); return; }
        const k = keys[idx++];
        req.result = { key: k, primaryKey: k, continue: () => queueMicrotask(step) };
        req.onsuccess?.();
      };
      queueMicrotask(step);
      return req;
    },
  };

  const mockDb = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => mockStore,
    transaction: () => {
      const tx: any = { objectStore: () => mockStore, oncomplete: null, onerror: null };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
  };

  let idbOpenCalls = 0;
  (globalThis as any).localStorage = {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => { ls.set(k, v); },
    removeItem: (k: string) => { ls.delete(k); },
  };
  (globalThis as any).caches = {
    delete: async (name: string) => { deletedSwCaches.push(name); return true; },
  };
  (globalThis as any).indexedDB = {
    open: () => {
      idbOpenCalls++;
      const req: any = { result: mockDb, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
  return { idbRows, ls, deletedSwCaches, getIdbOpenCalls: () => idbOpenCalls };
}

(async () => {
  resetAudioSampleCacheSingletonForTests();
  clearSampleRevisionOverrides();
  const env = installMockBrowserCaches();
  env.ls.set('ogirador_audio_sample_cache_v', '10');
  env.idbRows.set('v10_Mixdown/Alfaia meiao B.ogg_48000', { id: 'v10_Mixdown/Alfaia meiao B.ogg_48000', version: 10 });
  env.idbRows.set('v9_Mixdown/Caixa B.ogg_44100', { id: 'v9_Mixdown/Caixa B.ogg_44100', version: 9 });

  const ctx = createMockAudioContext(48000);
  const sampleBufV1 = ctx.createBuffer(1, 320, 48000);
  sampleBufV1.getChannelData(0).fill(0.42);

  // 1. Ouverture singleton concurrente + purge SW unique + suppression des clés IDB != v14_
  await Promise.all([
    saveCachedPcmSample('Mixdown/Alfaia meiao B.m4a', sampleBufV1),
    getCachedPcmSample('Mixdown/Alfaia meiao B.ogg', 48000),
  ]);
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(SAMPLE_CACHE_VERSION, 14);
  assert.ok(Boolean(getSampleRevisionTag('Mixdown/Alfaia meiao B.ogg')), 'Generated manifest revision tag must be hydrated');
  assert.equal(env.getIdbOpenCalls(), 1, 'Singleton promise must open IndexedDB only once');
  assert.deepEqual(env.deletedSwCaches, ['audio-samples-cache'], 'Must purge Workbox audio-samples-cache once on version bump');
  assert.equal(env.idbRows.has('v10_Mixdown/Alfaia meiao B.ogg_48000'), false, 'Stale v10 key must be purged');
  assert.equal(env.idbRows.has('v9_Mixdown/Caixa B.ogg_44100'), false, 'Stale v9 key must be purged');

  // 2. Hit valide (.ogg / .m4a unifiés)
  const hit = await getCachedPcmSample('Mixdown/Alfaia meiao B.m4a', 48000);
  assert.ok(hit !== null, 'Valid entry saved via .m4a path must hit under canonical .ogg key');
  assert.equal(hit!.sampleHash, computeExpectedSampleHash('Mixdown/Alfaia meiao B.ogg', SAMPLE_CACHE_VERSION));
  assert.ok(Math.abs(hit!.channels[0][0] - 0.42) < 1e-6);

  // 3. Rejet sur sampleRate divergent (44100 vs 48000)
  assert.equal(await getCachedPcmSample('Mixdown/Alfaia meiao B.ogg', 44100), null);

  // 4. Rejet + re-fetch automatique sur divergence d'empreinte (échantillon remasterisé à nom constant)
  setSampleRevisionOverride('Mixdown/Alfaia meiao B.ogg', 'remaster-2026-11');
  assert.equal(await getCachedPcmSample('Mixdown/Alfaia meiao B.ogg', 48000), null, 'Divergent sampleHash must be rejected');
  let fetchCalls = 0;
  const remasteredBuf = ctx.createBuffer(1, 640, 48000);
  remasteredBuf.getChannelData(0).fill(-0.75);
  const reloaded = await getCachedSampleBuffer(ctx, 'Mixdown/Alfaia meiao B.ogg', async () => { fetchCalls++; return remasteredBuf; });
  assert.equal(fetchCalls, 1, 'Stale hash must trigger fresh fetchAndDecode');
  assert.equal(reloaded?.length, 640);
  await new Promise((r) => setTimeout(r, 20));
  const hitAfterOverwrite = await getCachedPcmSample('Mixdown/Alfaia meiao B.ogg', 48000);
  assert.ok(hitAfterOverwrite !== null && hitAfterOverwrite.length === 640, 'Background save must overwrite stale entry');

  // 5. Rejet sur corruption PCM + purge complète clearAudioSampleCache
  const rawStored = env.idbRows.get(getSampleCacheKey('Mixdown/Alfaia meiao B.ogg', 48000));
  rawStored.channels[0][0] = 0.99;
  assert.equal(await getCachedPcmSample('Mixdown/Alfaia meiao B.ogg', 48000), null, 'Corrupted PCM payload must be rejected');
  await clearAudioSampleCache();
  assert.equal(env.idbRows.size, 0, 'clearAudioSampleCache must empty IDB store');

  clearSampleRevisionOverrides();
  resetAudioSampleCacheSingletonForTests();
  console.log('audioSampleCacheVersioning.test.ts: ALL ASSERTIONS PASSED');
})();
