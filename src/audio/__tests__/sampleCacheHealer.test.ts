// @ts-ignore — vitest est exécuté via npx vitest
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAndDecodeAudioSample, setPreferM4aFallbackForTests } from '../engine/sampleFetchUtils';

const origFetch = globalThis.fetch;
const origCaches = (globalThis as any).caches;

function makeAudioBuffer(): AudioBuffer {
  const ch = new Float32Array(128).fill(0.1);
  return { sampleRate: 48000, length: 128, duration: 128 / 48000, numberOfChannels: 1, getChannelData: () => ch } as unknown as AudioBuffer;
}

describe('Auto-guérison Cache SW audio-samples-cache (.ogg et .m4a)', () => {
  afterEach(() => {
    globalThis.fetch = origFetch;
    (globalThis as any).caches = origCaches;
    setPreferM4aFallbackForTests(null);
  });

  it('purges audio-samples-cache BEFORE fetch(url, { cache: "reload" }) on SPA text/html or decodeAudioData failure', async () => {
    for (const preferM4a of [false, true]) {
      setPreferM4aFallbackForTests(preferM4a);
      const events: string[] = [];
      const mockCache = {
        delete: vi.fn(async (key: string) => { events.push(`delete:${key}`); return true; }),
      };
      (globalThis as any).caches = {
        open: vi.fn(async (name: string) => { events.push(`open:${name}`); return mockCache; }),
      };

      globalThis.fetch = vi.fn(async (url: any, init?: RequestInit) => {
        const isReload = init?.cache === 'reload';
        events.push(`fetch:${isReload ? 'reload' : 'cached'}:${String(url)}`);
        const mime = isReload ? (preferM4a ? 'audio/mp4' : 'audio/ogg') : 'text/html; charset=utf-8';
        return {
          ok: true,
          status: 200,
          headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? mime : null) },
          arrayBuffer: async () => new ArrayBuffer(32),
        } as unknown as Response;
      }) as typeof fetch;

      const ctxHtml = { decodeAudioData: vi.fn(async () => makeAudioBuffer()) } as unknown as AudioContext;
      const decodedHtml = await fetchAndDecodeAudioSample(ctxHtml, 'Mixdown/Gongue G 1.ogg');
      expect(decodedHtml).not.toBeNull();
      const openIdx = events.findIndex((e) => e === 'open:audio-samples-cache');
      const delIdx = events.findIndex((e) => e.startsWith('delete:'));
      const reloadIdx = events.findIndex((e) => e.startsWith('fetch:reload:'));
      expect(openIdx).toBeGreaterThan(0);
      expect(delIdx).toBeGreaterThan(openIdx);
      expect(reloadIdx).toBeGreaterThan(delIdx);

      events.length = 0;
      let decodeAttempt = 0;
      globalThis.fetch = vi.fn(async (url: any, init?: RequestInit) => {
        events.push(`fetch:${init?.cache === 'reload' ? 'reload' : 'cached'}:${String(url)}`);
        return { ok: true, status: 200, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(32) } as unknown as Response;
      }) as typeof fetch;
      const ctxCorrupt = {
        decodeAudioData: vi.fn(async () => {
          if (++decodeAttempt === 1) throw new Error('EncodingError: truncated cached entry');
          return makeAudioBuffer();
        }),
      } as unknown as AudioContext;
      const decodedAfterHeal = await fetchAndDecodeAudioSample(ctxCorrupt, 'Mixdown/Gongue A 1.ogg');
      expect(decodedAfterHeal).not.toBeNull();
      expect(events.findIndex((e) => e.startsWith('delete:'))).toBeLessThan(events.findIndex((e) => e.startsWith('fetch:reload:')));
    }
  });
});
