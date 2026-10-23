import React, { useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../../contexts/SequencerContext';
import { instrumentsConfig } from '../../data';
import { useAoVivoGeometry } from './useAoVivoGeometry';
import { useAoVivoAnimationEngine } from './useAoVivoAnimationEngine';
import { AoVivoInstrumentRenderers } from './AoVivoInstrumentRenderers';

export const AoVivoOverlayInner: React.FC<{ activeAoVivoTrackId: string | number }> = ({ activeAoVivoTrackId }) => {
  const { isLeftHanded } = useSequencer();
  const tracks = useSequencerStore(
    useShallow((state) =>
      state.tracks.filter((t) => t.id === Number(activeAoVivoTrackId) || String(t.id) === String(activeAoVivoTrackId))
    )
  );

  const activeTrack = tracks.find(
    (t) => t.id === Number(activeAoVivoTrackId) || String(t.id) === String(activeAoVivoTrackId)
  );
  const inst = activeTrack ? instrumentsConfig[activeTrack.instrumentIdx] : undefined;

  const leftWrapperRef = useRef<HTMLDivElement>(null);
  const rightWrapperRef = useRef<HTMLDivElement>(null);
  const mineiroWrapperRef = useRef<HTMLDivElement>(null);
  const agbeWrapperRef = useRef<HTMLDivElement>(null);
  const gongueWrapperRef = useRef<HTMLDivElement>(null);
  const voiceWrapperRef = useRef<HTMLDivElement>(null);
  const leftStickRef = useRef<SVGSVGElement>(null);
  const rightStickRef = useRef<SVGSVGElement>(null);
  const mineiroStickRef = useRef<SVGSVGElement>(null);
  const agbeWholeRef = useRef<SVGGElement>(null);
  const gongueStickRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const { geometryRef } = useAoVivoGeometry(
    activeAoVivoTrackId,
    isLeftHanded,
    activeTrack,
    leftWrapperRef,
    rightWrapperRef,
    mineiroWrapperRef,
    agbeWrapperRef,
    voiceWrapperRef,
    flashRef,
    gongueWrapperRef
  );

  useAoVivoAnimationEngine(
    activeAoVivoTrackId,
    isLeftHanded,
    activeTrack,
    inst,
    geometryRef,
    leftStickRef,
    rightStickRef,
    mineiroStickRef,
    agbeWholeRef,
    gongueStickRef,
    haloRef,
    voiceWrapperRef
  );

  if (!activeTrack || !inst) return null;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none perspective-[1000px]">
      <div
        ref={flashRef}
        className="absolute pointer-events-none opacity-0 mix-blend-screen"
        style={{ transform: 'translate(-50%, -50%)', zIndex: 4 }}
      >
        <div className="w-[120px] h-[120px] sm:w-[200px] sm:h-[200px] rounded-full bg-[#fbbf24] blur-xl" />
      </div>
      <AoVivoInstrumentRenderers
        instId={inst.id}
        isLeftHanded={isLeftHanded}
        haloRef={haloRef}
        leftWrapperRef={leftWrapperRef}
        rightWrapperRef={rightWrapperRef}
        leftStickRef={leftStickRef}
        rightStickRef={rightStickRef}
        mineiroWrapperRef={mineiroWrapperRef}
        mineiroStickRef={mineiroStickRef}
        agbeWrapperRef={agbeWrapperRef}
        agbeWholeRef={agbeWholeRef}
        gongueWrapperRef={gongueWrapperRef}
        gongueStickRef={gongueStickRef}
      />
    </div>
  );
};
