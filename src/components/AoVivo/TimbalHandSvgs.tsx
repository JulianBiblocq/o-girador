import React, { useEffect, useState } from 'react';
import { CONFIG_TIMBAL_HANDS, getTimbalHandRestTransform, getTimbalShadowRestTransform, subscribeTimbalHandsConfig } from '../../audio/animations/timbalKinematics';

export interface TimbalHandSvgProps { side: 'left' | 'right'; style?: React.CSSProperties; className?: string; }

const FINGERS = [
  { mult: -1.4, ox: 64, oy: 154, d: 'M 55 156 L 52 82 Q 52 67 63 67 Q 74 67 74 82 L 75 154 Z', j: 'M 55 96 L 71 96 M 55 101 L 71 101 M 55 126 L 72 126 M 55 131 L 72 131' },
  { mult: -0.45, ox: 88, oy: 148, d: 'M 76 152 L 75 56 Q 75 41 87 41 Q 99 41 99 56 L 99 149 Z', j: 'M 78 74 L 96 74 M 78 79 L 96 79 M 78 112 L 96 112 M 78 117 L 96 117' },
  { mult: 0.45, ox: 112, oy: 148, d: 'M 100 149 L 101 44 Q 101 28 113 28 Q 125 28 125 44 L 124 151 Z', j: 'M 103 65 L 122 65 M 103 70 L 122 70 M 103 106 L 122 106 M 103 111 L 122 111' },
  { mult: 1.4, ox: 136, oy: 154, d: 'M 125 152 L 127 60 Q 127 45 139 45 Q 150 45 150 60 L 147 156 Z', j: 'M 129 80 L 147 80 M 129 85 L 147 85 M 128 116 L 146 116 M 128 121 L 146 121' },
];

const PALM_PATH = 'M 54 152 L 147 152 L 154 202 L 138 256 L 64 256 L 48 202 Z';
const THUMB_PATH = 'M 140 232 L 160 198 L 178 152 Q 184 137 171 131 Q 158 126 150 142 L 134 182 L 130 218 Z';
const FOREARM_PATH = 'M 64 250 L 22 2200 L 178 2200 L 138 250 Z';

export function applyTimbalSlapBiomechanics(handEl: SVGSVGElement | null, isSlap: boolean): void {
  if (!handEl) return;
  const { anatomy, strokes } = CONFIG_TIMBAL_HANDS;
  const lift = isSlap ? strokes.slapThumbLift : 0;
  const splay = isSlap ? strokes.slapFingerSplayDeg : 0;
  const pw = +anatomy.palmWidth.toFixed(3), pl = +anatomy.palmLength.toFixed(3);
  const palmEl = handEl.querySelector('[data-hand-palm]') as SVGGElement | null;
  if (palmEl) palmEl.style.transform = `scale(${pw}, ${pl}) skewY(${+(-lift * 14).toFixed(2)}deg)`;
  const thumbEl = handEl.querySelector('[data-hand-thumb]') as SVGGElement | null;
  if (thumbEl) {
    const scT = +(1 + lift * 0.38).toFixed(3);
    const dyT = +(-lift * 26).toFixed(1);
    const rotT = +(anatomy.thumbSpreadDeg + lift * 14).toFixed(1);
    thumbEl.style.transform = `translateY(${dyT}px) scale(${scT}) rotate(${rotT}deg)`;
  }
  handEl.querySelectorAll<SVGGElement>('[data-finger-mult]').forEach((fEl) => {
    fEl.getAnimations().forEach((a) => a.cancel());
    const mult = Number(fEl.getAttribute('data-finger-mult') || 0);
    const deg = +(mult * splay).toFixed(2);
    const dy = +(-mult * lift * 11).toFixed(1);
    fEl.style.transform = `translateY(${dy}px) rotate(${deg}deg)`;
  });
}

