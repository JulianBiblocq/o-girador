import React, { useEffect, useState } from 'react';
import { CONFIG_ALFAIA_STICKS, AlfaiaSecondaryStickFamily, getAlfaiaStickRestTransform, subscribeAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import { AlfaiaMainMacanetaSvg, AlfaiaSecondaryStickSvg } from './AlfaiaStickSvgs';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';

export function resolveAlfaiaSecondaryFamily(activeTrack: any): AlfaiaSecondaryStickFamily {
  const mode = CONFIG_ALFAIA_STICKS.leftStickMode;
  if (mode !== 'auto') return mode;
  const allTracks = useSequencerStore.getState().tracks || [];
  const alfaiaTracks = allTracks.filter((t: any) => {
    const id = instrumentsConfig[t.instrumentIdx]?.id;
    return id === 'marcante' || id === 'meiao' || id === 'repique' || (t.isLinkFolder && t.instrumentIdx === 0);
  });
  const candidates = alfaiaTracks.length > 0 ? alfaiaTracks : activeTrack ? [activeTrack] : [];
  for (const trk of candidates) {
    for (const pat of trk?.patterns || []) {
      for (const step of pat?.activeSteps || []) {
        if (step === 'I' || step === 'i') return 'bacalhau';
        if (Array.isArray(step) && step.some((s) => String(s).toUpperCase() === 'I')) return 'bacalhau';
      }
      for (const v of pat?.variations || []) {
        for (const step of v?.steps || []) {
          if (step === 'I' || step === 'i') return 'bacalhau';
          if (Array.isArray(step) && step.some((s) => String(s).toUpperCase() === 'I')) return 'bacalhau';
        }
      }
    }
  }
  return 'fina';
}

interface AlfaiaSticksOverlayProps {
  activeTrack?: any;
  isLeftHanded: boolean;
  haloRef: React.RefObject<HTMLDivElement | null>;
  leftWrapperRef: React.RefObject<HTMLDivElement | null>;
  rightWrapperRef: React.RefObject<HTMLDivElement | null>;
  leftStickRef: React.RefObject<SVGSVGElement | null>;
  rightStickRef: React.RefObject<SVGSVGElement | null>;
}

const WRAPPER_STYLE: React.CSSProperties = {
  bottom: '0px',
  width: '400px',
  transformOrigin: 'bottom center',
  perspective: '2000px',
  overflow: 'visible',
};

export const AlfaiaSticksOverlay: React.FC<AlfaiaSticksOverlayProps> = ({
  activeTrack,
  isLeftHanded,
  haloRef,
  leftWrapperRef,
  rightWrapperRef,
  leftStickRef,
  rightStickRef,
}) => {
  const [, setTick] = useState(0);
  const secondaryFamily = resolveAlfaiaSecondaryFamily(activeTrack);

  useEffect(
    () =>
      subscribeAlfaiaSticksConfig(() => {
        setTick((n) => n + 1);
        const famNow = resolveAlfaiaSecondaryFamily(activeTrack);
        [leftStickRef.current, rightStickRef.current].forEach((el, idx) => {
          if (!el) return;
          const isLeft = idx === 0;
          const fam: AlfaiaSecondaryStickFamily =
            (isLeft && isLeftHanded) || (!isLeft && !isLeftHanded) ? 'macaneta' : famNow;
          const activeAnims = el.getAnimations();
          if (activeAnims.every((a) => a.playState !== 'running')) {
            activeAnims.forEach((a) => a.cancel());
            el.style.transform = getAlfaiaStickRestTransform(isLeft, fam);
            const sh = el.querySelector('[data-stick-shadow]') as SVGGElement | null;
            if (sh) sh.getAnimations().forEach((a) => a.cancel());
            const tip = el.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
            if (tip) { tip.getAnimations().forEach((a) => a.cancel()); tip.style.transform = 'rotateZ(0deg) skewX(0deg) scaleX(1)'; }
          }
        });
      }),
    [leftStickRef, rightStickRef, activeTrack, isLeftHanded]
  );

  const renderSecondaryStick = (ref: React.RefObject<SVGSVGElement | null>, isLeftSide: boolean) => (
    <AlfaiaSecondaryStickSvg
      ref={ref}
      isLeftSide={isLeftSide}
      family={secondaryFamily}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'visible',
        transformOrigin: '50% 92%',
        transform: getAlfaiaStickRestTransform(isLeftSide, secondaryFamily),
      }}
    />
  );

  const renderMainMacaneta = (ref: React.RefObject<SVGSVGElement | null>, isLeftSide: boolean) => (
    <AlfaiaMainMacanetaSvg
      ref={ref}
      isLeftSide={isLeftSide}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'visible',
        transformOrigin: '50% 92%',
        transform: getAlfaiaStickRestTransform(isLeftSide, 'macaneta'),
      }}
    />
  );

  return (
    <>
      <div
        ref={haloRef}
        data-skin-wave
        className="absolute pointer-events-none opacity-0"
        style={{ transform: 'translate(-50%, -50%) scale(0.98)', zIndex: 5 }}
      >
        <div
          className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[6px]"
          style={{ borderColor: 'var(--cordel-bg)' }}
        />
      </div>
      <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        {isLeftHanded ? renderMainMacaneta(leftStickRef, true) : renderSecondaryStick(leftStickRef, true)}
      </div>
      <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        {isLeftHanded ? renderSecondaryStick(rightStickRef, false) : renderMainMacaneta(rightStickRef, false)}
      </div>
    </>
  );
};
