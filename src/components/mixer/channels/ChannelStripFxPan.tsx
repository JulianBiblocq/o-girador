import React from 'react';
import { DragNumberBox } from '../../DragNumberBox';
import { PanKnob } from '../../PanKnob';
import { reverbSends, distortionSends } from '../../../hooks/useAudioSync';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { TrackGroup } from '../../../types';

interface ChannelStripFxPanProps {
  track: TrackGroup;
  isRevActive: boolean;
  hasRevAuto: boolean;
  isPanActive: boolean;
  hasPanAuto: boolean;
  reverbGaugeRef: React.RefObject<HTMLDivElement | null>;
  reverbTextRef: React.RefObject<HTMLSpanElement | null>;
  panKnobRef: React.RefObject<SVGGElement | null>;
}

export const ChannelStripFxPan: React.FC<ChannelStripFxPanProps> = ({
  track,
  isRevActive,
  hasRevAuto,
  isPanActive,
  hasPanAuto,
  reverbGaugeRef,
  reverbTextRef,
  panKnobRef,
}) => {
  const trackId = track.id;

  const handleDistortionAudioDrag = (val: number) => {
    const node = distortionSends[trackId];
    if (node) {
      const gain = Math.max(0.00001, val / 100);
      try { node.gain.value = val === 0 ? -Infinity : 40 * Math.log10(gain); } catch (_) {}
    }
  };

  const handleReverbAudioDrag = (val: number) => {
    const node = reverbSends[trackId];
    if (node) {
      const gain = Math.max(0.00001, val / 100);
      try { node.gain.value = val === 0 ? -Infinity : 40 * Math.log10(gain); } catch (_) {}
    }
  };

  return (
    <>
      <div className="w-full flex flex-col gap-1.5 px-0.5 shrink-0">
        <DragNumberBox
          label="Dst"
          value={track.fxSends?.distortion ?? 0}
          onChange={(val) => useSequencerStore.getState().setTrackFxSend(trackId, 'distortion', val)}
          onAudioDrag={handleDistortionAudioDrag}
          fillColor="var(--disto-color)"
          className="w-full text-[8px] px-1 py-0.5 shrink"
        />
        <div className="relative w-full">
          <DragNumberBox
            label="Rev"
            value={track.fxSends?.reverb ?? track.reverbVal ?? 0}
            onChange={(val) => useSequencerStore.getState().setTrackFxSend(trackId, 'reverb', val)}
            onAudioDrag={handleReverbAudioDrag}
            disabled={isRevActive}
            gaugeRef={reverbGaugeRef}
            valueTextRef={reverbTextRef}
            fillColor="var(--reverb-color)"
            className={`w-full text-[8px] px-1 py-0.5 shrink transition-opacity ${isRevActive ? 'opacity-50 pointer-events-none' : ''}`}
          />
          {hasRevAuto && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'reverb');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                useSequencerStore.getState().bypassAllAutomations(true);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                useSequencerStore.getState().bypassAllAutomations(true);
              }}
              className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] cursor-pointer ${
                isRevActive ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220]' : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through'
              }`}
              title={isRevActive ? 'Automation Réverbe active (Clic: débrayer | Double-clic / Clic-droit: débrayer tout)' : 'Automation Réverbe débrayée (Clic: réactiver)'}
            >
              A
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center shrink-0">
        <div className="w-full border-t border-[var(--cordel-border)]/20 my-0.5 shrink-0" />
        <div className="relative flex items-center justify-center w-full">
          {hasPanAuto && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'pan');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                useSequencerStore.getState().bypassAllAutomations(true);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                useSequencerStore.getState().bypassAllAutomations(true);
              }}
              className={`absolute left-1 top-0 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] cursor-pointer ${
                isPanActive ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220]' : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through'
              }`}
              title={isPanActive ? 'Automation Pan active (Clic: débrayer | Double-clic / Clic-droit: débrayer tout)' : 'Automation Pan débrayée (Clic: réactiver)'}
            >
              A
            </button>
          )}
          <div className={`transition-opacity ${isPanActive ? 'opacity-50 pointer-events-none' : ''}`}>
            <PanKnob
              trackId={trackId}
              value={track.panVal ?? track.pan ?? 0}
              onChange={(val) => useSequencerStore.getState().setTrackPan(trackId, val)}
              label="PAN"
              showLabels={false}
              panKnobRef={panKnobRef}
            />
          </div>
        </div>
      </div>
    </>
  );
};
