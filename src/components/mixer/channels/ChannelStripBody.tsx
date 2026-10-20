import React from 'react';
import { TrackGroup } from '../../../types';
import { ChannelStripEQ } from './ChannelStripEQ';
import { ChannelStripFxPan } from './ChannelStripFxPan';
import { ChannelStripFaderSection } from './ChannelStripFaderSection';

interface ChannelStripBodyProps {
  track: TrackGroup;
  inst: any;
  lang: string;
  isPlaying: boolean;
  isActive: boolean;
  isVolActive: boolean;
  isPanActive: boolean;
  isRevActive: boolean;
  faderColor: string;
  faderTextColor: string;
  faderHandleRef: React.RefObject<HTMLDivElement | null>;
  faderTextRef: React.RefObject<HTMLSpanElement | null>;
  travelRangeRef: React.RefObject<number>;
  panKnobRef: React.RefObject<SVGGElement | null>;
  reverbGaugeRef: React.RefObject<HTMLDivElement | null>;
  reverbTextRef: React.RefObject<HTMLSpanElement | null>;
}

export const ChannelStripBody: React.FC<ChannelStripBodyProps> = ({
  track,
  inst,
  lang,
  isPlaying,
  isActive,
  isVolActive,
  isPanActive,
  isRevActive,
  faderColor,
  faderTextColor,
  faderHandleRef,
  faderTextRef,
  travelRangeRef,
  panKnobRef,
  reverbGaugeRef,
  reverbTextRef,
}) => {
  return (
    <div className="flex-1 flex flex-col p-1.5 gap-1.5 justify-start items-center w-full min-h-0 overflow-hidden">
      <ChannelStripEQ track={track} lang={lang} />
      <ChannelStripFxPan
        track={track}
        isRevActive={isRevActive}
        hasRevAuto={!!(track.measureReverbSends && track.measureReverbSends.length > 0)}
        isPanActive={isPanActive}
        hasPanAuto={!!(track.measurePans && track.measurePans.length > 0)}
        reverbGaugeRef={reverbGaugeRef}
        reverbTextRef={reverbTextRef}
        panKnobRef={panKnobRef}
      />
      <ChannelStripFaderSection
        track={track}
        inst={inst}
        isPlaying={isPlaying}
        isActive={isActive}
        isVolActive={isVolActive}
        hasVolAuto={!!(track.measureVols && track.measureVols.length > 0)}
        faderColor={faderColor}
        faderTextColor={faderTextColor}
        faderHandleRef={faderHandleRef}
        faderTextRef={faderTextRef}
        travelRangeRef={travelRangeRef}
      />
    </div>
  );
};
