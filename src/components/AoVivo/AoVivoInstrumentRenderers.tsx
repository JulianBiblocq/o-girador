import React from 'react';
import { instrumentsConfig } from '../../data';
import { getInstrumentPrimaryStrongColor } from '../../utils/colorHelpers';
import { MineiroStick } from './InstrumentGraphics';
import { CONFIG_AGBE_LAB } from '../../audio/animations/agbeKeyframes';
import { getMineiroRestTransform } from '../../audio/animations/mineiroKeyframes';
import { AgbeNetSvg } from './AgbeNetSvg';
import { AlfaiaSticksOverlay } from './AlfaiaSticksOverlay';
import { CaixaSticksOverlay } from './CaixaStickSvgs';
import { GongueStickOverlay } from './GongueStickSvg';
import { TimbalHandsOverlay } from './TimbalHandSvgs';
import { AoVivoShockwave } from './AoVivoShockwave';
import { AoVivoResolvedFamily } from './resolveAoVivoFamily';

interface AoVivoInstrumentRenderersProps {
  family: AoVivoResolvedFamily | null;
  instId: string;
  activeTrack?: any;
  isLeftHanded: boolean;
  haloRef: React.RefObject<HTMLDivElement | null>;
  leftWrapperRef: React.RefObject<HTMLDivElement | null>;
  rightWrapperRef: React.RefObject<HTMLDivElement | null>;
  leftStickRef: React.RefObject<SVGSVGElement | null>;
  rightStickRef: React.RefObject<SVGSVGElement | null>;
  mineiroWrapperRef: React.RefObject<HTMLDivElement | null>;
  mineiroStickRef: React.RefObject<SVGSVGElement | null>;
  agbeWrapperRef: React.RefObject<HTMLDivElement | null>;
  agbeWholeRef: React.RefObject<SVGGElement | null>;
  gongueWrapperRef: React.RefObject<HTMLDivElement | null>;
  gongueStickRef: React.RefObject<SVGSVGElement | null>;
}

export const AoVivoInstrumentRenderers: React.FC<AoVivoInstrumentRenderersProps> = (props) => {
  const {
    family, instId, activeTrack, isLeftHanded, haloRef,
    leftWrapperRef, rightWrapperRef, leftStickRef, rightStickRef,
    mineiroWrapperRef, mineiroStickRef, agbeWrapperRef, agbeWholeRef,
    gongueWrapperRef, gongueStickRef,
  } = props;

  const inst = activeTrack?.instrumentIdx !== undefined
    ? instrumentsConfig[activeTrack.instrumentIdx]
    : instrumentsConfig.find((i) => i.id === instId);
  const shockwaveColor = inst ? getInstrumentPrimaryStrongColor(inst, activeTrack) : 'var(--cordel-accent)';

  const renderInstrument = () => {
    switch (family) {
      case 'alfaia':
        return (
          <AlfaiaSticksOverlay
            activeTrack={activeTrack}
            isLeftHanded={isLeftHanded}
            leftWrapperRef={leftWrapperRef}
            rightWrapperRef={rightWrapperRef}
            leftStickRef={leftStickRef}
            rightStickRef={rightStickRef}
          />
        );
      case 'caixa':
      case 'tarol':
        return (
          <CaixaSticksOverlay
            instId={family === 'tarol' ? 'tarol' : instId}
            leftWrapperRef={leftWrapperRef}
            rightWrapperRef={rightWrapperRef}
            leftStickRef={leftStickRef}
            rightStickRef={rightStickRef}
          />
        );
      case 'timbal':
        return (
          <TimbalHandsOverlay
            leftWrapperRef={leftWrapperRef}
            rightWrapperRef={rightWrapperRef}
            leftStickRef={leftStickRef}
            rightStickRef={rightStickRef}
          />
        );
      case 'mineiro':
        return (
          <div
            ref={mineiroWrapperRef}
            className="absolute flex justify-center items-center pointer-events-none w-[220px] h-[48px] min-[400px]:w-[380px] min-[400px]:h-[80px] sm:w-[550px] sm:h-[120px] z-10"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <MineiroStick ref={mineiroStickRef} style={{ transform: getMineiroRestTransform() }} />
          </div>
        );
      case 'agbe':
        return (
          <div
            ref={agbeWrapperRef}
            className="absolute w-[240px] h-[240px] min-[400px]:w-[500px] min-[400px]:h-[500px] sm:w-[800px] sm:h-[800px] pointer-events-none z-10"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_20px_40px_var(--cordel-shadow-color)] opacity-90 overflow-visible">
              <g
                ref={agbeWholeRef}
                style={{ transformOrigin: `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`, transformBox: 'view-box' }}
              >
                <AgbeNetSvg />
              </g>
            </svg>
          </div>
        );
      case 'gongue':
        return (
          <GongueStickOverlay
            isLeftHanded={isLeftHanded}
            gongueWrapperRef={gongueWrapperRef}
            gongueStickRef={gongueStickRef}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <AoVivoShockwave ref={haloRef} color={shockwaveColor} />
      {renderInstrument()}
    </>
  );
};
