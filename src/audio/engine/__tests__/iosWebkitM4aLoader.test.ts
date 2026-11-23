/**
 * iosWebkitM4aLoader.test.ts — Verrouillage du chargeur iOS/WebKit (.m4a direct sans requête .ogg inutile)
 * et de l'indexation sous clé canonique `.ogg` (bufferPool, AudioWorklet SampleBridge & cache PCM v7) (< 125 lignes).
 */
import assert from 'node:assert/strict';
import { getSampleCacheKey, SAMPLE_CACHE_VERSION } from '../../audioSampleCache';
import { PercussionWorkletSampleBridge } from '../../worklet/percussionWorkletSampleBridge';
import { EngineSampleLoader } from '../engineSampleLoader';
import {
  fetchAndDecodeAudioSample,
  normalizeCanonicalSampleKey,
  setPreferM4aFallbackForTests,
  shouldPreferM4aFallback,
} from '../sampleFetchUtils';

const originalFetch = globalThis.fetch;
const originalDocument = (globalThis as any).document;

function makeMockAudioBuffer(sampleRate = 48000, length = 480): AudioBuffer {
  const ch0 = new Float32Array(length).fill(0.25);
  return {
    sampleRate,
    length,
    duration: length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => ch0,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

// 1. Clé canonique `.ogg` & version de cache PCM incrémentée (v12)
{
  assert.equal(SAMPLE_CACHE_VERSION, 12);
  assert.equal(normalizeCanonicalSampleKey('Mixdown/Timbal studio T D 1.m4a'), 'Mixdown/Timbal studio T D 1.ogg');
  assert.equal(normalizeCanonicalSampleKey('Mixdown/Timbal studio T D 1.ogg'), 'Mixdown/Timbal studio T D 1.ogg');
  assert.equal(
    getSampleCacheKey('Mixdown/Timbal studio T D 1.m4a', 48000),
    'v12_Mixdown/Timbal studio T D 1.ogg_48000'
  );
}

// 2. Détection native WebKit (canPlayType Vorbis === '' && AAC !== '') => 0 téléchargement .ogg sur iPhone/iPad
{
  setPreferM4aFallbackForTests(null);
  (globalThis as any).document = {
    createElement: (tag: string) => ({
      canPlayType: (mime: string) => {
        if (tag !== 'audio') return '';
        if (mime.includes('ogg')) return '';
        if (mime.includes('mp4')) return 'probably';
        return '';
      },
    }),
  };
  assert.equal(shouldPreferM4aFallback(), true, 'iOS WebKit audio probe must immediately prefer .m4a');

  const requestedUrls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = String(url);
    const cleanU = u.split('?')[0];
    requestedUrls.push(u);
    return {
      ok: cleanU.endsWith('.m4a'),
      status: cleanU.endsWith('.m4a') ? 200 : 404,
      arrayBuffer: async () => new ArrayBuffer(64),
    } as Response;
  }) as typeof fetch;

  const mockCtx = {
    sampleRate: 48000,
    decodeAudioData: async () => makeMockAudioBuffer(48000, 640),
  } as unknown as AudioContext;

  const loader = new EngineSampleLoader();
  const bridge = new PercussionWorkletSampleBridge();
  const workletPosted: any[] = [];
  bridge.attachPort({ postMessage: (msg) => workletPosted.push(msg) });
  loader.onSampleDecoded = (canonicalPath, buf) => bridge.registerSampleBuffer(canonicalPath, buf);

  await loader.loadPath(mockCtx, 'Mixdown/Timbal studio T D 1.ogg');

  assert.equal(requestedUrls.length, 1, 'Must perform a single direct .m4a HTTP request (zero wasted .ogg fetch)');
  assert.ok(requestedUrls[0].split('?')[0].endsWith('Timbal%20studio%20T%20D%201.m4a'), `Expected .m4a URL, got ${requestedUrls[0]}`);
  assert.ok(requestedUrls[0].includes('.m4a?v='), `Expected revision query after .m4a extension, got ${requestedUrls[0]}`);
  assert.equal(loader.bufferPool.has('Mixdown/Timbal studio T D 1.ogg'), true, 'bufferPool must index under canonical .ogg key');
  assert.equal(loader.bufferPool.has('Mixdown/Timbal studio T D 1.m4a'), false);
  assert.equal(workletPosted.length, 1);
  assert.equal(bridge.getSampleId('Mixdown/Timbal studio T D 1.ogg'), 0);
  assert.equal(bridge.getSampleId('Mixdown/Timbal studio T D 1.m4a'), 0);
  assert.equal(bridge.isSampleReadyInWorklet('Mixdown/Timbal studio T D 1.ogg'), true);
  bridge.dispose();
}

// 3. Mémorisation automatique (`latchedM4aFallback = true`) dès le 1er échec de décodage `.ogg`
{
  (globalThis as any).document = undefined;
  setPreferM4aFallbackForTests(null);
  assert.equal(shouldPreferM4aFallback(), false);

  const requestedUrls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    requestedUrls.push(String(url));
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(32) } as Response;
  }) as typeof fetch;

  let callIdx = 0;
  const fallbackCtx = {
    sampleRate: 48000,
    decodeAudioData: async () => {
      callIdx++;
      if (callIdx === 1) throw new Error('EncodingError: Ogg Vorbis unsupported');
      return makeMockAudioBuffer();
    },
  } as unknown as AudioContext;

  const buf1 = await fetchAndDecodeAudioSample(fallbackCtx, 'Mixdown/Tarol F 1.ogg');
  assert.ok(buf1 !== null);
  assert.equal(shouldPreferM4aFallback(), true, 'First .ogg decode failure must latch preferM4aFallback');
  requestedUrls.length = 0;

  const buf2 = await fetchAndDecodeAudioSample(fallbackCtx, 'Mixdown/Tarol F 2.ogg');
  assert.ok(buf2 !== null);
  assert.equal(requestedUrls.length, 1, 'Subsequent loads must skip .ogg and fetch .m4a directly');
  assert.ok(requestedUrls[0].split('?')[0].endsWith('Tarol%20F%202.m4a'));
}

globalThis.fetch = originalFetch;
(globalThis as any).document = originalDocument;
setPreferM4aFallbackForTests(null);
console.log('iosWebkitM4aLoader.test.ts: ALL ASSERTIONS PASSED');
