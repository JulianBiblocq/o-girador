import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useAudio } from '../contexts/AudioContext';
import { channels, masterVolumeNode } from '../audio/effectsChain';
import { Play, Square, Save, X, RotateCcw, Scissors } from 'lucide-react';

const PIXELS_PER_SECOND = 200; // Timeline scale: 200px = 1 second

// WAV PCM 16-bit encoding helper functions
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const bufferLength = result.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength, true);

  floatTo16BitPCM(view, 44, result);

  return new Blob([view], { type: 'audio/wav' });
}

export const VocalValidationModal: React.FC = () => {
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const setTempRecording = useAudioStore((state) => state.setTempRecording);
  const { handleStop, handleTogglePlay, handleTimelineNavigate } = useAudio();
  const sequencerStore = useSequencerStore();

  const [loading, setLoading] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [nudgeMs, setNudgeMs] = useState(0);
  
  // Trim states in milliseconds
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0);
  
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Refs for 60 FPS direct DOM mutation
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preview local GrainPlayer reference
  const localPlayerRef = useRef<Tone.GrainPlayer | null>(null);

  // Store original loop settings to restore them
  const originalLoopSettingsRef = useRef<{
    loop: boolean;
    loopStart: any;
    loopEnd: any;
    seconds: number;
    seqLoopStart: number | null;
    seqLoopEnd: number | null;
    seqLoopActive: boolean;
    seqLooping: boolean;
    seqCurrentMeasure: number;
  } | null>(null);

  // Find pattern and track metadata
  const tracks = useSequencerStore((state) => state.tracks);
  const bpm = useSequencerStore((state) => state.bpm);
  const measureBpms = useSequencerStore((state) => state.measureBpms);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);

  const voiceTrack = tempRecording
    ? tracks.find((t) => t.patterns.some((p) => Number(p.id) === Number(tempRecording.patternId)))
    : null;
  const targetPattern = tempRecording && voiceTrack
    ? voiceTrack.patterns.find((p) => Number(p.id) === Number(tempRecording.patternId))
    : null;

  // Helper to calculate elapsed seconds up to a given measure
  const getElapsedSeconds = useCallback((mCount: number) => {
    let secs = 0;
    for (let i = 0; i < mCount; i++) {
      const mIdx = i % (measureBpms.length || 1);
      const mBpm = measureBpms[mIdx] || bpm;
      const timeSig = measureTimeSigs[mIdx] || '4/4';
      const beats = parseInt(timeSig.split('/')[0]) || 4;
      secs += (beats * 60) / mBpm;
    }
    return secs;
  }, [measureBpms, measureTimeSigs, bpm]);

  // Decode audio data on mount
  useEffect(() => {
    if (!tempRecording) return;

    let active = true;
    setLoading(true);
    setAudioBuffer(null);
    setNudgeMs(0);

    const decode = async () => {
      try {
        const arrayBuffer = await tempRecording.blob.arrayBuffer();
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        // Safeguard decoding
        const buffer = await rawCtx.decodeAudioData(arrayBuffer);
        if (active) {
          setAudioBuffer(buffer);
          setTrimStartMs(0);
          setTrimEndMs(buffer.duration * 1000);
          setLoading(false);
          console.log(`ðï¸ [VOCAL DEBUG] Audio decoded successfully. Duration: ${buffer.duration.toFixed(2)}s`);
        }
      } catch (err) {
        console.error('ðï¸ [VOCAL DEBUG] Error decoding temporary recording:', err);
        if (active) setLoading(false);
      }
    };

    // Stop current playbacks when modal opens
    handleStop();
    decode();

    return () => {
      active = false;
    };
  }, [tempRecording, handleStop]);

  // Draw waveform on canvas with Trim overlay visual guides
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = audioBuffer.duration;
    const width = duration * PIXELS_PER_SECOND;
    const height = canvas.height;

    // Set high-DPI scaling
    canvas.width = width;
    ctx.clearRect(0, 0, width, height);

    // Draw grid background
    ctx.fillStyle = 'rgba(26, 26, 26, 0.03)';
    for (let x = 0; x < width; x += 50) {
      ctx.fillRect(x, 0, 1, height);
    }

    // Pre-roll zone visual guide (first 500ms is pre-roll, so t = 0 to 0.5s)
    ctx.fillStyle = 'rgba(42, 93, 78, 0.08)'; // Cactus green tint
    ctx.fillRect(0, 0, 0.5 * PIXELS_PER_SECOND, height);

    // Vertical line at note trigger point (t = 0.5s)
    ctx.strokeStyle = '#2a5d4e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0.5 * PIXELS_PER_SECOND, 0);
    ctx.lineTo(0.5 * PIXELS_PER_SECOND, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw peaks
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2.5;

    ctx.fillStyle = '#8b2a1a'; // Crimson Red
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const startIdx = i * step;
      const endIdx = Math.min(channelData.length, startIdx + step);
      for (let j = startIdx; j < endIdx; j++) {
        const val = channelData[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const x = i;
      const y = height / 2 + min * amp;
      const w = 1.5;
      const h = Math.max(1.5, (max - min) * amp);
      ctx.fillRect(x, y, w, h);
    }

    // 1. Draw trimmed-out start zone (grey transparent overlay)
    ctx.fillStyle = 'rgba(26, 26, 26, 0.45)';
    ctx.fillRect(0, 0, (trimStartMs / 1000) * PIXELS_PER_SECOND, height);

    // 2. Draw trimmed-out end zone (grey transparent overlay)
    const trimEndLeft = (trimEndMs / 1000) * PIXELS_PER_SECOND;
    ctx.fillRect(trimEndLeft, 0, width - trimEndLeft, height);

    // 3. Draw vertical boundary lines for Trim Start & Trim End
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo((trimStartMs / 1000) * PIXELS_PER_SECOND, 0);
    ctx.lineTo((trimStartMs / 1000) * PIXELS_PER_SECOND, height);
    ctx.moveTo(trimEndLeft, 0);
    ctx.lineTo(trimEndLeft, height);
    ctx.stroke();
  }, [audioBuffer, trimStartMs, trimEndMs]);

  if (!tempRecording || !targetPattern || !voiceTrack) return null;

  const storeTargetMeasureIdx = useAudioStore((state) => state.targetMeasureIdx);
  const initialMeasureIdx = storeTargetMeasureIdx !== null
    ? storeTargetMeasureIdx
    : (targetPattern.measureAssignments.indexOf(true) !== -1
        ? targetPattern.measureAssignments.indexOf(true)
        : 0);

  const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);
  const preRollDurationSec = getElapsedSeconds(initialMeasureIdx) - getElapsedSeconds(startMeasureIdx);

  const patternBpm = measureBpms[initialMeasureIdx] || bpm;
  const timeSig = measureTimeSigs[initialMeasureIdx] || '4/4';
  const beatsPerMeasure = parseInt(timeSig.split('/')[0]) || 4;
  const measureDurationSec = (beatsPerMeasure * 60) / patternBpm;
  const stepDurationSec = measureDurationSec / 16;

  // Total measures count for loop preview
  let patternMeasures = 0;
  for (let i = initialMeasureIdx; i < measureBpms.length; i++) {
    if (targetPattern.measureAssignments[i]) {
      patternMeasures++;
    } else {
      break;
    }
  }
  patternMeasures = Math.max(1, patternMeasures);

  // 60 FPS Nudge Slider change handler - directly updates CSS transforms to avoid React re-renders
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const shiftPx = (val / 1000) * PIXELS_PER_SECOND;

    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translateX(${shiftPx}px)`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${val > 0 ? '+' : ''}${val.toFixed(0)} ms`;
    }
  };

  // Synchronize state when user stops dragging
  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    setNudgeMs(val);
    console.log(`🎙️ [VOCAL DEBUG] Latency nudge updated: ${val} ms`);
    if (isPlayingPreview) {
      handleRestartPreview(val, trimStartMs, trimEndMs);
    }
  };

  // Reset Nudge to 0
  const handleResetNudge = () => {
    setNudgeMs(0);
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = 'translateX(0px)';
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = '0 ms';
    }
    if (isPlayingPreview) {
      handleRestartPreview(0, trimStartMs, trimEndMs);
    }
  };

  // Restart or update preview player in real-time
  const handleRestartPreview = (nVal: number, tStartVal: number, tEndVal: number) => {
    if (!audioBuffer) return;

    if (localPlayerRef.current) {
      try {
        localPlayerRef.current.dispose();
      } catch (_) {}
      localPlayerRef.current = null;
    }

    const startOffsetSec = tStartVal / 1000;
    const durationSec = (tEndVal - tStartVal) / 1000;

    const player = new Tone.GrainPlayer(audioBuffer);
    player.grainSize = 0.09;
    player.overlap = 0.04;
    player.volume.value = 0; // Unity gain (0 dB)
    player.connect(Tone.Destination);

    const playTimeOnTimeline = getElapsedSeconds(initialMeasureIdx) + (nVal / 1000);
    const actualStartOffset = startOffsetSec + (nVal < 0 ? -nVal / 1000 : 0);
    const actualDuration = Math.max(0.1, durationSec - (nVal < 0 ? -nVal / 1000 : 0));

    player.sync().start(playTimeOnTimeline, actualStartOffset, actualDuration);
    localPlayerRef.current = player;
  };

  const handleTrimRelease = () => {
    if (isPlayingPreview) {
      handleRestartPreview(nudgeMs, trimStartMs, trimEndMs);
    }
  };

  // Toggle in-context preview playback loop restricted to Trim boundaries
  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      // STOP PREVIEW
      handleStop();
      setIsPlayingPreview(false);

      if (localPlayerRef.current) {
        localPlayerRef.current.dispose();
        localPlayerRef.current = null;
      }

      // Restore original Transport and Sequencer settings
      if (originalLoopSettingsRef.current) {
        Tone.Transport.loop = originalLoopSettingsRef.current.loop;
        Tone.Transport.loopStart = originalLoopSettingsRef.current.loopStart;
        Tone.Transport.loopEnd = originalLoopSettingsRef.current.loopEnd;
        Tone.Transport.seconds = originalLoopSettingsRef.current.seconds;

        const seq = useSequencerStore.getState();
        seq.setLoopStartMeasure(originalLoopSettingsRef.current.seqLoopStart);
        seq.setLoopEndMeasure(originalLoopSettingsRef.current.seqLoopEnd);
        seq.setIsLoopRegionActive(originalLoopSettingsRef.current.seqLoopActive);
        seq.setIsLooping(originalLoopSettingsRef.current.seqLooping);
        
        handleTimelineNavigate(originalLoopSettingsRef.current.seqCurrentMeasure, 0);
        originalLoopSettingsRef.current = null;
      }
      console.log('🎙️ [VOCAL DEBUG] Local preview stopped, Transport and Sequencer loop settings restored.');
    } else {
      // START PREVIEW
      if (!audioBuffer) return;

      const seq = useSequencerStore.getState();
      // Store original settings
      originalLoopSettingsRef.current = {
        loop: Tone.Transport.loop,
        loopStart: Tone.Transport.loopStart,
        loopEnd: Tone.Transport.loopEnd,
        seconds: Tone.Transport.seconds,
        seqLoopStart: seq.loopStartMeasure,
        seqLoopEnd: seq.loopEndMeasure,
        seqLoopActive: seq.isLoopRegionActive,
        seqLooping: seq.isLooping,
        seqCurrentMeasure: seq.currentMeasure
      };

      // Set sequencer loop exactly covering the preview range
      seq.setLoopStartMeasure(startMeasureIdx);
      seq.setLoopEndMeasure(initialMeasureIdx + patternMeasures - 1);
      seq.setIsLoopRegionActive(true);
      seq.setIsLooping(true);

      // Match Tone.Transport loop boundaries
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = getElapsedSeconds(startMeasureIdx);
      Tone.Transport.loopEnd = getElapsedSeconds(initialMeasureIdx + patternMeasures);
      
      // Navigate to pre-roll measure
      handleTimelineNavigate(startMeasureIdx, 0);
      Tone.Transport.seconds = getElapsedSeconds(startMeasureIdx);

      handleRestartPreview(nudgeMs, trimStartMs, trimEndMs);

      // Start transport and sequencer
      handleTogglePlay();
      setIsPlayingPreview(true);
    }
  };

  // Clean preview on unmount
  useEffect(() => {
    return () => {
      if (localPlayerRef.current) {
        localPlayerRef.current.dispose();
        localPlayerRef.current = null;
      }
      if (originalLoopSettingsRef.current) {
        Tone.Transport.loop = originalLoopSettingsRef.current.loop;
        Tone.Transport.loopStart = originalLoopSettingsRef.current.loopStart;
        Tone.Transport.loopEnd = originalLoopSettingsRef.current.loopEnd;
        Tone.Transport.seconds = originalLoopSettingsRef.current.seconds;

        const seq = useSequencerStore.getState();
        seq.setLoopStartMeasure(originalLoopSettingsRef.current.seqLoopStart);
        seq.setLoopEndMeasure(originalLoopSettingsRef.current.seqLoopEnd);
        seq.setIsLoopRegionActive(originalLoopSettingsRef.current.seqLoopActive);
        seq.setIsLooping(originalLoopSettingsRef.current.seqLooping);
        handleTimelineNavigate(originalLoopSettingsRef.current.seqCurrentMeasure, 0);

        originalLoopSettingsRef.current = null;
      }
    };
  }, [handleTimelineNavigate]);

  // Save validated recording with crop/fade and offset compensation
  const handleValidate = async () => {
    if (!audioBuffer) return;
    setLoading(true);

    // Make sure preview is stopped
    if (isPlayingPreview) handleTogglePreview();

    console.log(`ðï¸ [VOCAL DEBUG] Processing destructive rendering. Trim Range: [${trimStartMs}ms - ${trimEndMs}ms]`);

    try {
      const sampleRate = audioBuffer.sampleRate;
      const startOffsetSec = trimStartMs / 1000;
      const endOffsetSec = trimEndMs / 1000;
      const durationSec = Math.max(0.1, endOffsetSec - startOffsetSec);

      // 1. Create OfflineAudioContext for rendering only the selected crop slice
      const length = Math.floor(durationSec * sampleRate);
      const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, length, sampleRate);

      // Create buffer source node
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Create gain node for fades
      const gainNode = offlineCtx.createGain();
      
      // Schedule fade-in (10ms) and fade-out (30ms) to avoid pops/clicks
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(1, 0.01); // 10ms fade-in
      gainNode.gain.setValueAtTime(1, durationSec - 0.03);
      gainNode.gain.linearRampToValueAtTime(0, durationSec); // 30ms fade-out

      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      // Start playing buffer from offset
      source.start(0, startOffsetSec, durationSec);

      // Render the audio
      const renderedBuffer = await offlineCtx.startRendering();
      console.log(`ðï¸ [VOCAL DEBUG] Offline render completed. Length: ${renderedBuffer.length} samples.`);

      // 2. Encode rendered AudioBuffer to WAV PCM 16-bit
      const wavBlob = audioBufferToWav(renderedBuffer);
      console.log(`ðï¸ [VOCAL DEBUG] Encoded WAV Blob size: ${(wavBlob.size / 1024).toFixed(1)} KB`);

      // 3. Save permanently to IndexedDB
      await vocalEngineService.saveValidatedRecording(tempRecording.patternId, wavBlob);

      // 🚨 On injecte le son en RAM et dans le cache de blobs instantanément !
      useAudioStore.getState().addVocalBuffer(tempRecording.patternId, renderedBuffer);
      useAudioStore.getState().addVocalBlob(tempRecording.patternId, wavBlob);

      // Update state in sequencer store
      useSequencerStore.getState().setTracks(
        tracks.map((t) => {
          if (t.id === voiceTrack.id) {
            return {
              ...t,
              patterns: t.patterns.map((p) => {
                if (Number(p.id) === Number(tempRecording.patternId)) {
                  return {
                    ...p,
                    vocalMode: 'micro',
                    vocalNudge: nudgeMs,
                    vocalTrimStart: trimStartMs,
                    vocalBaseBpm: bpm, // Base BPM recorded
                    vocalBpmSync: true // Sync BPM by default
                  };
                }
                return p;
              }),
            };
          }
          return t;
        })
      );

      // Disarm track
      useAudioStore.getState().setTargetPatternId(null);
      setTempRecording(null);
    } catch (err) {
      console.error('ðï¸ [VOCAL DEBUG] Error rendering and validation:', err);
      setLoading(false);
    }
  };

  // Cancel and discard recording
  const handleCancel = () => {
    // Make sure preview is stopped
    if (isPlayingPreview) handleTogglePreview();

    console.log('ðï¸ [VOCAL DEBUG] Discarding temporary recording.');
    useAudioStore.getState().setTargetPatternId(null);
    setTempRecording(null);
  };

  const bufferDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#121212]/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#ece4d0] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#1a1a1a] p-6 max-w-4xl w-full flex flex-col gap-6 font-mono rounded-sm max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3">
          <h2 className="font-cactus font-black text-2xl text-[#8b2a1a] tracking-wider uppercase flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            Ãditeur Audio Vocal
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-transparent hover:border-[#1a1a1a] transition-all cursor-pointer rounded-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          /* Loading State */
          <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#e2d8be] border-2 border-[#1a1a1a] rounded-sm">
            <div className="w-10 h-10 border-4 border-[#8b2a1a] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-[#8b2a1a]">Rendu / DÃ©codage en cours...</p>
          </div>
        ) : (
          /* Workspace Editor */
          <div className="flex flex-col gap-6">
            
            {/* Timeline & Waveform Panel */}
            <div className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden min-h-[220px]">
              
              {/* Target Notes Timeline Ruler */}
              <div className="h-12 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  
                  {/* Pre-roll region Label */}
                  <div 
                    style={{ width: `${preRollDurationSec * PIXELS_PER_SECOND}px` }} 
                    className="h-full bg-[#2a5d4e]/10 border-r border-[#2a5d4e] flex items-center justify-center text-[10px] font-bold text-[#2a5d4e] shrink-0 uppercase tracking-widest"
                  >
                    Pre-roll
                  </div>

                  {/* Notes mapping aligned with phrase note start */}
                  <div className="relative h-full flex-grow">
                    {targetPattern.activeSteps.map((active, stepIdx) => {
                      if (!active) return null;
                      const noteName = targetPattern.notes[stepIdx] || 'Voix';
                      const lyric = targetPattern.lyrics[stepIdx] || '';
                      
                      const timeInAudio = preRollDurationSec + (stepIdx * stepDurationSec);
                      const left = timeInAudio * PIXELS_PER_SECOND;
                      const width = stepDurationSec * PIXELS_PER_SECOND;

                      return (
                        <div
                          key={`note-step-${stepIdx}`}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                          }}
                          className="absolute top-1 bottom-1 bg-[#2a5d4e] text-[#fdfaf2] border border-[#1a1a1a] rounded-sm flex flex-col justify-center px-1 overflow-hidden shadow-[1px_1px_0px_#1a1a1a] pointer-events-none"
                        >
                          <span className="text-[9px] font-black leading-none truncate uppercase">{noteName}</span>
                          {lyric && <span className="text-[8px] leading-none truncate opacity-90 mt-0.5">{lyric}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Waveform container translating directly via translateX (60 FPS) */}
              <div 
                ref={waveformContainerRef}
                style={{ transform: `translateX(${(nudgeMs / 1000) * PIXELS_PER_SECOND}px)` }}
                className="relative h-32 w-full transition-transform duration-75 will-change-transform"
              >
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 bottom-0 left-0 h-full w-full pointer-events-none" 
                  height={128}
                />
              </div>

              {/* Fixed timeline target alignment line guide */}
              <div className="absolute top-0 bottom-0 left-[100px] w-0.5 bg-[#8b2a1a]/40 border-l border-dashed border-[#8b2a1a] z-10 pointer-events-none">
                <div className="absolute top-0 left-1 px-1 py-0.5 bg-[#8b2a1a] text-[#fdfaf2] text-[8px] font-bold rounded-sm uppercase tracking-wide">
                  Cible
                </div>
              </div>
            </div>

            {/* Trim Adjuster Sliders Panel */}
            <div className="bg-[#e2d8be] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-4">
              <span className="text-sm font-bold text-[#2a5d4e] uppercase flex items-center gap-1">
                <Scissors className="w-4 h-4" />
                DÃ©limiter l'audio (Trim Start / Trim End)
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trim Start */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-[#1a1a1a]/70">
                    <span>Trim DÃ©but :</span>
                    <span className="font-mono text-[#2a5d4e]">{trimStartMs.toFixed(0)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, trimEndMs - 100)}
                    value={trimStartMs}
                    onChange={(e) => setTrimStartMs(parseFloat(e.target.value))}
                    onMouseUp={handleTrimRelease}
                    onTouchEnd={handleTrimRelease}
                    className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#2a5d4e]"
                  />
                </div>

                {/* Trim End */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-[#1a1a1a]/70">
                    <span>Trim Fin :</span>
                    <span className="font-mono text-[#8b2a1a]">{trimEndMs.toFixed(0)} ms / {bufferDurationMs.toFixed(0)} ms</span>
                  </div>
                  <input
                    type="range"
                    min={trimStartMs + 100}
                    max={bufferDurationMs}
                    value={trimEndMs}
                    onChange={(e) => setTrimEndMs(parseFloat(e.target.value))}
                    onMouseUp={handleTrimRelease}
                    onTouchEnd={handleTrimRelease}
                    className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
                  />
                </div>
              </div>
            </div>

            {/* Timing Adjuster Slider Panel */}
            <div className="bg-[#e2d8be] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-[#8b2a1a] uppercase">Ajustement Temporel (Nudge)</span>
                  <span className="text-[10px] text-[#1a1a1a]/60">Ajustez pour corriger la latence (Bluetooth / MatÃ©riel).</span>
                </div>
                
                {/* Nudge Value indicator */}
                <div className="flex items-center gap-3">
                  <span 
                    ref={nudgeValueLabelRef} 
                    className="text-lg font-black bg-[#ece4d0] px-3 py-1 border-2 border-[#1a1a1a] rounded-sm text-[#1a1a1a]"
                  >
                    {nudgeMs > 0 ? '+' : ''}{nudgeMs.toFixed(0)} ms
                  </span>
                  <button
                    onClick={handleResetNudge}
                    className="p-1.5 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-[#1a1a1a] bg-[#ece4d0] transition-colors cursor-pointer rounded-sm"
                    title="RÃ©initialiser le Nudge"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="-1000"
                max="1000"
                value={nudgeMs}
                onChange={handleSliderChange}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                className="w-full h-3 bg-[#ece4d0] rounded-lg border-2 border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
              />
            </div>

            {/* Preview and Controls Panel */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t-2 border-[#1a1a1a]/10 pt-4 select-none">
              
              {/* Preview loop play button */}
              <button
                onClick={handleTogglePreview}
                className={`px-5 py-3 border-2 border-[#1a1a1a] font-bold text-xs rounded-sm cursor-pointer shadow-[3px_3px_0px_#1a1a1a] transition-all flex items-center gap-2 ${
                  isPlayingPreview 
                    ? 'bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a] hover:text-[#ece4d0]' 
                    : 'bg-[#2a5d4e] text-[#fdfaf2] hover:bg-[#1a1a1a] hover:text-[#ece4d0]'
                }`}
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    ArrÃªter Ãcoute
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Ãcouter la SÃ©lection
                  </>
                )}
              </button>

              {/* Validation action buttons */}
              <div className="flex gap-3 w-full md:w-auto justify-end">
                <button
                  onClick={handleCancel}
                  className="px-5 py-3 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
                >
                  Rejeter la prise
                </button>
                <button
                  onClick={handleValidate}
                  className="px-5 py-3 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Valider DÃ©finitivement
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};