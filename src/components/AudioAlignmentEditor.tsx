import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Square, Save, X, RotateCcw, Scissors } from 'lucide-react';
import { Pattern, VocalClipMeta } from '../types/store.types';
import { useAudioStore } from '../stores/useAudioStore';
import { useAudio } from '../contexts/AudioContext';
import { vocalEngineService } from '../audio/vocalEngineService';

const PIXELS_PER_SECOND = 200; // Timeline scale: 200px = 1 second

interface AudioAlignmentEditorProps {
  audioBuffer: AudioBuffer;
  pattern: Pattern;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  initialOffsetStart: number;   // In seconds
  initialStartTimeDelay: number; // In seconds
  initialOffsetEnd?: number;     // In seconds
  isImported: boolean;           // True if file was imported externally
  onSave: (meta: VocalClipMeta) => void;
  onCancel: () => void;
}

export const AudioAlignmentEditor: React.FC<AudioAlignmentEditorProps> = ({
  audioBuffer,
  pattern,
  bpm,
  measureBpms,
  measureTimeSigs,
  initialOffsetStart,
  initialStartTimeDelay,
  initialOffsetEnd,
  isImported,
  onSave,
  onCancel,
}) => {
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

  const initialMeasureIdx = pattern.measureAssignments.indexOf(true) !== -1
    ? pattern.measureAssignments.indexOf(true)
    : 0;

  const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);
  const preRollDurationSec = getElapsedSeconds(initialMeasureIdx) - getElapsedSeconds(startMeasureIdx);

  // For imported files, the initial latency nudge editor state is just the offset from preRollDurationSec
  const initialNudgeFromProp = isImported
    ? (initialStartTimeDelay - preRollDurationSec) * 1000
    : initialStartTimeDelay * 1000;

  const [nudgeMs, setNudgeMs] = useState(initialNudgeFromProp);
  const [trimStartMs, setTrimStartMs] = useState(initialOffsetStart * 1000);
  const [trimEndMs, setTrimEndMs] = useState((initialOffsetEnd ?? audioBuffer.duration) * 1000);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const patternBpm = measureBpms[initialMeasureIdx] || bpm;
  const timeSig = measureTimeSigs[initialMeasureIdx] || '4/4';
  const beatsPerMeasure = parseInt(timeSig.split('/')[0]) || 4;
  const measureDurationSec = (beatsPerMeasure * 60) / patternBpm;
  const stepDurationSec = measureDurationSec / 16;

  // Total measures count for loop preview
  let patternMeasures = 0;
  for (let i = initialMeasureIdx; i < measureBpms.length; i++) {
    if (pattern.measureAssignments[i]) {
      patternMeasures++;
    } else {
      break;
    }
  }
  patternMeasures = Math.max(1, patternMeasures);
  const loopDurationSec = getElapsedSeconds(initialMeasureIdx + patternMeasures) - getElapsedSeconds(startMeasureIdx);

  // Refs for 60 FPS direct DOM mutation (Zero Render Thrashing)
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Preview local GrainPlayer reference
  const localPlayerRef = useRef<Tone.GrainPlayer | null>(null);

  // Refs for preview loop timeout and state values tracking (Zero Closures bugs)
  const previewTimeoutRef = useRef<any>(null);
  const nudgeMsRef = useRef(nudgeMs);
  const trimStartMsRef = useRef(trimStartMs);
  const trimEndMsRef = useRef(trimEndMs);

  useEffect(() => { nudgeMsRef.current = nudgeMs; }, [nudgeMs]);
  useEffect(() => { trimStartMsRef.current = trimStartMs; }, [trimStartMs]);
  useEffect(() => { trimEndMsRef.current = trimEndMs; }, [trimEndMs]);

  // Restart or update preview player in real-time (autonomously using Tone.context.currentTime)
  const handleRestartPreview = useCallback((nVal: number, tStartVal: number, tEndVal: number) => {
    if (!audioBuffer) return;

    if (localPlayerRef.current) {
      try {
        localPlayerRef.current.stop();
        localPlayerRef.current.dispose();
      } catch (_) {}
      localPlayerRef.current = null;
    }

    const startOffsetSec = tStartVal / 1000;
    const durationSec = (tEndVal - tStartVal) / 1000;

    const player = new Tone.GrainPlayer(audioBuffer);
    player.grainSize = 0.09;
    player.overlap = 0.04;
    player.volume.value = 0; // Unity gain (0 dB, NOT silent / -Infinity!)
    
    // Explicitly connect to audio output destination
    player.connect(Tone.Destination);

    // Relative trigger delay in the measure loop (aligned with pattern target note onset)
    const firstNoteOffsetSec = vocalEngineService.getPatternFirstNoteOffset(pattern, bpm);
    const delaySec = (isImported ? preRollDurationSec : firstNoteOffsetSec) + (nVal / 1000);

    let actualStartOffset = startOffsetSec;
    let actualDuration = durationSec;
    let triggerDelay = delaySec;

    // Handle negative Transport trigger times (e.g. anacrouse note or negative nudge)
    if (triggerDelay < 0) {
      const clipPastSec = -triggerDelay;
      actualStartOffset += clipPastSec;
      actualDuration = Math.max(0, actualDuration - clipPastSec);
      triggerDelay = 0;
    }

    if (actualDuration > 0) {
      const startTime = Tone.context.currentTime + triggerDelay;
      player.start(startTime, actualStartOffset, actualDuration);
      localPlayerRef.current = player;
      console.log(`🎙️ [GRAINPLAYER PREVIEW ACTIVE] state=${player.state}, volume=${player.volume.value}dB, startTime=${startTime.toFixed(3)}s, triggerDelay=${triggerDelay.toFixed(3)}s, actualStartOffset=${actualStartOffset.toFixed(3)}s, actualDuration=${actualDuration.toFixed(3)}s, bufferDuration=${audioBuffer.duration.toFixed(3)}s`);
    } else {
      console.warn(`🎙️ [GRAINPLAYER PREVIEW WARNING] actualDuration <= 0 (${actualDuration.toFixed(3)}s)`);
    }
  }, [audioBuffer, preRollDurationSec, pattern, bpm, isImported]);

  // Recursively loops the autonomous preview player
  const playLoop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    handleRestartPreview(nudgeMsRef.current, trimStartMsRef.current, trimEndMsRef.current);

    previewTimeoutRef.current = setTimeout(() => {
      playLoop();
    }, loopDurationSec * 1000);
  }, [loopDurationSec, handleRestartPreview]);

  // Cancels the current loop timeout and restarts immediately if playing
  const restartPreviewLoop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (isPlayingPreview) {
      playLoop();
    }
  }, [isPlayingPreview, playLoop]);

  // Store original loop settings to restore them
  const originalLoopSettingsRef = useRef<{
    loop: boolean;
    loopStart: any;
    loopEnd: any;
    seconds: number;
  } | null>(null);

  // Waveform left padding px to align with timeline targets
  const leftOffsetPx = isImported ? (preRollDurationSec * PIXELS_PER_SECOND) : 0;

  // Draw fixed sequencer grid on gridCanvasRef and floating vocal waveform on waveformCanvasRef
  useEffect(() => {
    if (!audioBuffer || !gridCanvasRef.current || !waveformCanvasRef.current) return;

    const gridCanvas = gridCanvasRef.current;
    const waveCanvas = waveformCanvasRef.current;
    const gridCtx = gridCanvas.getContext('2d');
    const waveCtx = waveCanvas.getContext('2d');
    if (!gridCtx || !waveCtx) return;

    const duration = audioBuffer.duration;
    const width = Math.max(duration * PIXELS_PER_SECOND, 2000);
    const height = gridCanvas.height;

    // Set canvas dimensions
    gridCanvas.width = width;
    waveCanvas.width = width;

    gridCtx.clearRect(0, 0, width, height);
    waveCtx.clearRect(0, 0, width, height);

    // =========================================================================
    // 1. DRAW FIXED SEQUENCER GRID & NOTES (gridCanvasRef - NEVER MOVES)
    // =========================================================================
    const preRollWidthPx = preRollDurationSec * PIXELS_PER_SECOND;
    gridCtx.fillStyle = 'rgba(42, 93, 78, 0.06)'; // Cactus green tint
    gridCtx.fillRect(0, 0, preRollWidthPx, height);

    // Pre-roll (anacrouse) 16 steps
    const preRollStepWidthPx = preRollWidthPx / 16;
    for (let i = 0; i < 16; i++) {
      const x = i * preRollStepWidthPx;
      gridCtx.strokeStyle = i % 4 === 0 ? 'rgba(139, 42, 26, 0.3)' : 'rgba(139, 42, 26, 0.1)';
      gridCtx.lineWidth = i % 4 === 0 ? 1.5 : 1;
      gridCtx.beginPath(); gridCtx.moveTo(x, 0); gridCtx.lineTo(x, height); gridCtx.stroke();

      if (pattern.preRollActiveSteps && pattern.preRollActiveSteps[i] && pattern.preRollActiveSteps[i] !== 0 && pattern.preRollActiveSteps[i] !== '0') {
        const noteName = (pattern.preRollNotes && pattern.preRollNotes[i]) || 'Voix';
        const lyric = (pattern.preRollLyrics && pattern.preRollLyrics[i]) || '';

        gridCtx.fillStyle = 'rgba(139, 42, 26, 0.15)';
        gridCtx.fillRect(x, 0, preRollStepWidthPx, height);

        gridCtx.strokeStyle = '#8b2a1a';
        gridCtx.lineWidth = 2;
        gridCtx.beginPath(); gridCtx.moveTo(x, 0); gridCtx.lineTo(x, height); gridCtx.stroke();

        gridCtx.fillStyle = '#8b2a1a';
        gridCtx.font = 'bold 9px monospace';
        gridCtx.fillText(noteName.toUpperCase(), x + 2, 14);
        if (lyric) {
          gridCtx.font = '8px monospace';
          gridCtx.fillText(lyric, x + 2, 26);
        }
      }
    }

    // Main measure 16 steps
    const mainStepWidthPx = stepDurationSec * PIXELS_PER_SECOND;
    for (let j = 0; j < 16; j++) {
      const x = preRollWidthPx + (j * mainStepWidthPx);
      gridCtx.strokeStyle = j % 4 === 0 ? 'rgba(26, 26, 26, 0.35)' : 'rgba(26, 26, 26, 0.12)';
      gridCtx.lineWidth = j % 4 === 0 ? 1.5 : 1;
      gridCtx.beginPath(); gridCtx.moveTo(x, 0); gridCtx.lineTo(x, height); gridCtx.stroke();

      if (j % 4 === 0) {
        gridCtx.fillStyle = 'rgba(26, 26, 26, 0.4)';
        gridCtx.font = 'bold 9px monospace';
        gridCtx.fillText(`T${(j / 4) + 1}`, x + 3, 10);
      }

      if (pattern.activeSteps && pattern.activeSteps[j] && pattern.activeSteps[j] !== 0 && pattern.activeSteps[j] !== '0') {
        const noteName = pattern.notes[j] || 'Voix';
        const lyric = pattern.lyrics[j] || '';

        gridCtx.fillStyle = 'rgba(42, 93, 78, 0.15)';
        gridCtx.fillRect(x, 0, mainStepWidthPx, height);

        gridCtx.strokeStyle = '#2a5d4e';
        gridCtx.lineWidth = 2;
        gridCtx.beginPath(); gridCtx.moveTo(x, 0); gridCtx.lineTo(x, height); gridCtx.stroke();

        gridCtx.fillStyle = '#2a5d4e';
        gridCtx.font = 'bold 9px monospace';
        gridCtx.fillText(noteName.toUpperCase(), x + 2, 14);
        if (lyric) {
          gridCtx.font = '8px monospace';
          gridCtx.fillText(lyric, x + 2, 26);
        }
      }
    }

    // Highlight Target Note Attack Line
    const firstNoteOffsetSec = vocalEngineService.getPatternFirstNoteOffset(pattern, patternBpm);
    const targetNoteXPx = (preRollDurationSec + firstNoteOffsetSec) * PIXELS_PER_SECOND;

    gridCtx.strokeStyle = '#8b2a1a';
    gridCtx.lineWidth = 2.5;
    gridCtx.setLineDash([4, 4]);
    gridCtx.beginPath();
    gridCtx.moveTo(targetNoteXPx, 0);
    gridCtx.lineTo(targetNoteXPx, height);
    gridCtx.stroke();
    gridCtx.setLineDash([]);

    // =========================================================================
    // 2. DRAW FLOATING VOCAL WAVEFORM & TRIMS (waveformCanvasRef - MOVES WITH NUDGE)
    // =========================================================================
    const waveWidth = duration * PIXELS_PER_SECOND;
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / waveWidth);
    const amp = height / 2.5;

    waveCtx.fillStyle = '#8b2a1a'; // Crimson Red
    for (let i = 0; i < waveWidth; i++) {
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
      waveCtx.fillRect(x, y, w, h);
    }

    // Trim Start & Trim End transparent overlays & borders
    waveCtx.fillStyle = 'rgba(26, 26, 26, 0.45)';
    waveCtx.fillRect(0, 0, (trimStartMs / 1000) * PIXELS_PER_SECOND, height);

    const trimEndLeft = (trimEndMs / 1000) * PIXELS_PER_SECOND;
    waveCtx.fillRect(trimEndLeft, 0, waveWidth - trimEndLeft, height);

    waveCtx.strokeStyle = '#1a1a1a';
    waveCtx.lineWidth = 2.5;
    waveCtx.beginPath();
    waveCtx.moveTo((trimStartMs / 1000) * PIXELS_PER_SECOND, 0);
    waveCtx.lineTo((trimStartMs / 1000) * PIXELS_PER_SECOND, height);
    waveCtx.moveTo(trimEndLeft, 0);
    waveCtx.lineTo(trimEndLeft, height);
    waveCtx.stroke();
  }, [audioBuffer, trimStartMs, trimEndMs, preRollDurationSec, stepDurationSec, pattern, patternBpm]);

  // Drag state (ref-only for 60 FPS performance, bypassing React renders)
  const isDraggingRef = useRef(false);
  const dragStartXPxRef = useRef(0);
  const dragStartNudgeMsRef = useRef(0);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaPx = clientX - dragStartXPxRef.current;
    
    // Scale: 200px = 1 second (1000ms), so 1px = 5ms.
    const deltaMs = deltaPx * (1000 / PIXELS_PER_SECOND);
    
    let targetNudgeMs = dragStartNudgeMsRef.current + deltaMs;
    targetNudgeMs = Math.max(-2000, Math.min(2000, targetNudgeMs));

    // Zero Render Thrashing: Mutate DOM directly
    const shiftPx = leftOffsetPx + (targetNudgeMs / 1000) * PIXELS_PER_SECOND;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.left = `${shiftPx}px`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${targetNudgeMs > 0 ? '+' : ''}${targetNudgeMs.toFixed(0)} ms`;
    }
  }, [leftOffsetPx]);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);

    if (nudgeValueLabelRef.current) {
      const text = nudgeValueLabelRef.current.textContent || '0 ms';
      const parsedVal = parseFloat(text.replace(' ms', '')) || 0;
      setNudgeMs(parsedVal);
      nudgeMsRef.current = parsedVal;
      console.log(`🎙️ [VOCAL DEBUG] Interactive drag ended. Final nudge: ${parsedVal} ms`);
      restartPreviewLoop();
    }
  }, [handleDragMove, restartPreviewLoop]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartXPxRef.current = clientX;
    dragStartNudgeMsRef.current = nudgeMs;

    if (!('touches' in e)) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${nudgeMs > 0 ? '+' : ''}${nudgeMs.toFixed(0)} ms`;
    }
  }, [nudgeMs]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const shiftPx = leftOffsetPx + (val / 1000) * PIXELS_PER_SECOND;

    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.left = `${shiftPx}px`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${val > 0 ? '+' : ''}${val.toFixed(0)} ms`;
    }
  };

  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    setNudgeMs(val);
    nudgeMsRef.current = val;
    console.log(`🎙️ [VOCAL DEBUG] Latency nudge updated: ${val} ms`);
    restartPreviewLoop();
  };

  const handleResetNudge = () => {
    setNudgeMs(0);
    nudgeMsRef.current = 0;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.left = `${leftOffsetPx}px`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = '0 ms';
    }
    restartPreviewLoop();
  };

  const handleTrimRelease = () => {
    trimStartMsRef.current = trimStartMs;
    trimEndMsRef.current = trimEndMs;
    restartPreviewLoop();
  };

  const { isPlaying, handleTogglePlay, handleStop } = useAudio();

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      // STOP PREVIEW
      setIsPlayingPreview(false);

      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      if (localPlayerRef.current) {
        try {
          localPlayerRef.current.stop();
          localPlayerRef.current.dispose();
        } catch (_) {}
        localPlayerRef.current = null;
      }
      handleStop();
      console.log('🎙️ [VOCAL ENGINE] Preview mixé arrêté.');
    } else {
      // START PREVIEW SYNCHRONISÉ (Voix + Backing Track Roda)
      if (!audioBuffer) return;
      setIsPlayingPreview(true);
      
      // Lancer simultanément le séquenceur Roda et le GrainPlayer vocal
      if (!isPlaying) {
        handleTogglePlay();
      }

      setTimeout(() => {
        playLoop();
      }, 0);
    }
  };

  // Clean preview and stop playback on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      if (localPlayerRef.current) {
        try {
          localPlayerRef.current.stop();
          localPlayerRef.current.dispose();
        } catch (_) {}
        localPlayerRef.current = null;
      }
      handleStop();
    };
  }, []);

  const handleSave = () => {
    if (isPlayingPreview) {
      handleTogglePreview();
    }
    // Calculate global startTimeDelay in timeline seconds (unified for micro and imports)
    const firstNoteOffsetSec = vocalEngineService.getPatternFirstNoteOffset(pattern, bpm);
    const finalStartTimeDelay = (isImported ? preRollDurationSec : firstNoteOffsetSec) + (nudgeMs / 1000);

    console.log(`🎙️ [VOCAL SAVE METADATA] isImported=${isImported}, firstNoteOffsetSec=${firstNoteOffsetSec.toFixed(3)}s, nudgeMs=${nudgeMs}ms, finalStartTimeDelay=${finalStartTimeDelay.toFixed(3)}s`);

    onSave({
      offsetStart: trimStartMs / 1000,
      startTimeDelay: finalStartTimeDelay,
      baseBpm: bpm,
      bpmSync: true,
      offsetEnd: trimEndMs / 1000,
    });
  };

  const bufferDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* UX Prevention Warning Banner */}
      <div className="bg-[#fef3c7] text-[#92400e] border-2 border-[#b45309] p-3 rounded-sm text-xs font-bold font-sans flex items-center justify-between gap-3 shadow-[2px_2px_0px_#b45309]">
        <span className="flex items-center gap-2">
          <span>⚠️</span>
          <span>Décalage ? Un bruit de fond a pu déclencher le micro trop tôt. Ajustez manuellement ou recommencez.</span>
        </span>
      </div>

      {/* Timeline & Waveform Panel */}
      <div 
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden min-h-[220px] cursor-ew-resize select-none"
      >
        
        {/* Target Notes Timeline Ruler */}
        <div className="h-12 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            
            {/* Pre-roll region Label & Anacrouse notes rendering */}
            <div 
              style={{ width: `${preRollDurationSec * PIXELS_PER_SECOND}px` }} 
              className="h-full bg-[#2a5d4e]/10 border-r border-[#2a5d4e] relative shrink-0 uppercase tracking-widest overflow-hidden"
            >
              <span className="absolute top-1 left-1 text-[9px] font-bold text-[#2a5d4e] opacity-60 pointer-events-none">
                Pre-roll / Anacrouse
              </span>

              {/* Render Anacrouse notes in pre-roll measure */}
              {pattern.preRollActiveSteps && pattern.preRollActiveSteps.map((active, stepIdx) => {
                if (!active || active === 0 || active === '0') return null;
                const noteName = (pattern.preRollNotes && pattern.preRollNotes[stepIdx]) || 'Voix';
                const lyric = (pattern.preRollLyrics && pattern.preRollLyrics[stepIdx]) || '';
                
                const timeInPreRoll = (stepIdx * (preRollDurationSec / 16));
                const left = timeInPreRoll * PIXELS_PER_SECOND;
                const width = (preRollDurationSec / 16) * PIXELS_PER_SECOND;

                return (
                  <div
                    key={`preroll-note-step-${stepIdx}`}
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                    }}
                    className="absolute top-1 bottom-1 bg-[#8b2a1a] text-[#fdfaf2] border border-[#1a1a1a] rounded-sm flex flex-col justify-center px-1 overflow-hidden shadow-[1px_1px_0px_#1a1a1a] pointer-events-none z-10"
                  >
                    <span className="text-[9px] font-black leading-none truncate uppercase">{noteName}</span>
                    {lyric && <span className="text-[8px] leading-none truncate opacity-90 mt-0.5">{lyric}</span>}
                  </div>
                );
              })}
            </div>

            {/* Notes mapping aligned with main pattern measure */}
            <div className="relative h-full flex-grow">
              {pattern.activeSteps.map((active, stepIdx) => {
                if (!active || active === 0 || active === '0') return null;
                const noteName = pattern.notes[stepIdx] || 'Voix';
                const lyric = pattern.lyrics[stepIdx] || '';
                
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

        {/* FIXED SEQUENCER GRID CANVAS (100% IMMOBILE) */}
        <canvas
          ref={gridCanvasRef}
          className="absolute top-12 bottom-0 left-0 h-32 w-full pointer-events-none z-0"
          height={128}
        />

        {/* Floating Waveform container translating directly with Nudge (60 FPS) */}
        <div 
          ref={waveformContainerRef}
          style={{ 
            left: `${leftOffsetPx + (nudgeMs / 1000) * PIXELS_PER_SECOND}px`
          }}
          className="absolute top-12 h-32 w-full transition-all duration-75 will-change-[left] z-10 pointer-events-none"
        >
          <canvas 
            ref={waveformCanvasRef} 
            className="absolute top-0 bottom-0 left-0 h-full w-full pointer-events-none" 
            height={128}
          />
        </div>

        {/* Fixed timeline target alignment line guide */}
        <div 
          style={{ left: `${preRollDurationSec * PIXELS_PER_SECOND}px` }}
          className="absolute top-0 bottom-0 w-0.5 bg-[#8b2a1a]/40 border-l border-dashed border-[#8b2a1a] z-20 pointer-events-none"
        >
          <div className="absolute top-0 left-1 px-1 py-0.5 bg-[#8b2a1a] text-[#fdfaf2] text-[8px] font-bold rounded-sm uppercase tracking-wide">
            Cible
          </div>
        </div>
      </div>

      {/* Trim Adjuster Sliders Panel */}
      <div className="bg-[#e2d8be] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-4">
        <span className="text-sm font-bold text-[#2a5d4e] uppercase flex items-center gap-1">
          <Scissors className="w-4 h-4" />
          Délimiter l'audio (Trim Start / Trim End)
        </span>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trim Start */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold text-[#1a1a1a]/70">
              <span>Trim Début :</span>
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
            <span className="text-[10px] text-[#1a1a1a]/60">Ajustez pour corriger la latence (Bluetooth / Matériel).</span>
          </div>
          
          {/* Nudge Value indicator */}
          <div className="flex items-center gap-3">
            <span 
              ref={nudgeValueLabelRef} 
              className="text-lg font-black bg-[#ece4d0] px-3 py-1 border-2 border-[#1a1a1a] rounded-sm text-[#1a1a1a]"
            />
            <button
              onClick={handleResetNudge}
              className="p-1.5 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-[#1a1a1a] bg-[#ece4d0] transition-colors cursor-pointer rounded-sm"
              title="Réinitialiser le Nudge"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min="-2000"
          max="2000"
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
              Arrêter Écoute
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Écouter la Sélection
            </>
          )}
        </button>

        {/* Validation action buttons */}
        <div className="flex gap-3 w-full md:w-auto justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-3 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-3 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Valider le Calage
          </button>
        </div>
      </div>

    </div>
  );
};
