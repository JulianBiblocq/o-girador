/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Scissors, X, Plus, Minus } from 'lucide-react';

interface AudioSlicerProps {
  audioBuffer: AudioBuffer;
  bpm: number;
  beatsPerMeasure: number; // ex: 4 pour du 4/4
  onCancel: () => void;
  onConvert: (slicedBuffer: AudioBuffer, startMeasure: number, endMeasure: number, name: string) => void;
}

export const AudioSlicer: React.FC<AudioSlicerProps> = ({
  audioBuffer,
  bpm,
  beatsPerMeasure,
  onCancel,
  onConvert,
}) => {
  const measureDuration = beatsPerMeasure * (60 / bpm);
  const offset = 4.0; // 1s arming + 3s countdown

  // 1. Calculate dynamically max measures
  const maxMeasures = Math.max(1, Math.floor((audioBuffer.duration - offset) / measureDuration));

  // 2. Local states (startMeasure default 0, endMeasure default 1)
  const [startMeasure, setStartMeasure] = useState<number>(0);
  const [endMeasure, setEndMeasure] = useState<number>(Math.min(maxMeasures, 1));
  const [recordingName, setRecordingName] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Bounds checking helper
  const handleStartChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, endMeasure - 1));
    setStartMeasure(clamped);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.max(startMeasure + 1, Math.min(val, maxMeasures));
    setEndMeasure(clamped);
  };

  // Render Waveform, Selection Grid & Dimmed Out-of-Bounds Areas
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const durationInSecs = audioBuffer.duration;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Get raw data (channel 0)
    const rawData = audioBuffer.getChannelData(0);
    const step = Math.ceil(rawData.length / width);
    const amp = height / 2;

    // Draw Waveform background
    ctx.fillStyle = 'var(--cordel-bg, #1a1a1a)';
    ctx.fillRect(0, 0, width, height);

    // Fetch theme color (--cordel-wood) dynamically
    const rootStyle = getComputedStyle(document.documentElement);
    const woodColor = rootStyle.getPropertyValue('--cordel-wood').trim() || '#8b2a1a';
    const textColor = rootStyle.getPropertyValue('--cordel-text').trim() || '#f4ecd8';

    // Draw waveform peaks in var(--cordel-wood)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = woodColor;
    ctx.beginPath();
    ctx.moveTo(0, amp);

    for (let i = 0; i < width; i++) {
      const index = i * step;
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const dat = rawData[index + j];
        if (dat < min) min = dat;
        if (dat > max) max = dat;
      }
      ctx.lineTo(i, amp + min * amp);
      ctx.lineTo(i, amp + max * amp);
    }
    ctx.stroke();

    // Draw beats (subtle dotted lines)
    ctx.strokeStyle = 'rgba(244, 236, 216, 0.1)';
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;

    let beatTime = offset;
    const beatDuration = 60 / bpm;
    while (beatTime < durationInSecs) {
      const x = (beatTime / durationInSecs) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      beatTime += beatDuration;
    }

    // Draw measures (solid lines)
    ctx.strokeStyle = 'rgba(244, 236, 216, 0.25)';
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(244, 236, 216, 0.45)';
    ctx.font = '10px Cactus, Georgia, serif';

    let mIdx = 0;
    let measureTime = offset;
    while (measureTime < durationInSecs) {
      const x = (measureTime / durationInSecs) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Label measure numbers
      ctx.fillText(`M${mIdx + 1}`, x + 4, 12);
      
      mIdx++;
      measureTime += measureDuration;
    }

    // Calculate selection coordinates
    const selectionStartSec = offset + (startMeasure * measureDuration);
    const selectionEndSec = offset + (endMeasure * measureDuration);

    const xStart = (selectionStartSec / durationInSecs) * width;
    const xEnd = (selectionEndSec / durationInSecs) * width;

    // Grise/Assombrit les zones en dehors de la sélection [startMeasure, endMeasure]
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; // Darkened overlay
    
    // Left unselected zone
    ctx.fillRect(0, 0, xStart, height);
    
    // Right unselected zone
    ctx.fillRect(xEnd, 0, width - xEnd, height);

    // Outline selected zone
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xStart, 0);
    ctx.lineTo(xStart, height);
    ctx.moveTo(xEnd, 0);
    ctx.lineTo(xEnd, height);
    ctx.stroke();

  }, [audioBuffer, startMeasure, endMeasure, bpm, measureDuration, offset]);

  // sliceAudioBuffer using Float32Array subarray for sample-accurate copies
  const handleSliceAndConvert = () => {
    try {
      const sampleRate = audioBuffer.sampleRate;
      const numChannels = audioBuffer.numberOfChannels;

      const startTime = offset + (startMeasure * measureDuration);
      const endTime = offset + (endMeasure * measureDuration);

      const startSample = Math.max(0, Math.round(startTime * sampleRate));
      const endSample = Math.min(audioBuffer.length, Math.round(endTime * sampleRate));
      const sliceLength = endSample - startSample;

      if (sliceLength <= 0) {
        alert("La sélection de découpage est vide ou hors limites.");
        return;
      }

      // Slice the audio buffer mathematically
      const audioCtx = Tone.getContext().rawContext as AudioContext;
      const slicedBuffer = audioCtx.createBuffer(numChannels, sliceLength, sampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const slicedData = slicedBuffer.getChannelData(channel);
        
        // Exact copy using Float32Array subarray
        slicedData.set(originalData.subarray(startSample, endSample));
      }

      // Trigger callback with sliced buffer
      onConvert(slicedBuffer, startMeasure, endMeasure, recordingName.trim());
    } catch (err: any) {
      console.error("Failed to slice audio buffer:", err);
      alert("Erreur de découpage : " + err.message);
    }
  };

  const selectedDurationMeasures = endMeasure - startMeasure;

  return (
    <div 
      className="cordel-border p-6 rounded-md flex flex-col gap-5 max-w-xl w-full mx-auto"
      style={{
        backgroundColor: 'var(--cordel-bg)',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08' /%3E%3C/svg%3E\")",
        color: 'var(--cordel-text)',
        borderWidth: '4px', // Épaisseurs de bordures cordel
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-[var(--cordel-wood)]" />
          <h3 className="font-cactus font-bold text-base tracking-widest uppercase select-none">
            Éditeur d'Échantillons (Slicer)
          </h3>
        </div>
      </div>

      {/* Waveform Canvas Area */}
      <div className="relative border-4 border-[var(--cordel-border)] rounded-sm overflow-hidden" style={{ backgroundColor: 'var(--cordel-bg)' }}>
        <canvas 
          ref={canvasRef} 
          width={560} 
          height={140} 
          className="w-full h-[140px] block cursor-crosshair" 
        />
      </div>

      {/* Numerical +/- and manual inputs controls */}
      <div className="grid grid-cols-2 gap-4 bg-black/15 p-4 rounded border border-[var(--cordel-border)]/15">
        
        {/* Start Measure selector */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
            Début (Mesure)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleStartChange(startMeasure - 1)}
              disabled={startMeasure <= 0}
              className="w-8 h-8 flex items-center justify-center border border-[var(--cordel-border)]/40 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={endMeasure}
              value={startMeasure + 1}
              onChange={(e) => handleStartChange(parseInt(e.target.value, 10) - 1)}
              className="w-12 h-8 text-center bg-black/25 border border-[var(--cordel-border)]/35 text-sm font-mono font-bold rounded outline-none"
            />
            <button
              onClick={() => handleStartChange(startMeasure + 1)}
              disabled={startMeasure >= endMeasure - 1}
              className="w-8 h-8 flex items-center justify-center border border-[var(--cordel-border)]/40 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* End Measure selector */}
        <div className="flex flex-col gap-2 items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
            Fin (Mesure)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEndChange(endMeasure - 1)}
              disabled={endMeasure <= startMeasure + 1}
              className="w-8 h-8 flex items-center justify-center border border-[var(--cordel-border)]/40 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={startMeasure + 2}
              max={maxMeasures}
              value={endMeasure}
              onChange={(e) => handleEndChange(parseInt(e.target.value, 10))}
              className="w-12 h-8 text-center bg-black/25 border border-[var(--cordel-border)]/35 text-sm font-mono font-bold rounded outline-none"
            />
            <button
              onClick={() => handleEndChange(endMeasure + 1)}
              disabled={endMeasure >= maxMeasures}
              className="w-8 h-8 flex items-center justify-center border border-[var(--cordel-border)]/40 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Name Input */}
      <div className="flex flex-col gap-2 bg-black/15 p-4 rounded border border-[var(--cordel-border)]/15">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
          Nom de l'enregistrement / Pattern
        </span>
        <input
          type="text"
          placeholder="ex: Refrain voix, Intro, Solo..."
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-sm p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
      </div>

      {/* Info duration summary */}
      <div className="text-sm border-b border-[var(--cordel-border)]/15 pb-2.5 flex justify-between select-none">
        <span className="text-[var(--cordel-text)]/60">Durée sélectionnée :</span>
        <span className="font-cactus font-bold text-[var(--cordel-wood)] tracking-wider">
          Sélection : {selectedDurationMeasures} {selectedDurationMeasures > 1 ? 'mesures' : 'mesure'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={handleSliceAndConvert}
          className="flex-grow py-3 bg-[#f1c40f] text-[#1a1a1a] font-cactus font-bold text-sm flex items-center justify-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer"
        >
          <Scissors className="w-4 h-4 fill-current" />
          Convertir en Pattern
        </button>
        
        <button
          onClick={onCancel}
          className="px-5 py-3 bg-transparent text-[var(--cordel-text)] border border-[var(--cordel-border)]/45 font-cactus font-bold text-xs flex items-center justify-center gap-1.5 cordel-button rounded cursor-pointer hover:bg-[var(--cordel-text)]/10"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  );
};
