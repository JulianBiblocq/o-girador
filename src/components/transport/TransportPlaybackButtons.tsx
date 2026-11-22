import React from 'react';
import { TransportLoopControl } from './TransportLoopControl';
import { CordelTransportTrio } from './CordelTransportTrio';

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
  lang,
}) => {
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
    </div>
  );
};
