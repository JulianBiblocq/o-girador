import React, { useEffect, useState } from 'react';
import { CONFIG_ALFAIA_STICKS, AlfaiaSecondaryStickFamily, getAlfaiaStickRestTransform, subscribeAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import {
  AlfaiaBacalhauStickSvg,
  AlfaiaFinaStickSvg,
  AlfaiaMainMacanetaSvg,
  AlfaiaTwinMacanetaSvg,
} from './AlfaiaStickSvgs';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import {
  collectAlfaiaTrackStepsList,
  resolveAlfaiaSecondaryStickFromSteps,
  resolvePresetAlfaiaEquipment,
} from '../../utils/alfaiaEquipmentResolver';

export function resolveAlfaiaSecondaryFamily(activeTrack: any): AlfaiaSecondaryStickFamily {
  const mode = CONFIG_ALFAIA_STICKS.leftStickMode;
  if (mode !== 'auto') return mode;
  const st = useSequencerStore.getState();
  const soloId = useTransportStore.getState().soloPatternPlayId ?? null;
  if (activeTrack && !activeTrack.isBusFolder && !activeTrack.isLinkFolder) {
    return resolveAlfaiaSecondaryStickFromSteps(
      collectAlfaiaTrackStepsList(activeTrack, st.tracks || [], st.editingTrackId, soloId)
    );
  }
  return resolvePresetAlfaiaEquipment({ tracks: st.tracks || [] })?.secondaryStick ?? 'macaneta';
}

interface AlfaiaSticksOverlayProps {
  activeTrack?: any;
  isLeftHanded: boolean;
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

const STICK_BASE_STYLE: React.CSSProperties = {
  height: '100%',
  width: '100%',
  overflow: 'visible',
  transformOrigin: '50% 92%',
};

export const AlfaiaSticksOverlay: React.FC<AlfaiaSticksOverlayProps> = ({
  activeTrack,
  isLeftHanded,
  leftWrapperRef,
  rightWrapperRef,
  leftStickRef,
  rightStickRef,
}) => {
  const [, setTick] = useState(0);
  useSequencerStore((s) => s.tracksVersion);
  useSequencerStore((s) => s.editingTrackId);
  useSequencerStore((s) => s.selectedPatternId);

  const secondaryFamily = resolveAlfaiaSecondaryFamily(activeTrack);

  useEffect(() => {
    const syncIdleRest = (famNow: AlfaiaSecondaryStickFamily) => {
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
    };
    syncIdleRest(secondaryFamily);
    return subscribeAlfaiaSticksConfig(() => {
      setTick((n) => n + 1);
      syncIdleRest(resolveAlfaiaSecondaryFamily(activeTrack));
    });
  }, [leftStickRef, rightStickRef, activeTrack, isLeftHanded, secondaryFamily]);

  const renderSecondaryStick = (ref: React.RefObject<SVGSVGElement | null>, isLeftSide: boolean) => {
    const style = { ...STICK_BASE_STYLE, transform: getAlfaiaStickRestTransform(isLeftSide, secondaryFamily) };
    if (secondaryFamily === 'bacalhau') return <AlfaiaBacalhauStickSvg ref={ref} isLeftSide={isLeftSide} style={style} />;
    if (secondaryFamily === 'fina') return <AlfaiaFinaStickSvg ref={ref} isLeftSide={isLeftSide} style={style} />;
    return <AlfaiaTwinMacanetaSvg ref={ref} isLeftSide={isLeftSide} style={style} />;
  };

  const renderMainMacaneta = (ref: React.RefObject<SVGSVGElement | null>, isLeftSide: boolean) => (
    <AlfaiaMainMacanetaSvg
      ref={ref}
      isLeftSide={isLeftSide}
      style={{ ...STICK_BASE_STYLE, transform: getAlfaiaStickRestTransform(isLeftSide, 'macaneta') }}
    />
  );

  return (
    <>
      <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        {isLeftHanded ? renderMainMacaneta(leftStickRef, true) : renderSecondaryStick(leftStickRef, true)}
      </div>
      <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        {isLeftHanded ? renderSecondaryStick(rightStickRef, false) : renderMainMacaneta(rightStickRef, false)}
      </div>
    </>
  );
};
