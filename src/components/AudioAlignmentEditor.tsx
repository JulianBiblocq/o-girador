/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Square, Save, X, RotateCcw, Scissors, Music } from 'lucide-react';
import { Pattern, VocalClipMeta } from '../types/store.types';
import { useAudio } from '../contexts/AudioContext';
import { extractPeaks, renderTrimmedVocalBuffer, audioBufferToWav } from '../utils/audioBufferUtils';

const PIXELS_PER_SECOND = 200; // Timeline scale: 200px = 1 second

interface AudioAlignmentEditorProps {
  audioBuffer: AudioBuffer;
  pattern: Pattern;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  preRollDurationSec: number;
  initialTrimStartSec?: number;
  initialTrimEndSec?: number;
  initialNudgeMs?: number;
  onSave: (cleanBuffer: AudioBuffer, wavBlob: Blob, meta: VocalClipMeta) => void;
  onCancel: () => void;
}

export const AudioAlignmentEditor: React.FC<AudioAlignmentEditorProps> = ({
  audioBuffer,
  pattern,
  bpm,
  measureBpms,
  measureTimeSigs,
  preRollDurationSec,
  initialTrimStartSec,
  initialTrimEndSec,
  initialNudgeMs = 0,
  onSave,
  onCancel,
}) => {
  // Initial trim and nudge states
  const defaultTrimStart = initialTrimStartSec !== undefined ? initialTrimStartSec : preRollDurationSec;
  const defaultTrimEnd = initialTrimEndSec !== undefined ? initialTrimEndSec : audioBuffer.duration;

  const [trimStartSec, setTrimStartSec] = useState(defaultTrimStart);
  const [trimEndSec, setTrimEndSec] = useState(defaultTrimEnd);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Measure and pattern durations
  const beatDurationSec = 60 / bpm;
  const patternMeasures = Math.max(
    1,
    pattern.measureAssignments.filter(Boolean).length || 1
  );
  const loopDurationSec = patternMeasures * 4 * beatDurationSec;

  // Refs for 60 FPS DOM direct mutations (Zero Render Thrashing)
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const trimOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const localPlayerRef = useRef<Tone.GrainPlayer | null>(null);
  const previewLoopTimeoutRef = useRef<any>(null);

  // Cached Peaks extracted ONCE (Zero Layout Thrashing & Waveform Persistence)
  const cachedPeaksRef = useRef<Float32Array | null>(null);

  // Refs for live state values during preview loops
  const nudgeMsRef = useRef(initialNudgeMs);
  const trimStartSecRef = useRef(trimStartSec);
  const trimEndSecRef = useRef(trimEndSec);

  useEffect(() => {
    trimStartSecRef.current = trimStartSec;
  }, [trimStartSec]);

  useEffect(() => {
    trimEndSecRef.current = trimEndSec;
  }, [trimEndSec]);

  const { isPlaying, handleTogglePlay, handleStop } = useAudio();

  // 1. One-time Peak Extraction & Canvas Waveform Render
  useEffect(() => {
    if (!audioBuffer || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = audioBuffer.duration;
    const width = Math.max(Math.ceil(duration * PIXELS_PER_SECOND), 1200);
    const height = canvas.height;

    canvas.width = width;

    // Extract peaks once if not already cached in ref
    if (!cachedPeaksRef.current) {
      cachedPeaksRef.current = extractPeaks(audioBuffer, width);
    }

    const peaks = cachedPeaksRef.current;
    const numPoints = peaks.length / 2;

    // Draw Cordel aesthetic waveform: Fond papier (#f4ecd8) & Waveform Rouge Argile (#8b2a1a)
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.fillStyle = '#8b2a1a';
    const amp = (height / 2) * 0.9;

    for (let i = 0; i < numPoints; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i;
      const y = height / 2 + min * amp;
      const h = Math.max(1.5, (max - min) * amp);
      ctx.fillRect(x, y, 1.5, h);
    }
  }, [audioBuffer]);

  // 2. Draw Trim overlay on separate trimOverlayCanvas
  useEffect(() => {
    if (!trimOverlayCanvasRef.current || !audioBuffer) return;

    const canvas = trimOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = Math.max(Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND), 1200);
    const height = canvas.height;
    canvas.width = width;

    ctx.clearRect(0, 0, width, height);

    const startPx = trimStartSec * PIXELS_PER_SECOND;
    const endPx = trimEndSec * PIXELS_PER_SECOND;

    // Dark Cordel tint for trimmed-out zones
    ctx.fillStyle = 'rgba(26, 26, 26, 0.55)';
    ctx.fillRect(0, 0, startPx, height);
    ctx.fillRect(endPx, 0, width - endPx, height);

    // Trim Start line
    ctx.strokeStyle = '#2a5d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx, height);
    ctx.stroke();

    // Trim End line
    ctx.strokeStyle = '#8b2a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx, height);
    ctx.stroke();
  }, [audioBuffer, trimStartSec, trimEndSec]);

  // 3. Pre-listen (Tone.GrainPlayer surgical preview loop)
  const stopLocalPreview = useCallback(() => {
    if (previewLoopTimeoutRef.current) {
      clearTimeout(previewLoopTimeoutRef.current);
      previewLoopTimeoutRef.current = null;
    }
    if (localPlayerRef.current) {
      try {
        localPlayerRef.current.stop();
        localPlayerRef.current.dispose();
      } catch (_) {}
      localPlayerRef.current = null;
    }
  }, []);

  const playPreviewIteration = useCallback(() => {
    stopLocalPreview();

    const tStart = trimStartSecRef.current;
    const tEnd = trimEndSecRef.current;
    const rawNudge = nudgeMsRef.current;
    const duration = Math.max(0.05, tEnd - tStart);

    const player = new Tone.GrainPlayer(audioBuffer);
    player.grainSize = 0.09;
    player.overlap = 0.04;
    player.volume.value = 0;
    player.connect(Tone.Destination);

    // Convention de signe : triggerTime = measureStartTime - anacrusisSec + nudgeSec
    const anacrusisSec = Math.max(0, preRollDurationSec - tStart);
    const scheduledTriggerDelay = -anacrusisSec + (rawNudge / 1000);

    let actualStartOffset = tStart;
    let actualPlayDelay = scheduledTriggerDelay;
    let actualDuration = duration;

    // Cas limite : si le déclenchement est avant le temps zéro de la mesure, compenser l'offset
    if (actualPlayDelay < 0) {
      const clipPastSec = -actualPlayDelay;
      actualStartOffset += clipPastSec;
      actualDuration = Math.max(0, actualDuration - clipPastSec);
      actualPlayDelay = 0;
    }

    if (actualDuration > 0) {
      const now = Tone.context.currentTime;
      player.start(now + actualPlayDelay, actualStartOffset, actualDuration);
      localPlayerRef.current = player;
    }

    // Loop
    previewLoopTimeoutRef.current = setTimeout(() => {
      playPreviewIteration();
    }, loopDurationSec * 1000);
  }, [audioBuffer, preRollDurationSec, loopDurationSec, stopLocalPreview]);

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      setIsPlayingPreview(false);
      stopLocalPreview();
      handleStop();
    } else {
      setIsPlayingPreview(true);
      if (!isPlaying) {
        handleTogglePlay();
      }
      playPreviewIteration();
    }
  };

  useEffect(() => {
    return () => {
      stopLocalPreview();
      handleStop();
    };
  }, [stopLocalPreview, handleStop]);

  // 4. Fine Nudge Slider (-300ms to +300ms) with 60 FPS DOM Manipulation (Zero Render Thrashing)
  const handleNudgeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    nudgeMsRef.current = val;

    // Zero Render Thrashing: Mutate transform and text directly
    const shiftPx = (val / 1000) * PIXELS_PER_SECOND;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${shiftPx}px, 0, 0)`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${val > 0 ? '+' : ''}${val.toFixed(0)} ms`;
    }
  };

  const handleResetNudge = () => {
    nudgeMsRef.current = 0;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = 'translate3d(0px, 0, 0)';
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = '0 ms';
    }
    const input = document.getElementById('vocal-nudge-slider') as HTMLInputElement | null;
    if (input) input.value = '0';
  };

  // 5. Validation via OfflineAudioContext with 10ms/30ms anti-pop fades
  const handleValidate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    stopLocalPreview();
    handleStop();

    try {
      const cleanBuffer = await renderTrimmedVocalBuffer(
        audioBuffer,
        trimStartSec,
        trimEndSec,
        0.010, // 10ms fade-in anti-craquement
        0.030  // 30ms fade-out anti-craquement
      );

      const wavBlob = audioBufferToWav(cleanBuffer);

      // Mathématique de l'anacrouse : dépassement à gauche du Temps 1
      const anacrusisSec = Math.max(0, preRollDurationSec - trimStartSec);
      const anacrusisBeats = anacrusisSec / beatDurationSec;

      const meta: VocalClipMeta = {
        patternId: pattern.id,
        baseBpm: bpm,
        trimStartSec,
        trimEndSec,
        nudgeMs: nudgeMsRef.current,
        anacrusisBeats,
        // Backward compatibility
        offsetStart: 0,
        startTimeDelay: nudgeMsRef.current / 1000,
        bpmSync: true,
        offsetEnd: cleanBuffer.duration,
      };

      onSave(cleanBuffer, wavBlob, meta);
    } catch (err) {
      console.error('Erreur lors du rendu du buffer vocal :', err);
      setIsProcessing(false);
    }
  };

  const bufferDuration = audioBuffer.duration;
  const temps1Px = preRollDurationSec * PIXELS_PER_SECOND;

  return (
    <div className="flex flex-col gap-5 select-none font-mono">
      {/* Visual Alignment Board */}
      <div className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden h-44 shadow-[4px_4px_0px_#1a1a1a]">
        
        {/* Fixed Header Ruler: TEMPS 1 / PREMIÈRE NOTE */}
        <div className="h-8 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative flex items-center px-2">
          <span className="text-[10px] font-bold text-[#1a1a1a]/70 uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3.5 h-3.5 text-[#8b2a1a]" />
            Zone d'alignement audio (Pattern #{pattern.id} - "{pattern.name}")
          </span>

          {/* TEMPS 1 Fixed Guide Line Badge */}
          <div
            style={{ left: `${temps1Px}px` }}
            className="absolute top-0 bottom-0 flex items-center -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="px-2 py-0.5 bg-[#8b2a1a] text-[#fdfaf2] text-[9px] font-black uppercase tracking-wider border-x border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]">
              TEMPS 1 / 1ère NOTE
            </div>
          </div>
        </div>

        {/* Scrollable Waveform Viewport */}
        <div className="relative h-36 overflow-x-auto overflow-y-hidden">
          {/* Fixed Vertical TEMPS 1 Guide Line */}
          <div
            style={{ left: `${temps1Px}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-[#8b2a1a] z-20 pointer-events-none border-l-2 border-dashed border-[#8b2a1a]"
          />

          {/* Floating Waveform Canvas Layer (Translates with Nudge via GPU transform) */}
          <div
            ref={waveformContainerRef}
            style={{ transform: `translate3d(${(initialNudgeMs / 1000) * PIXELS_PER_SECOND}px, 0, 0)` }}
            className="absolute top-0 bottom-0 left-0 will-change-transform z-0"
          >
            <canvas
              ref={waveformCanvasRef}
              className="h-full block pointer-events-none"
              height={144}
            />
          </div>

          {/* Trim Dark Shading Layer */}
          <canvas
            ref={trimOverlayCanvasRef}
            className="absolute top-0 bottom-0 left-0 h-full pointer-events-none z-10"
            height={144}
          />
        </div>
      </div>

      {/* Two Trim Sliders (Trim Start & Trim End) */}
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1a1a1a]">
          <span className="flex items-center gap-1.5 uppercase text-[#2a5d4e]">
            <Scissors className="w-4 h-4 text-[#2a5d4e]" />
            Rognage Audio (Trim Start / Trim End)
          </span>
          <span className="text-[10px] text-[#1a1a1a]/60">
            L'anacrouse respire à gauche de la ligne rouge Temps 1.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trim Start */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#2a5d4e]">Trim Début :</span>
              <span className="font-mono text-[#2a5d4e]">{trimStartSec.toFixed(3)}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, trimEndSec - 0.05)}
              step="0.005"
              value={trimStartSec}
              onChange={(e) => setTrimStartSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#2a5d4e]"
            />
          </div>

          {/* Trim End */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#8b2a1a]">Trim Fin :</span>
              <span className="font-mono text-[#8b2a1a]">
                {trimEndSec.toFixed(3)}s / {bufferDuration.toFixed(3)}s
              </span>
            </div>
            <input
              type="range"
              min={trimStartSec + 0.05}
              max={bufferDuration}
              step="0.005"
              value={trimEndSec}
              onChange={(e) => setTrimEndSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
            />
          </div>
        </div>
      </div>

      {/* Fine Nudge Slider (-300ms to +300ms) */}
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#8b2a1a] uppercase">
              Calage Fin de Latence (Nudge -300ms à +300ms)
            </span>
            <span className="text-[10px] text-[#1a1a1a]/60">
              Glissement à 60 FPS sans re-render pour caler l'attaque au millième de seconde.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              ref={nudgeValueLabelRef}
              className="text-base font-black px-3 py-0.5 bg-[#ece4d0] border-2 border-[#1a1a1a] rounded-sm text-[#1a1a1a]"
            >
              {initialNudgeMs > 0 ? `+${initialNudgeMs}` : initialNudgeMs} ms
            </span>
            <button
              onClick={handleResetNudge}
              className="p-1.5 bg-[#ece4d0] hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-[#1a1a1a] transition-colors rounded-sm cursor-pointer"
              title="Réinitialiser le Nudge à 0 ms"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <input
          id="vocal-nudge-slider"
          type="range"
          min="-300"
          max="300"
          step="1"
          defaultValue={initialNudgeMs}
          onChange={handleNudgeInput}
          className="w-full h-2.5 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
        />
      </div>

      {/* Preview and Validation Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t-2 border-[#1a1a1a]/15">
        <button
          onClick={handleTogglePreview}
          className={`px-5 py-2.5 border-2 border-[#1a1a1a] font-bold text-xs rounded-sm cursor-pointer shadow-[3px_3px_0px_#1a1a1a] transition-all flex items-center gap-2 ${
            isPlayingPreview
              ? 'bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a]'
              : 'bg-[#2a5d4e] text-[#fdfaf2] hover:bg-[#1a1a1a]'
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
              Écouter avec la Roda
            </>
          )}
        </button>

        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
          >
            {isProcessing ? (
              <span>Rendu en cours...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Valider le Sample
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
