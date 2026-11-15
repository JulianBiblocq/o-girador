/**
 * twoPassSamplePreloadAndBridge.test.ts — Tests unitaires du préchargement 2 passes (batch=3),
 * du dédoublonnement/libération PCM Worklet et du repli à la demande de `playPreview` (< 138 lignes).
 */
// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it, vi } from 'vitest';
import { InstrumentAudioConfig } from '../../../data/audioConfig';
import { PercussionWorkletSampleBridge } from '../../worklet/percussionWorkletSampleBridge';
import { EngineMemorySync } from '../engineMemorySync';
import { EngineNotePlayer } from '../engineNotePlayer';
import { EngineVirtualStrokes } from '../engineVirtualStrokes';
import { EngineVoiceGuard } from '../engineVoiceGuard';

if (typeof (globalThis as any).AudioWorkletProcessor === 'undefined') {
  (globalThis as any).AudioWorkletProcessor = class {
    readonly port = { onmessage: null, postMessage() {} };
  };
}

function makeAudioBuffer(len = 64, sr = 48000): AudioBuffer {
  const ch0 = new Float32Array(len).fill(0.25);
  return { sampleRate: sr, length: len, duration: len / sr, numberOfChannels: 1, getChannelData: () => ch0 } as unknown as AudioBuffer;
}

function makeToneBuffer(buf = makeAudioBuffer()) {
  return { loaded: true, disposed: false, get: () => buf, dispose() { this.disposed = true; } } as any;
}

const MOCK_CONFIGS: InstrumentAudioConfig[] = [
  {
    id: 'marcante', name: 'Marcante', uiOrder: ['D', 'E', 'A', 'X'], leftHandedSupport: true,
    strokes: [
      { symbol: 'D', keys: ['D'], files: ['Mixdown/M_D1.ogg', 'Mixdown/M_D2.ogg'], caseSensitive: true },
      { symbol: 'E', keys: ['E'], files: ['Mixdown/M_E1.ogg', 'Mixdown/M_E2.ogg'], caseSensitive: true },
      { symbol: 'A', keys: ['A'], files: ['Mixdown/M_A1.ogg', 'Mixdown/M_A2.ogg'], caseSensitive: true },
      { symbol: 'X', keys: ['X'], files: ['Mixdown/M_X1.ogg'], caseSensitive: true },
    ],
  },
  {
    id: 'timbal', name: 'Timbal', uiOrder: ['A', 'S'], leftHandedSupport: false,
    strokes: [
      { symbol: 'A', keys: ['A'], files: ['Mixdown/T_A1.ogg'], caseSensitive: true },
      { symbol: 'S', keys: ['S'], files: ['Mixdown/T_S1.ogg'], caseSensitive: true },
    ],
  },
];

