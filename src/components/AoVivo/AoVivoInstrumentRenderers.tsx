import React from 'react';
import {
  AlfaiaMacaneta,
  AlfaiaBacalhau,
  DrumStick,
  TimbalHandLeft,
  TimbalHandRight,
  GongueStick,
  MineiroStick,
} from './InstrumentGraphics';
import { CONFIG_STICKS, CONFIG_GONGUE, CONFIG_MINEIRO, CONFIG_AGBE, getTimbalRestTransform } from '../../audio/animationGenerators';
import { AgbeNetSvg } from './AgbeNetSvg';

interface AoVivoInstrumentRenderersProps {
  instId: string;
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
  const { instId, isLeftHanded, haloRef, leftWrapperRef, rightWrapperRef, leftStickRef, rightStickRef, mineiroWrapperRef, mineiroStickRef, agbeWrapperRef, agbeWholeRef, gongueWrapperRef, gongueStickRef } = props;

  const renderHalo = () => (
    <div ref={haloRef} className="absolute pointer-events-none opacity-0" style={{ transform: 'translate(-50%, -50%) scale(0.6)', zIndex: 5 }}>
      <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]" />
    </div>
  );

  switch (instId) {
    case 'marcante':
    case 'meiao':
    case 'repique':
      return (
        <>
          {renderHalo()}
          <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px' }}>
            {isLeftHanded ? (
              <AlfaiaMacaneta ref={leftStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${-CONFIG_STICKS.angles.alfaia.macaneta}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
            ) : (
              <AlfaiaBacalhau ref={leftStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.alfaia.bacalhau}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
            )}
          </div>
          <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px' }}>
            {isLeftHanded ? (
              <AlfaiaBacalhau ref={rightStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${-CONFIG_STICKS.angles.alfaia.bacalhau}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
            ) : (
              <AlfaiaMacaneta ref={rightStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.alfaia.macaneta}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
            )}
          </div>
        </>
      );

    case 'caixa':
    case 'tarol':
      return (
        <>
          {renderHalo()}
          <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px' }}>
            <DrumStick ref={leftStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.drum.left}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
          </div>
          <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px' }}>
            <DrumStick ref={rightStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.drum.right}deg) scale(${CONFIG_STICKS.rest.scale})`, transformOrigin: 'bottom center' }} />
          </div>
        </>
      );

    case 'timbal':
      return (
        <>
          {renderHalo()}
          <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '810px', transformOrigin: 'bottom center' }}>
            <TimbalHandLeft ref={leftStickRef} style={{ height: '100%', width: '100%', transformOrigin: 'bottom center', transform: getTimbalRestTransform(true) }} />
          </div>
          <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '810px', transformOrigin: 'bottom center' }}>
            <TimbalHandRight ref={rightStickRef} style={{ height: '100%', width: '100%', transformOrigin: 'bottom center', transform: getTimbalRestTransform(false) }} />
          </div>
        </>
      );

    case 'mineiro':
      return (
        <div ref={mineiroWrapperRef} className="absolute flex justify-center items-center pointer-events-none w-[220px] h-[48px] min-[400px]:w-[380px] min-[400px]:h-[80px] sm:w-[550px] sm:h-[120px] z-10" style={{ transform: 'translate(-50%, -50%)' }}>
          <MineiroStick ref={mineiroStickRef} style={{ transform: `translate3d(0, ${CONFIG_MINEIRO.backWeak.y}px, 0) scale(${CONFIG_MINEIRO.backWeak.scale}) rotateZ(${CONFIG_MINEIRO.backWeak.rotateZ}deg)` }} />
        </div>
      );

    case 'agbe':
      return (
        <div ref={agbeWrapperRef} className="absolute w-[240px] h-[240px] min-[400px]:w-[500px] min-[400px]:h-[500px] sm:w-[800px] sm:h-[800px] pointer-events-none z-10" style={{ transform: 'translate(-50%, -50%)' }}>
          <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] opacity-90 overflow-visible">
            <g ref={agbeWholeRef} style={{ transformOrigin: CONFIG_AGBE.transformOrigin }}>
              <AgbeNetSvg />
            </g>
          </svg>
        </div>
      );

    case 'gongue':
      return (
        <div ref={gongueWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px' }}>
          <GongueStick ref={gongueStickRef} style={{ height: '100%', width: '100%', transform: `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${CONFIG_GONGUE.perspective.scaleXCenter}, ${CONFIG_GONGUE.rest.scaleY})`, transformOrigin: 'bottom center' }} />
        </div>
      );

    default:
      return null;
  }
};
