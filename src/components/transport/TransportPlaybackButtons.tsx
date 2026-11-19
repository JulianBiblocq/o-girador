import React from 'react';
import { TransportLoopControl } from './TransportLoopControl';
import { CordelTransportTrio } from './CordelTransportTrio';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface TransportPlaybackButtonsProps {
  handleStop: () => void;
  handleRewind?: () => void;
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
  handleRewind,
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
  const recLabel = lang === 'fr' ? "Exporter l'audio en WAV" : 'Exportar áudio em WAV';

  return (
    <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0 max-xl:ml-auto xl:absolute xl:left-[calc(50%-9px)] xl:-translate-x-1/2 xl:top-1/2 xl:-translate-y-1/2">
      <CordelTransportTrio
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onRewind={handleRewind || handleStop}
        lang={lang}
        variant="studio"
      />

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

      {!isPracticeMode && (
        <div className="flex items-center gap-1 sm:gap-2 relative shrink-0">
          <button
            type="button"
            data-tour-id="transport-wav-export"
            onClick={handleAudioRecordingToggle}
            className={`w-7 h-8 sm:w-10 sm:h-10 cordel-border cordel-button flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isRecording
                ? 'bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] animate-pulse-red'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-status-danger)]/15 hover:text-[var(--cordel-status-danger)]'
            }`}
            title={recLabel}
            aria-label={recLabel}
          >
            <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
            </svg>
          </button>
          {isRecording && (
            <span className="font-mono text-[var(--cordel-status-danger)] font-bold text-xs animate-pulse absolute left-9 sm:left-12 whitespace-nowrap bg-[var(--cordel-bg)] px-1.5 py-0.5 border border-[var(--cordel-status-danger)] shadow-[2px_2px_0_var(--cordel-shadow-color)]">
              REC {formatRecordingTime(recordingSeconds)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
