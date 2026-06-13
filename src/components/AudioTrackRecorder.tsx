/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mic, Square, Play, Trash2, Info, Scissors } from 'lucide-react';
import * as Tone from 'tone';
import { useAudioTrackRecorder, RecorderStatus } from '../hooks/useAudioTrackRecorder';
import { AudioSlicer } from './AudioSlicer';

interface AudioTrackRecorderProps {
  patternId: number;
  bpm?: number;
  beatsPerMeasure?: number;
  onRecordingComplete?: (blob: Blob) => void;
  onStartSequencer?: () => void;
  onAudioPatternCreated: (wavBlob: Blob, durationInMeasures: number, name?: string) => void;
  className?: string;
}

// WAV Encoder Helper (PCM 16-bit Mono/Stereo WAV encoding)
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // chunk length
  setUint16(1);          // sample format (raw PCM)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2);                     // block align
  setUint16(16);                                // bits per sample

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
};

export const AudioTrackRecorder: React.FC<AudioTrackRecorderProps> = ({
  patternId,
  bpm = 120,
  beatsPerMeasure = 4,
  onRecordingComplete,
  onStartSequencer,
  onAudioPatternCreated,
  className = '',
}) => {
  const [showInfo, setShowInfo] = useState<boolean>(false);
  
  // Slicer state
  const [editingBuffer, setEditingBuffer] = useState<AudioBuffer | null>(null);

  const {
    status,
    countdown,
    elapsedSeconds,
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    deleteRecording,
    totalOffset,
  } = useAudioTrackRecorder({
    patternId,
    bpm,
    onRecordingComplete,
    onStartSequencer,
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Decode the Blob to AudioBuffer and trigger Slicer modal
  const handleStartSlicing = async () => {
    if (!recordedBlob) return;
    try {
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioCtx = Tone.getContext().rawContext as AudioContext;
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setEditingBuffer(decoded);
    } catch (err) {
      console.error("Failed to decode blob for slicing:", err);
      alert("Impossible de décoder le fichier audio pour le découpage.");
    }
  };

  // Status-specific styles & labels
  const getStatusConfig = (currentStatus: RecorderStatus) => {
    switch (currentStatus) {
      case 'arming':
        return {
          color: 'var(--cordel-wood, #8b2a1a)',
          label: 'Armement Micro (Pré-roll)...',
          indicatorClass: 'bg-amber-500 animate-blink-slow',
        };
      case 'countdown':
        return {
          color: 'var(--cordel-wood, #8b2a1a)',
          label: 'Préparez-vous...',
          indicatorClass: 'bg-amber-400 animate-blink-slow',
        };
      case 'recording':
        return {
          color: '#ef4444',
          label: 'ENREGISTREMENT EN COURS',
          indicatorClass: 'bg-red-600 animate-blink-fast',
        };
      case 'playing':
        return {
          color: '#22c55e',
          label: 'LECTURE DU TEST',
          indicatorClass: 'bg-green-500 animate-pulse',
        };
      default:
        return {
          color: 'var(--cordel-border)',
          label: recordedBlob ? 'Piste Audio Enregistrée' : 'Piste Audio Libre (Prête)',
          indicatorClass: recordedBlob ? 'bg-green-600' : 'bg-zinc-600',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div 
      className={`cordel-border p-4 rounded-md flex flex-col gap-3 w-full ${className}`}
      style={{
        backgroundColor: 'var(--cordel-bg)',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08' /%3E%3C/svg%3E\")",
        color: 'var(--cordel-text)',
      }}
    >
      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes blink-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes blink-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        .animate-blink-slow {
          animation: blink-slow 1.2s infinite ease-in-out;
        }
        .animate-blink-fast {
          animation: blink-fast 0.4s infinite ease-in-out;
        }
      `}</style>

      {/* Slicer Modal Overlay */}
      {editingBuffer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="relative max-h-full overflow-y-auto">
            <AudioSlicer
              audioBuffer={editingBuffer}
              bpm={bpm}
              beatsPerMeasure={beatsPerMeasure}
              onCancel={() => setEditingBuffer(null)}
              onConvert={(slicedBuffer, startMeasure, endMeasure, name) => {
                const wavBlob = audioBufferToWav(slicedBuffer);
                const duration = endMeasure - startMeasure;
                onAudioPatternCreated(wavBlob, duration, name);
                setEditingBuffer(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Track Title / Header */}
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/30 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3.5 h-3.5 rounded-full border border-[var(--cordel-border)]/50 ${statusConfig.indicatorClass}`} />
          <span className="font-cactus font-bold text-sm tracking-widest uppercase select-none">
            Enregistreur Piste Audio
          </span>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 hover:bg-[var(--cordel-text)]/10 rounded transition-colors text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)]"
          title="Afficher les informations"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Info Drawer */}
      {showInfo && (
        <div className="p-2.5 border border-[var(--cordel-border)]/20 border-dashed rounded bg-black/15 text-[11px] leading-relaxed text-[var(--cordel-text)]/70 flex flex-col gap-1">
          <p className="font-bold uppercase text-[var(--cordel-wood)] mb-0.5">Détails d'Armement & Calage :</p>
          <p>• <strong>Armement (1s)</strong> : Démarre silencieusement le micro pour stabiliser le flux.</p>
          <p>• <strong>Décompte (4 temps)</strong> : Progression rythmique affichée par 4 points.</p>
          <p>• <strong>Calage automatique</strong> : Un décalage (offset) de <strong>-{totalOffset.toFixed(2)}s</strong> est déduit à la lecture pour éliminer tout le silence préparatoire et caler la voix au tempo exact.</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2.5 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Discrete 4-beat countdown indicator (displayed inline, no screen blocking) */}
      {status === 'countdown' && (
        <div className="flex justify-center items-center gap-3 py-2.5 bg-black/10 rounded border border-[var(--cordel-border)]/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/50 mr-1 select-none">
            Décompte
          </span>
          {[1, 2, 3, 4].map((beatNum) => {
            const isActive = countdown >= beatNum;
            return (
              <div
                key={beatNum}
                className={`w-3.5 h-3.5 rounded-full border-2 border-[var(--cordel-border)] transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--cordel-wood, #8b2a1a)] shadow-[0_0_8px_var(--cordel-wood, #8b2a1a)] scale-110'
                    : 'bg-transparent scale-100 opacity-30'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Status Bar & Counter */}
      <div 
        className="py-3 px-4 rounded border border-[var(--cordel-border)]/15 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--cordel-text)]/50 font-bold uppercase tracking-wider">Statut</span>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-[var(--cordel-text)]/50 font-bold uppercase tracking-wider">Compteur</span>
          <span className="font-mono text-xl font-bold tracking-wider text-[var(--cordel-text)]">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Controller Buttons Area */}
      <div className="flex items-center justify-center gap-3 py-1">
        
        {/* Arming/Countdown/Recording Action Buttons */}
        {status === 'inactive' && !recordedBlob && (
          <button
            onClick={startRecording}
            className="px-6 py-2.5 bg-[var(--cordel-wood, #8b2a1a)] text-[var(--cordel-text)] font-cactus font-bold text-sm flex items-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
          >
            <Mic className="w-4 h-4" />
            Enregistrer Piste
          </button>
        )}

        {(status === 'arming' || status === 'countdown' || status === 'recording') && (
          <button
            onClick={stopRecording}
            className="px-6 py-2.5 bg-red-600 text-white font-cactus font-bold text-sm flex items-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4 fill-white" />
            Arrêter
          </button>
        )}

        {/* Playback Test & Options */}
        {status === 'playing' && (
          <button
            onClick={stopPlayback}
            className="px-6 py-2.5 bg-[var(--cordel-wood, #8b2a1a)] text-[var(--cordel-text)] font-cactus font-bold text-sm flex items-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            Arrêter Lecture
          </button>
        )}

        {status === 'inactive' && recordedBlob && (
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center gap-2 w-full justify-center">
              <button
                onClick={startPlayback}
                className="px-4 py-2.5 bg-[#f1c40f] text-[#1a1a1a] font-cactus font-bold text-sm flex items-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Lire la Prise
              </button>

              <button
                onClick={handleStartSlicing}
                className="px-4 py-2.5 bg-green-700 text-[var(--cordel-text)] font-cactus font-bold text-sm flex items-center gap-2 cordel-border-sm cordel-button rounded cursor-pointer hover:bg-green-800"
              >
                <Scissors className="w-4 h-4" />
                Découper
              </button>
            </div>

            <div className="flex items-center gap-2 w-full justify-center">
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-transparent text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 font-cactus font-bold text-xs flex items-center gap-1.5 cordel-button rounded cursor-pointer hover:bg-[var(--cordel-text)]/10"
              >
                Nouvelle Prise
              </button>

              <button
                onClick={deleteRecording}
                className="p-2 bg-red-950/20 text-red-500 border border-red-500/30 rounded cordel-button cursor-pointer hover:bg-red-950/50 transition-colors"
                title="Supprimer la piste enregistrée"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertCircle = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
