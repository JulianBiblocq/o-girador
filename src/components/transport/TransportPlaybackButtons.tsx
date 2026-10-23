
import React from 'react';
import { Play, Square, SkipBack, Circle, Loader2 } from 'lucide-react';
import { TransportLoopControl } from './TransportLoopControl';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface TransportPlaybackButtonsProps {
  handleStop: () => void;
  handleTogglePlay: () => void;
  isLoading: boolean;
  isPlaying: boolean;
  isLooping: boolean;
  setIsLooping: (val: boolean) => void;
  loopMode: any;
  currentLoopIteration: number;
  isLoopBypassed: boolean;
  isLoopExitRequested: boolean;
  handleAudioRecordingToggle: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  lang: string;
}

export const TransportPlaybackButtons: React.FC<TransportPlaybackButtonsProps> = ({
  handleStop,
  handleTogglePlay,
  isLoading,
  isPlaying,
  isLooping,
  setIsLooping,
  loopMode,
  currentLoopIteration,
  isLoopBypassed,
  isLoopExitRequested,
  handleAudioRecordingToggle,
  isRecording,
  recordingSeconds,
  lang,
}) => {
  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isPracticeMode = useSequencerStore((state) => state.isPracticeMode);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0 max-xl:ml-auto xl:absolute xl:left-[calc(50%-9px)] xl:-translate-x-1/2 xl:top-1/2 xl:-translate-y-1/2">
      <button
        onClick={handleStop}
        className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors shrink-0"
        title={lang === 'pt' ? 'Voltar ao início' : 'Retour au début'}
      >
        <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          data-testid="transport-play-btn"
          onClick={handleTogglePlay}
          disabled={isLoading}
          className={`w-12 h-12 sm:w-14 sm:h-14 cordel-border cordel-button flex items-center justify-center transition-colors shrink-0 ${
            isLoading ? 'bg-gray-400 text-gray-700 cursor-wait' : isPlaying ? 'bg-[#f1c40f] text-[#1a1a1a]' : 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
          }`}
          title={isLoading ? (lang === 'pt' ? 'Carregando sons...' : 'Chargement des sons...') : isPlaying ? (lang === 'pt' ? 'Pausar' : 'Pause') : (lang === 'pt' ? 'Tocar' : 'Lecture')}
        >
          {isLoading ? <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" /> : isPlaying ? <Square className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5 sm:ml-1" fill="currentColor" />}
        </button>

        <TransportLoopControl
          isLooping={isLooping}
          setIsLooping={setIsLooping}
          isPlaying={isPlaying}
          loopMode={loopMode}
          currentLoopIteration={currentLoopIteration}
          isLoopBypassed={isLoopBypassed}
          isLoopExitRequested={isLoopExitRequested}
          lang={lang}
        />
      </div>

      {!isPracticeMode && (
        <div className="flex items-center gap-2 relative shrink-0">
          <button
            onClick={handleAudioRecordingToggle}
            className={`w-9 h-9 sm:w-10 sm:h-10 cordel-border cordel-button flex items-center justify-center transition-colors shrink-0 ${
              isRecording ? 'bg-red-600 text-white animate-pulse-red' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-red-100 hover:text-red-800'
            }`}
            title={lang === 'fr' ? "Exporter l'audio en WAV" : lang === 'pt' ? "Exportar áudio em WAV" : "Export Audio to WAV"}
          >
            <Circle className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
          </button>
          {isRecording && (
            <span className="font-mono text-red-600 dark:text-red-500 font-bold text-xs animate-pulse absolute left-11 sm:left-12 whitespace-nowrap bg-[var(--cordel-bg)] px-1.5 py-0.5 border border-red-600/30 shadow-[2px_2px_0_rgba(239,68,68,0.2)]">
              REC {formatRecordingTime(recordingSeconds)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
