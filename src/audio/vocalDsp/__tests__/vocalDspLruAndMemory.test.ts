/**
 * vocalDspLruAndMemory.test.ts — Verrouillage P0.3 Gouvernance RAM (LRU) des variantes DSP vocales (< 120 lignes) :
 * - Plafond strict LRU sur les seuls buffers dérivés `__dsp_${bpm}_${semitones}` (ex. rafale SpeedTrainer 40 tempos).
 * - Immunité absolue des buffers maîtres `${trackId}_${patternId}` dans `useAudioStore.vocalBuffers`.
 * - Garde anti-fuite refusant toute clé `__dsp_` dans `useAudioStore.vocalBuffers` et purge par préfixe.
 */
import assert from 'node:assert/strict';
import {
  buildVocalDspCacheKey,
  clearVocalPatternDspCache,
  DEFAULT_MAX_VOCAL_DSP_CACHE_ENTRIES,
  evictVocalDspVariantsByPrefix,
  getCachedVocalPatternDspEntry,
  getOrComputeVocalPatternDspSync,
  getVocalDspCacheKeys,
  getVocalDspCacheSize,
  setMaxVocalDspCacheEntriesForTests,
} from '../vocalPatternBufferCache';
import { useAudioStore } from '../../../stores/useAudioStore';
import { resolveVocalPlaybackBuffer } from '../../../utils/vocal/vocalPlaybackHelper';

function makeTestVoiceBuffer(sampleRate = 16000, durationSec = 0.2): AudioBuffer {
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const ch0 = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    ch0[i] = Math.sin((2 * Math.PI * 196 * i) / sampleRate) * 0.35;
  }
  return {
    sampleRate,
    length,
    duration: length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => ch0,
    copyFromChannel: (dst: Float32Array, _c: number, start = 0) => dst.set(ch0.subarray(start, start + dst.length)),
    copyToChannel: (src: Float32Array, _c: number, start = 0) => ch0.set(src, start),
  } as unknown as AudioBuffer;
}

(() => {
  clearVocalPatternDspCache();
  setMaxVocalDspCacheEntriesForTests(6);

  const masterBufPux = makeTestVoiceBuffer();
  const masterBufCoro = makeTestVoiceBuffer();
  useAudioStore.setState({ vocalBuffers: {}, vocalBlobs: {} });

  // 1. Les buffers maîtres `${trackId}_${patternId}` sont stockés dans useAudioStore
  useAudioStore.getState().setVocalBuffer('10_501', masterBufPux);
  useAudioStore.getState().setVocalBuffer('11_502', masterBufCoro);
  assert.equal(useAudioStore.getState().vocalBuffers['10_501'], masterBufPux);
  assert.equal(useAudioStore.getState().vocalBuffers['11_502'], masterBufCoro);

  // 2. La garde de useAudioStore refuse toute clé dérivée `__dsp_*`
  useAudioStore.getState().setVocalBuffer('10_501__dsp_96_-2', masterBufPux);
  useAudioStore.getState().addVocalBuffer('10_501__dsp_100_0', masterBufPux);
  useAudioStore.getState().setVocalBuffersBatch([
    { key: '10_501__dsp_104_1', buffer: masterBufPux },
  ]);
  assert.equal(Object.keys(useAudioStore.getState().vocalBuffers).some((k) => k.includes('__dsp_')), false);

  // 3. Rafale SpeedTrainer (15 paliers de BPM) => plafond LRU strictement respecté (6 max) + promotion LRU à la lecture
  for (let bpm = 80; bpm < 95; bpm++) {
    getOrComputeVocalPatternDspSync('10_501', masterBufPux, 88, bpm, -1, 0);
  }
  assert.equal(getVocalDspCacheSize(), 6, 'LRU must cap derived DSP variants at max limit');
  assert.equal(getCachedVocalPatternDspEntry('10_501', 80, -1), undefined, 'Oldest BPM 80 variant must be evicted');
  assert.ok(getCachedVocalPatternDspEntry('10_501', 89, -1) !== undefined, 'BPM 89 touched -> promoted to MRU');

  // Insérer 5 nouvelles variantes : BPM 89 (promu) doit survivre tandis que 90..94 sont évincés
  for (let bpm = 95; bpm < 100; bpm++) {
    getOrComputeVocalPatternDspSync('11_502', masterBufCoro, 88, bpm, 2, 0);
  }
  assert.equal(getVocalDspCacheSize(), 6);
  assert.ok(getCachedVocalPatternDspEntry('10_501', 89, -1) !== undefined, 'Promoted BPM 89 must survive LRU eviction');
  assert.equal(getCachedVocalPatternDspEntry('10_501', 90, -1), undefined, 'Untouched BPM 90 must be evicted');

  // 4. resolveVocalPlaybackBuffer ne pollue jamais useAudioStore.vocalBuffers avec des clés `__dsp_*`
  const track10 = { id: 10, instrumentIdx: 10, tuning: 0, patterns: [] } as any;
  const pat501 = { id: 501, steps: 16, vocalBaseBpm: 88, vocalClip: { recordedBpm: 88, t1OffsetSec: 0, trimStartSec: 0, trimEndSec: 0.2 } } as any;
  const resolved = resolveVocalPlaybackBuffer(pat501, track10, 108, 88, masterBufPux, useAudioStore.getState().vocalBuffers, -2);
  assert.equal(resolved.isVariant, true);
  assert.equal(resolved.variantKey, buildVocalDspCacheKey('10_501', 108, -2));
  assert.deepEqual(Object.keys(useAudioStore.getState().vocalBuffers).sort(), ['10_501', '11_502']);

  // 5. Purge ciblée par motif (`evictVocalDspVariantsByPrefix`) sans toucher aux autres motifs ni aux buffers maîtres
  const evictedCount = evictVocalDspVariantsByPrefix('11_502');
  assert.ok(evictedCount > 0);
  assert.equal(getVocalDspCacheKeys().some((k) => k.startsWith('11_502__dsp_')), false);
  assert.equal(useAudioStore.getState().vocalBuffers['10_501'], masterBufPux);
  assert.equal(useAudioStore.getState().vocalBuffers['11_502'], masterBufCoro);

  setMaxVocalDspCacheEntriesForTests(DEFAULT_MAX_VOCAL_DSP_CACHE_ENTRIES);
  clearVocalPatternDspCache();
  console.log('vocalDspLruAndMemory.test.ts: ALL ASSERTIONS PASSED');
})();