describe('Two-Pass Sample Preloader, Worklet Deduplication/Eviction & playPreview Fallback', () => {
  it('loads Pass 1 immediately in batches <= 3, Pass 2 for all strokes of present instruments, and 0 absent files', async () => {
    const configMap = new Map(MOCK_CONFIGS.map((c) => [c.id, c]));
    const bufferPool = new Map<string, any>();
    const loadOrder: string[] = [];
    let inFlight = 0, maxConcurrent = 0;

    const loadPath = async (_ctx: AudioContext, path: string) => {
      inFlight++; if (inFlight > maxConcurrent) maxConcurrent = inFlight;
      await new Promise((r) => setTimeout(r, 2));
      inFlight--; loadOrder.push(path);
      bufferPool.set(path, makeToneBuffer());
    };

    await EngineMemorySync.syncActiveInstrumentsMemory(
      {} as AudioContext, configMap, bufferPool, loadPath, [{ id: 'marcante', activeStrokes: ['D'] }]
    );

    expect(bufferPool.has('Mixdown/M_D1.ogg')).toBe(true);
    expect(bufferPool.has('Mixdown/M_D2.ogg')).toBe(true);

    await EngineMemorySync.waitForBackgroundPass2();
    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(loadOrder.slice(0, 2)).toEqual(['Mixdown/M_D1.ogg', 'Mixdown/M_D2.ogg']);
    expect(bufferPool.size).toBe(7);
    expect(bufferPool.has('Mixdown/M_A1.ogg')).toBe(true);
    expect(bufferPool.has('Mixdown/M_X1.ogg')).toBe(true);
    expect(bufferPool.has('Mixdown/T_A1.ogg')).toBe(false);
  });

  it('deduplicates samplePath IPC transfers and frees PCM in both bufferPool and PercussionEngineProcessor on track removal', async () => {
    const { PercussionEngineProcessor } = await import('../../worklet/processor/percussionEngineProcessor');
    const configMap = new Map(MOCK_CONFIGS.map((c) => [c.id, c]));
    const bufferPool = new Map<string, any>();
    const bridge = new PercussionWorkletSampleBridge();
    const sentMessages: any[] = [];
    const processor = new PercussionEngineProcessor() as any;

    bridge.syncBufferPool(bufferPool);
    bridge.attachPort({ postMessage: (msg: any) => { sentMessages.push(msg); processor.handleMessage(msg); } });

    const id1 = bridge.registerSampleBuffer('Mixdown/T_A1.ogg', makeAudioBuffer());
    const id2 = bridge.registerSampleBuffer('Mixdown/T_A1.ogg', makeAudioBuffer());
    expect(id2).toBe(id1);
    expect(sentMessages.filter((m) => m.type === 'LOAD_SAMPLE')).toHaveLength(1);
    expect(processor.samples[id1]).toBeDefined();

    bufferPool.set('Mixdown/T_A1.ogg', makeToneBuffer());
    await EngineMemorySync.syncActiveInstrumentsMemory(
      {} as AudioContext, configMap, bufferPool, async (_c, p) => { bufferPool.set(p, makeToneBuffer()); }, []
    );

    expect(bufferPool.has('Mixdown/T_A1.ogg')).toBe(false);
    expect(sentMessages.some((m) => m.type === 'UNLOAD_SAMPLES' && m.sampleIds.includes(id1))).toBe(true);
    expect(processor.samples[id1]).toBeUndefined();
  });

  it('loads absent instrument stroke on-demand during playPreview and plays it audibly on 1st click', async () => {
    const configMap = new Map(MOCK_CONFIGS.map((c) => [c.id, c]));
    const strokesMaps = EngineVirtualStrokes.buildStrokesMaps(MOCK_CONFIGS);
    const bufferPool = new Map<string, any>();
    let playedCount = 0;

    const sampleLoader = {
      bufferPool,
      isStrokeLoaded: () => bufferPool.has('Mixdown/T_A1.ogg'),
      loadStrokeSamples: vi.fn(async () => { bufferPool.set('Mixdown/T_A1.ogg', makeToneBuffer()); }),
      loadInstrumentSamples: vi.fn(async () => {}),
    };
    const mockGain = () => ({ gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => {} });
    const voiceGuard = new EngineVoiceGuard();
    const deps = EngineNotePlayer.buildDeps(
      { currentTime: 1.0, state: 'running', resume: async () => {}, createBufferSource: () => ({ connect: () => {}, disconnect: () => {}, start: () => { playedCount++; }, stop: () => {}, playbackRate: { value: 1 } }), createGain: mockGain } as any,
      { getDestination: () => ({}), getGainNode: mockGain, releaseGainNode: () => {} },
      voiceGuard,
      { stopBarulho: () => {}, fadeOutBarulho: () => {}, activeBarulhoNodes: new Map(), activeBarulhoGains: new Map() },
      new Set(), new Map(), sampleLoader, { selectFile: () => 'Mixdown/T_A1.ogg' }, configMap, strokesMaps, new Map(), () => 0
    );

    EngineNotePlayer.playPreview(deps, 'timbal', 'A', 0, 1.0);
    await new Promise((r) => setTimeout(r, 15));
    expect(sampleLoader.loadStrokeSamples).toHaveBeenCalledTimes(1);
    expect(playedCount).toBe(1);
  });
});
