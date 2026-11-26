import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import {
  getAoVivoLabPreviewFamily,
  getIsAoVivoLabOpen,
  subscribeAoVivoLabOpen,
  subscribeAoVivoLabPreview,
} from '../../audio/animations/aoVivoConfigStorage';
import { setActiveMobileDrumFamily } from '../../audio/animations/aoVivoMobileStrokeConfigs';
import { useAoVivoGeometry } from './useAoVivoGeometry';
import { useAoVivoAnimationEngine } from './useAoVivoAnimationEngine';
import { AoVivoInstrumentRenderers } from './AoVivoInstrumentRenderers';
import { AoVivoSticksLabBar } from './AoVivoSticksLabBar';
import { registerAoVivoTesterRefs } from './aoVivoStrokeTester';
import { resolveActiveAoVivoContext } from './resolveAoVivoFamily';

export const AoVivoOverlayInner: React.FC<{ activeAoVivoTrackId: string | number | null }> = ({ activeAoVivoTrackId }) => {
  const { isLeftHanded } = useSequencer();
  const tracksVersion = useSequencerStore((state) => state.tracksVersion);
  const isLabOpen = useSyncExternalStore(subscribeAoVivoLabOpen, getIsAoVivoLabOpen);
  const labPreviewFamily = useSyncExternalStore(subscribeAoVivoLabPreview, getAoVivoLabPreviewFamily);

  const { resolvedTrack, family, instId, isSyntheticPreview } = useMemo(
    () => resolveActiveAoVivoContext(activeAoVivoTrackId, useSequencerStore.getState().tracks, isLabOpen ? labPreviewFamily : null),
    [activeAoVivoTrackId, tracksVersion, isLabOpen, labPreviewFamily]
  );

  useEffect(() => {
    if (family === 'caixa' || family === 'tarol') setActiveMobileDrumFamily(family);
  }, [family]);

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
    family,
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
    resolvedTrack,
    family,
    isSyntheticPreview,
    geometryRef,
    leftStickRef,
    rightStickRef,
    mineiroStickRef,
    agbeWholeRef,
    gongueStickRef,
    haloRef,
    voiceWrapperRef
  );

  if (!family || !instId) {
    return isLabOpen ? (
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <AoVivoSticksLabBar instId="alfaia" />
      </div>
    ) : null;
  }

  registerAoVivoTesterRefs({
    instId,
    activeTrack: resolvedTrack,
    isLeftHanded,
    leftStickRef,
    rightStickRef,
    gongueStickRef,
    agbeWholeRef,
    mineiroStickRef,
    haloRef,
    geometryRef,
  });

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none perspective-[1000px]">
      <AoVivoInstrumentRenderers
        family={family}
        instId={instId}
        activeTrack={resolvedTrack}
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
      <AoVivoSticksLabBar instId={instId} />
    </div>
  );
};
