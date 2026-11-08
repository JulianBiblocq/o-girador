import React, { useEffect, useState } from 'react';
import {
  CaixaStickFamily,
  CONFIG_CAIXA_STICKS,
  getCaixaShadowRestTransform,
  getCaixaStickRestTransform,
  resolveCaixaActiveFamily,
  subscribeCaixaSticksConfig,
} from '../../audio/animations/caixaKinematics';

export interface CaixaStickSvgProps {
  style?: React.CSSProperties;
  className?: string;
  isLeftSide?: boolean;
  family?: CaixaStickFamily;
}

const ACORN_PATH =
  'M 50 50 C 68 58 76 82 72 104 C 69 118 60 123 50 123 C 40 123 31 118 28 104 C 24 82 32 58 50 50 Z';

function renderCaixaStickContent(family: CaixaStickFamily, isShadow: boolean) {
  const prof = CONFIG_CAIXA_STICKS[family];
  const sw = +prof.shaftWidth.toFixed(3);
  const nt = +prof.neckTaper.toFixed(3);
  const ow = +prof.oliveWidth.toFixed(3);
  const ol = +prof.oliveLength.toFixed(3);

  const neckHalf = Math.max(2.5, +(11 * sw * nt).toFixed(1));
  const shHalf = +(13 * sw).toFixed(1);
  const baseHalf = +(22 * sw).toFixed(1);
  const xLN = +(50 - neckHalf).toFixed(1);
  const xRN = +(50 + neckHalf).toFixed(1);
  const xLS = +(50 - shHalf).toFixed(1);
  const xRS = +(50 + shHalf).toFixed(1);
  const xLB = +(50 - baseHalf).toFixed(1);
  const xRB = +(50 + baseHalf).toFixed(1);

  const shaftPath = `M ${xLN} 114 Q ${xLS} 185 ${xLS} 265 L ${xLB} 950 L ${xRB} 950 L ${xRS} 265 Q ${xRS} 185 ${xRN} 114 Z`;
  const oliveStyle: React.CSSProperties = { transformOrigin: '50px 92px', transform: `scale(${ow}, ${ol})` };
  const oliveFill = family === 'tarol' ? 'var(--cordel-stick-tarol-olive)' : 'var(--cordel-stick-olive)';

  if (isShadow) {
    return (
      <>
        <path d={shaftPath} fill="var(--cordel-stick-ink)" />
        <g style={oliveStyle}><path d={ACORN_PATH} fill="var(--cordel-stick-ink)" /></g>
      </>
    );
  }

  return (
    <>
      <g data-stick-shaft>
        <path d={shaftPath} fill="var(--cordel-stick-shaft)" stroke="var(--cordel-stick-ink)" strokeWidth="3.6" strokeLinejoin="round" />
        <path
          d={`M ${+(50 - shHalf * 0.6).toFixed(1)} 210 L ${+(50 + shHalf * 0.5).toFixed(1)} 220 M ${+(50 - shHalf * 0.7).toFixed(1)} 285 L ${+(50 + shHalf * 0.7).toFixed(1)} 295 M ${+(50 - shHalf * 0.8).toFixed(1)} 365 L ${+(50 + shHalf * 0.8).toFixed(1)} 375`}
          stroke="var(--cordel-stick-shaft-grain)" strokeWidth="2.4" strokeLinecap="round"
        />
      </g>
      <g data-stick-olive style={oliveStyle}>
        <path d={ACORN_PATH} fill={oliveFill} stroke="var(--cordel-stick-ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 35 76 Q 50 64 65 76 M 32 92 Q 50 81 68 92 M 35 108 Q 50 99 65 108" fill="none" stroke="var(--cordel-stick-ink)" strokeWidth="2.3" strokeLinecap="round" />
      </g>
    </>
  );
}

export const CaixaStickSvg = React.forwardRef<SVGSVGElement, CaixaStickSvgProps>(
  ({ style, className, isLeftSide = false, family = 'caixa' }, ref) => (
    <svg ref={ref} viewBox="0 0 100 600" preserveAspectRatio="xMidYMin meet" style={{ ...style, overflow: 'visible', transformOrigin: '50% 92%' }} className={`overflow-visible ${className || ''}`}>
      <g
        className="stick-shadow" data-stick-shadow
        style={{ transformOrigin: '50% 92px', opacity: +(CONFIG_CAIXA_STICKS.shadowOpacity * 0.42).toFixed(2), filter: 'blur(3.5px)', transform: getCaixaShadowRestTransform(isLeftSide) }}
      >
        {renderCaixaStickContent(family, true)}
      </g>
      <g data-stick-body>{renderCaixaStickContent(family, false)}</g>
    </svg>
  )
);

interface CaixaSticksOverlayProps {
  instId: string;
  haloRef: React.RefObject<HTMLDivElement | null>;
  leftWrapperRef: React.RefObject<HTMLDivElement | null>;
  rightWrapperRef: React.RefObject<HTMLDivElement | null>;
  leftStickRef: React.RefObject<SVGSVGElement | null>;
  rightStickRef: React.RefObject<SVGSVGElement | null>;
}

const WRAPPER_STYLE: React.CSSProperties = { bottom: '0px', width: '400px', transformOrigin: 'bottom center', perspective: '2000px', overflow: 'visible' };

export const CaixaSticksOverlay: React.FC<CaixaSticksOverlayProps> = ({ instId, haloRef, leftWrapperRef, rightWrapperRef, leftStickRef, rightStickRef }) => {
  const [, setTick] = useState(0);
  const family = resolveCaixaActiveFamily(instId);

  useEffect(
    () =>
      subscribeCaixaSticksConfig(() => {
        setTick((n) => n + 1);
        const famNow = resolveCaixaActiveFamily(instId);
        [leftStickRef.current, rightStickRef.current].forEach((el, idx) => {
          if (!el) return;
          const activeAnims = el.getAnimations();
          if (activeAnims.every((a) => a.playState !== 'running')) {
            activeAnims.forEach((a) => a.cancel());
            el.style.transform = getCaixaStickRestTransform(idx === 0, famNow);
            const sh = el.querySelector('[data-stick-shadow]') as SVGGElement | null;
            if (sh) sh.getAnimations().forEach((a) => a.cancel());
          }
        });
      }),
    [instId, leftStickRef, rightStickRef]
  );

  return (
    <>
      <div ref={haloRef} data-skin-wave className="absolute pointer-events-none opacity-0" style={{ transform: 'translate(-50%, -50%) scale(0.98)', zIndex: 5 }}>
        <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[6px]" style={{ borderColor: 'var(--cordel-bg)' }} />
      </div>
      <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        <CaixaStickSvg ref={leftStickRef} isLeftSide={true} family={family} style={{ height: '100%', width: '100%', overflow: 'visible', transformOrigin: '50% 92%', transform: getCaixaStickRestTransform(true, family) }} />
      </div>
      <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        <CaixaStickSvg ref={rightStickRef} isLeftSide={false} family={family} style={{ height: '100%', width: '100%', overflow: 'visible', transformOrigin: '50% 92%', transform: getCaixaStickRestTransform(false, family) }} />
      </div>
    </>
  );
};