function renderTimbalHandContent(side: 'left' | 'right', isShadow: boolean) {
  const { posePreview, anatomy, strokes } = CONFIG_TIMBAL_HANDS;
  const isSlap = posePreview === 'slap';
  const lift = isSlap ? strokes.slapThumbLift : 0;
  const splay = isSlap ? strokes.slapFingerSplayDeg : 0;
  const fw = +anatomy.forearmWidth.toFixed(3), pw = +anatomy.palmWidth.toFixed(3), pl = +anatomy.palmLength.toFixed(3);
  const fl = +anatomy.fingerLength.toFixed(3), fwi = +anatomy.fingerWidth.toFixed(3);
  const mirrorTransform = side === 'right' ? 'translate(200, 0) scale(-1, 1)' : undefined;

  const forearmStyle: React.CSSProperties = { transformOrigin: '100px 254px', transform: `scaleX(${fw})` };
  const palmStyle: React.CSSProperties = { transformOrigin: '100px 252px', transform: `scale(${pw}, ${pl}) skewY(${+(-lift * 14).toFixed(2)}deg)` };
  const thumbStyle: React.CSSProperties = { transformOrigin: '138px 222px', transform: `translateY(${+(-lift * 26).toFixed(1)}px) scale(${+(1 + lift * 0.38).toFixed(3)}) rotate(${+(anatomy.thumbSpreadDeg + lift * 14).toFixed(1)}deg)` };
  const fingersStyle: React.CSSProperties = { transformOrigin: '100px 152px', transform: `scale(${fwi}, ${fl})` };

  if (isShadow) {
    return (
      <g transform={mirrorTransform}>
        <g style={forearmStyle}><path d={FOREARM_PATH} fill="var(--cordel-stick-ink)" /></g>
        <g style={palmStyle}>
          <path d={PALM_PATH} fill="var(--cordel-stick-ink)" />
          <g style={thumbStyle}><path d={THUMB_PATH} fill="var(--cordel-stick-ink)" /></g>
          <g style={fingersStyle}>
            {FINGERS.map((f, i) => <path key={i} d={f.d} fill="var(--cordel-stick-ink)" style={{ transformOrigin: `${f.ox}px ${f.oy}px`, transform: `translateY(${+(-f.mult * lift * 11).toFixed(1)}px) rotate(${+(f.mult * splay).toFixed(2)}deg)` }} />)}
          </g>
        </g>
      </g>
    );
  }

  return (
    <g transform={mirrorTransform}>
      <g data-hand-forearm style={forearmStyle}>
        <path d={FOREARM_PATH} fill="var(--cordel-stick-shaft)" stroke="var(--cordel-stick-ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 74 285 L 126 296 M 70 350 L 130 362 M 66 425 L 134 438 M 62 510 L 138 522" stroke="var(--cordel-stick-shaft-grain)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g data-hand-palm style={palmStyle}>
        <g data-hand-fingers style={fingersStyle}>
          {FINGERS.map((f, i) => (
            <g key={i} data-finger-mult={f.mult} style={{ transformOrigin: `${f.ox}px ${f.oy}px`, transform: `translateY(${+(-f.mult * lift * 11).toFixed(1)}px) rotate(${+(f.mult * splay).toFixed(2)}deg)` }}>
              <path d={f.d} fill="var(--cordel-stick-olive)" stroke="var(--cordel-stick-ink)" strokeWidth="3.8" strokeLinejoin="round" />
              <path d={f.j} stroke="var(--cordel-stick-ink)" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          ))}
        </g>
        <g data-hand-thumb style={thumbStyle}>
          <path d={THUMB_PATH} fill="var(--cordel-stick-tarol-olive)" stroke="var(--cordel-stick-ink)" strokeWidth="3.8" strokeLinejoin="round" />
          <path d="M 150 165 L 166 173 M 143 190 L 159 198" stroke="var(--cordel-stick-ink)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <path d={PALM_PATH} fill="var(--cordel-stick-olive)" stroke="var(--cordel-stick-ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 74 166 L 78 232 M 101 164 L 101 236 M 128 166 L 122 232 M 72 245 Q 101 237 130 245" fill="none" stroke="var(--cordel-stick-ink)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

export const TimbalHandSvg = React.forwardRef<SVGSVGElement, TimbalHandSvgProps>(({ side, style, className }, ref) => (
  <svg ref={ref} viewBox="0 0 200 650" preserveAspectRatio="xMidYMin meet" style={{ ...style, overflow: 'visible', transformOrigin: '50% 88%' }} className={`overflow-visible ${className || ''}`}>
    <g data-hand-shadow style={{ transformOrigin: '100px 180px', opacity: +(CONFIG_TIMBAL_HANDS.shadowOpacity * 0.45).toFixed(2), filter: 'blur(4px)', transform: getTimbalShadowRestTransform(side === 'left') }}>
      {renderTimbalHandContent(side, true)}
    </g>
    <g data-hand-body>{renderTimbalHandContent(side, false)}</g>
  </svg>
));

const WRAPPER_STYLE: React.CSSProperties = { bottom: '0px', width: '440px', transformOrigin: 'bottom center', perspective: '2000px', overflow: 'visible' };

export const TimbalHandsOverlay: React.FC<{
  haloRef: React.RefObject<HTMLDivElement | null>; leftWrapperRef: React.RefObject<HTMLDivElement | null>;
  rightWrapperRef: React.RefObject<HTMLDivElement | null>; leftStickRef: React.RefObject<SVGSVGElement | null>; rightStickRef: React.RefObject<SVGSVGElement | null>;
}> = ({ haloRef, leftWrapperRef, rightWrapperRef, leftStickRef, rightStickRef }) => {
  const [, setTick] = useState(0);
  useEffect(() => subscribeTimbalHandsConfig(() => {
    setTick((n) => n + 1);
    [leftStickRef.current, rightStickRef.current].forEach((el, idx) => {
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.transform = getTimbalHandRestTransform(idx === 0);
      applyTimbalSlapBiomechanics(el, CONFIG_TIMBAL_HANDS.posePreview === 'slap');
    });
  }), [leftStickRef, rightStickRef]);

  return (
    <>
      <div ref={haloRef} data-skin-wave className="absolute pointer-events-none opacity-0" style={{ transform: 'translate(-50%, -50%) scale(0.98)', zIndex: 5 }}>
        <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[6px]" style={{ borderColor: 'var(--cordel-bg)' }} />
      </div>
      <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        <TimbalHandSvg ref={leftStickRef} side="left" style={{ height: '100%', width: '100%', overflow: 'visible', transformOrigin: '50% 88%', transform: getTimbalHandRestTransform(true) }} />
      </div>
      <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10 overflow-visible" style={WRAPPER_STYLE}>
        <TimbalHandSvg ref={rightStickRef} side="right" style={{ height: '100%', width: '100%', overflow: 'visible', transformOrigin: '50% 88%', transform: getTimbalHandRestTransform(false) }} />
      </div>
    </>
  );
};
