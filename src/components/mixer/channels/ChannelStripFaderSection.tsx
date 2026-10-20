import React from 'react';
import { MixerVolumeFader } from '../../MixerVolumeFader';
import { VUMeter } from '../../VUMeter';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { TrackGroup } from '../../../types';

interface ChannelStripFaderSectionProps {
  track: TrackGroup;
  inst: any;
  isPlaying: boolean;
  isActive: boolean;
  isVolActive: boolean;
  hasVolAuto: boolean;
  faderColor: string;
  faderTextColor: string;
  faderHandleRef: React.RefObject<HTMLDivElement | null>;
  faderTextRef: React.RefObject<HTMLSpanElement | null>;
  travelRangeRef: React.RefObject<number>;
}

export const ChannelStripFaderSection: React.FC<ChannelStripFaderSectionProps> = ({
  track,
  inst,
  isPlaying,
  isActive,
  isVolActive,
  hasVolAuto,
  faderColor,
  faderTextColor,
  faderHandleRef,
  faderTextRef,
  travelRangeRef,
}) => {
  const trackId = track.id;

  return (
    <>
      <div className="w-full flex flex-col flex-grow min-h-[60px] overflow-hidden">
        <div className="relative flex-grow flex-1 min-h-[60px] h-auto flex justify-center gap-2 items-stretch w-full py-1 overflow-hidden">
          {hasVolAuto && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'volume');
              }}
              className={`absolute top-0.5 left-1 z-20 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] cursor-pointer ${
                isVolActive ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220]' : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through'
              }`}
              title={isVolActive ? 'Automation Volume active' : 'Automation Volume débrayée'}
            >
              A
            </button>
          )}
          <div className={`flex flex-col items-center flex-1 h-full min-w-0 transition-opacity ${isVolActive ? 'opacity-50 pointer-events-none' : ''}`}>
            <MixerVolumeFader
              trackId={trackId}
              value={track.volumeVal}
              onChange={(val) => useSequencerStore.getState().handleTrackVolumeChange(trackId, val)}
              faderColor={faderColor}
              textColor={faderTextColor}
              faderHandleRef={faderHandleRef}
              valueTextRefProp={faderTextRef}
              travelRangeRef={travelRangeRef}
            />
          </div>
          <div className="flex flex-col items-center w-5 h-full justify-center">
            <VUMeter
              trackId={trackId}
              instrumentId={inst.id}
              isPlaying={isPlaying && isActive}
              isActive={isActive}
              orientation="vertical"
              className="w-2 h-full bg-[var(--cordel-bg)] cordel-border-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 w-full justify-center shrink-0 border-t border-[var(--cordel-border)]/20 pt-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackMuteToggle(trackId); }}
          className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
            (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackSoloToggle(trackId); }}
          className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
            track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>
    </>
  );
};
