/**
 * oficinaBridgesAndZeroSafety.test.ts — Passerelles bidirectionnelles A Oficina <-> Éditeur & sécurité Falsy-Zero (< 140L).
 */
// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it } from 'vitest';
import { useSequencerStore } from '../../useSequencerStore';
import { useSequencerSettingsStore } from '../../useSequencerSettingsStore';
import { useAudioStore } from '../../useAudioStore';
import { VocalSequencerPlayer } from '../../../audio/vocal/vocalSequencerPlayer';
import { resolveVocalPlaybackBuffer } from '../../../utils/vocal/vocalPlaybackHelper';
import {
  buildVocalDspCacheKey,
  clearVocalPatternDspCache,
  getCachedVocalPatternDspEntry,
  getOrComputeVocalPatternDspSync,
} from '../../../audio/vocalDsp/vocalPatternBufferCache';
import { resolveDeepLinkPatternId } from '../../../hooks/instrument-editor/useInstrumentDetailEditorController';

function makeSineAudioBuffer(sampleRate = 16000, durationSec = 0.25): AudioBuffer {
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const ch0 = new Float32Array(length);
  for (let i = 0; i < length; i++) ch0[i] = Math.sin((2 * Math.PI * 220 * i) / sampleRate) * 0.4;
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

describe('Oficina <-> InstrumentDetailEditor bridges & falsy-zero safety', () => {
  beforeEach(() => {
    clearVocalPatternDspCache();
    useSequencerSettingsStore.setState({ isSettingsOpen: false, activeSection: 'lutherie', oficinaFocus: null, returnEditorContext: null });
    useSequencerStore.getState().closeDetailEditor();
  });

  it('preserves trackId=0, patternId=0, stepIdx=0, subIndex=0 across openOficinaSection -> openInstrumentDetailAt -> consumeEditorDeepLink', () => {
    const settings = useSequencerSettingsStore.getState();
    settings.openOficinaSection('groove', {
      focus: { grooveTier: 'pattern', trackId: 0, patternId: 0 },
      returnContext: {
        trackId: 0, trackLabel: 'Marcante 1', patternId: 0, patternLabel: 'Base',
        stepIdx: 0, isPreRoll: false, subIndex: 0, activeTool: 'A',
      },
    });

    const afterOpenOficina = useSequencerSettingsStore.getState();
    expect(afterOpenOficina.isSettingsOpen).toBe(true);
    expect(afterOpenOficina.activeSection).toBe('groove');
    expect(afterOpenOficina.oficinaFocus).toEqual({ grooveTier: 'pattern', trackId: 0, patternId: 0 });
    expect(afterOpenOficina.returnEditorContext?.trackId).toBe(0);
    expect(afterOpenOficina.returnEditorContext?.patternId).toBe(0);
    expect(afterOpenOficina.returnEditorContext?.stepIdx).toBe(0);
    expect(afterOpenOficina.returnEditorContext?.subIndex).toBe(0);

    const ret = afterOpenOficina.returnEditorContext!;
    useSequencerStore.getState().openInstrumentDetailAt({
      trackId: ret.trackId, patternId: ret.patternId, stepIdx: ret.stepIdx,
      isPreRoll: ret.isPreRoll, subIndex: ret.subIndex, initialTool: ret.activeTool, expandTuning: true,
    });
    useSequencerSettingsStore.getState().clearReturnEditorContext();
    useSequencerSettingsStore.getState().setIsSettingsOpen(false);

    const seqAfterReturn = useSequencerStore.getState();
    expect(seqAfterReturn.editingTrackId).toBe(0);
    expect(seqAfterReturn.selectedPatternId).toBe(0);
    expect(seqAfterReturn.selectedStepIdx).toBe(0);
    expect(seqAfterReturn.selectedSubIndex).toBe(0);
    expect(seqAfterReturn.editorDeepLink).toEqual({
      trackId: 0, patternId: 0, stepIdx: 0, isPreRoll: false, subIndex: 0, initialTool: 'A', expandTuning: true,
    });
    expect(resolveDeepLinkPatternId(0, [{ id: 2, name: 'Virada' } as any, { id: 0, name: 'Base' } as any])).toBe(0);

    useSequencerStore.getState().consumeEditorDeepLink();
    expect(useSequencerStore.getState().editorDeepLink).toBeNull();
    expect(useSequencerStore.getState().editingTrackId).toBe(0);
    expect(useSequencerStore.getState().selectedPatternId).toBe(0);
    expect(useSequencerSettingsStore.getState().returnEditorContext).toBeNull();
  });

  it('computes exact semitone deltas for vocalTransposeSteps = 0 vs -3 and +2', () => {
    const buf = makeSineAudioBuffer();
    const track0 = { id: 0, instrumentIdx: 10, tuning: 0, patterns: [] } as any;
    const basePtn = { id: 0, steps: 16, vocalBaseBpm: 100, vocalClip: { recordedBpm: 100, t1OffsetSec: 0, trimStartSec: 0, trimEndSec: 0.25 } } as any;

    const resZero = resolveVocalPlaybackBuffer(basePtn, track0, 100, 100, buf, {}, 0);
    expect(resZero.isVariant).toBe(false);
    expect(resZero.dspEntry.transpositionSemitones).toBe(0);
    expect(resZero.dspEntry.deltaSemitones).toBe(0);

    const resDown3 = resolveVocalPlaybackBuffer(basePtn, track0, 100, 100, buf, {}, -3);
    expect(resDown3.isVariant).toBe(true);
    expect(resDown3.dspEntry.transpositionSemitones).toBe(-3);
    expect(resDown3.dspEntry.deltaSemitones).toBe(-3);

    const resUp2 = resolveVocalPlaybackBuffer(basePtn, track0, 100, 100, buf, {}, 2);
    expect(resUp2.isVariant).toBe(true);
    expect(resUp2.dspEntry.transpositionSemitones).toBe(2);
    expect(resUp2.dspEntry.deltaSemitones).toBe(2);

    const packShifted = getOrComputeVocalPatternDspSync('0_0', buf, 100, 100, 0, 2);
    expect(packShifted.deltaSemitones).toBe(-2);
  });

  it('resolves trackId=0 and patternId=0 accurately in VocalSequencerPlayer and vocalPatternBufferCache', async () => {
    const buf = makeSineAudioBuffer();
    expect(buildVocalDspCacheKey(0, 100, 0, 0)).toBe('0_0__dsp_100_0');
    getOrComputeVocalPatternDspSync('0_0', buf, 100, 100, 0, 0);
    expect(getCachedVocalPatternDspEntry(0, 100, 0, 0)?.cacheKey).toBe('0_0__dsp_100_0');

    useSequencerStore.setState({
      tracks: [
        { id: 5, instrumentIdx: 11, volumeVal: 75, patterns: [{ id: 0, steps: 16, measureAssignments: [true] }] } as any,
        { id: 0, instrumentIdx: 10, volumeVal: 80, patterns: [{ id: 0, steps: 16, measureAssignments: [true] }] } as any,
      ],
    });
    useAudioStore.getState().setVocalBuffer('0_0', buf);
    useAudioStore.getState().setVocalBuffer('5_0', buf);

    let scheduledTrackId: string | number | undefined;
    const origSchedule = VocalSequencerPlayer.scheduleVoicePlayback;
    VocalSequencerPlayer.scheduleVoicePlayback = ((tId: string | number) => { scheduledTrackId = tId; return null; }) as any;
    try {
      await VocalSequencerPlayer.playPreview(0, 1.0, undefined, 0);
      expect(scheduledTrackId).toBe(0);
    } finally {
      VocalSequencerPlayer.scheduleVoicePlayback = origSchedule;
    }
  });
});
