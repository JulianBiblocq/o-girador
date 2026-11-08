// Composants SVG des baguettes d'Alfaia (Maçaneta, Fina et Bacalhau) avec ombres portées
import React from 'react';
import {
  AlfaiaMacanetaProfile,
  AlfaiaSecondaryStickFamily,
  CONFIG_ALFAIA_STICKS,
  getAlfaiaShadowRestTransform,
} from '../../audio/animations/alfaiaKinematics';

export interface AlfaiaStickSvgProps {
  style?: React.CSSProperties;
  className?: string;
  isLeftSide?: boolean;
  family?: AlfaiaSecondaryStickFamily;
}

function getShadowBaseStyle(): React.CSSProperties {
  return {
    transformOrigin: '50% 96px',
    opacity: +(CONFIG_ALFAIA_STICKS.shadowOpacity * 0.45).toFixed(2),
    filter: 'blur(3.5px)',
  };
}

function renderOliveStickContent(prof: AlfaiaMacanetaProfile, isShadow: boolean) {
  const sw = +prof.shaftWidth.toFixed(3);
  const ow = +prof.oliveWidth.toFixed(3);
  const ol = +prof.oliveLength.toFixed(3);
  const shaftStyle: React.CSSProperties = { transformOrigin: '50px 124px', transform: `scaleX(${sw})` };
  const oliveStyle: React.CSSProperties = { transformOrigin: '50px 96px', transform: `scale(${ow}, ${ol})` };

  if (isShadow) {
    return (
      <>
        <g style={shaftStyle}><path d="M 38 118 L 24 950 L 76 950 L 62 118 Z" fill="var(--cordel-stick-ink)" /></g>
        <g style={oliveStyle}><ellipse cx="50" cy="96" rx="28" ry="42" fill="var(--cordel-stick-ink)" /></g>
      </>
    );
  }
  return (
    <>
      <g data-stick-shaft style={shaftStyle}>
        <path
          d="M 38 118 L 24 950 L 76 950 L 62 118 Z"
          fill="var(--cordel-stick-shaft)"
          stroke="var(--cordel-stick-ink)"
          strokeWidth="3.8"
          strokeLinejoin="round"
        />
        <path
          d="M 41 155 L 57 166 M 39 210 L 59 220 M 36 270 L 62 280 M 34 335 L 64 345 M 31 395 L 69 395"
          stroke="var(--cordel-stick-shaft-grain)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
      <g data-stick-olive style={oliveStyle}>
        <ellipse
          cx="50" cy="96" rx="28" ry="42"
          fill="var(--cordel-stick-olive)"
          stroke="var(--cordel-stick-ink)"
          strokeWidth="4"
        />
        <path
          d="M 30 78 Q 50 64 70 78 M 27 96 Q 50 83 73 96 M 31 114 Q 50 103 69 114"
          fill="none"
          stroke="var(--cordel-stick-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

function renderBacalhauContent(isShadow: boolean) {
  const { shaftWidth, tipTaper } = CONFIG_ALFAIA_STICKS.bacalhau;
  const sw = +shaftWidth.toFixed(3);
  const topHalfW = Math.max(3, +(11 * tipTaper).toFixed(1));
  const midHalfW = 13;
  const xLTop = +(50 - topHalfW).toFixed(1);
  const xRTop = +(50 + topHalfW).toFixed(1);
  const xLMid = 50 - midHalfW;
  const xRMid = 50 + midHalfW;
  const baseStyle: React.CSSProperties = { transformOrigin: '50px 260px', transform: `scaleX(${sw})` };
  const tipPath = `M ${xLMid} 264 L ${xLTop} 68 A ${topHalfW} ${topHalfW} 0 0 1 ${xRTop} 68 L ${xRMid} 264 Z`;
  const lowPath = `M ${xLMid} 256 L 31 950 L 69 950 L ${xRMid} 256 Z`;

  if (isShadow) {
    return (
      <g style={baseStyle}>
        <path d={lowPath} fill="var(--cordel-stick-ink)" />
        <path d={tipPath} fill="var(--cordel-stick-ink)" />
      </g>
    );
  }
  return (
    <g data-stick-shaft style={baseStyle}>
      <path d={lowPath} fill="var(--cordel-stick-bacalhau)" stroke="var(--cordel-stick-ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M 46 280 L 44 520 M 54 310 L 56 560 M 40 390 L 60 396" stroke="var(--cordel-stick-ink)" strokeWidth="1.8" strokeLinecap="round" />
      <g data-bacalhau-tip style={{ transformOrigin: '50px 260px' }}>
        <path d={tipPath} fill="var(--cordel-stick-bacalhau)" stroke="var(--cordel-stick-ink)" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M 48 82 L 46 245 M 53 95 L 54 235 M 43 135 L 57 142 M 41 200 L 59 206" stroke="var(--cordel-stick-ink)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </g>
  );
}

export const AlfaiaMainMacanetaSvg = React.forwardRef<SVGSVGElement, AlfaiaStickSvgProps>(
  ({ style, className, isLeftSide = false }, ref) => (
    <svg ref={ref} viewBox="0 0 100 600" preserveAspectRatio="xMidYMin meet" style={{ ...style, overflow: 'visible', transformOrigin: '50% 92%' }} className={`overflow-visible ${className || ''}`}>
      <g className="stick-shadow" data-stick-shadow style={{ ...getShadowBaseStyle(), transform: getAlfaiaShadowRestTransform(isLeftSide) }}>
        {renderOliveStickContent(CONFIG_ALFAIA_STICKS.macaneta, true)}
      </g>
      <g data-stick-body>{renderOliveStickContent(CONFIG_ALFAIA_STICKS.macaneta, false)}</g>
    </svg>
  )
);

export const AlfaiaSecondaryStickSvg = React.forwardRef<SVGSVGElement, AlfaiaStickSvgProps>(
  ({ style, className, isLeftSide = true, family = 'fina' }, ref) => {
    const oliveProf = family === 'fina' ? CONFIG_ALFAIA_STICKS.fina : CONFIG_ALFAIA_STICKS.macaneta;
    return (
      <svg ref={ref} viewBox="0 0 100 600" preserveAspectRatio="xMidYMin meet" style={{ ...style, overflow: 'visible', transformOrigin: '50% 92%' }} className={`overflow-visible ${className || ''}`}>
        <g className="stick-shadow" data-stick-shadow style={{ ...getShadowBaseStyle(), transform: getAlfaiaShadowRestTransform(isLeftSide) }}>
          {family === 'bacalhau' ? renderBacalhauContent(true) : renderOliveStickContent(oliveProf, true)}
        </g>
        <g data-stick-body>
          {family === 'bacalhau' ? renderBacalhauContent(false) : renderOliveStickContent(oliveProf, false)}
        </g>
      </svg>
    );
  }
);

export const AlfaiaTwinMacanetaSvg = React.forwardRef<SVGSVGElement, AlfaiaStickSvgProps>((p, ref) => <AlfaiaSecondaryStickSvg {...p} family="macaneta" ref={ref} />);
export const AlfaiaFinaStickSvg = React.forwardRef<SVGSVGElement, AlfaiaStickSvgProps>((p, ref) => <AlfaiaSecondaryStickSvg {...p} family="fina" ref={ref} />);
export const AlfaiaBacalhauStickSvg = React.forwardRef<SVGSVGElement, AlfaiaStickSvgProps>((p, ref) => <AlfaiaSecondaryStickSvg {...p} family="bacalhau" ref={ref} />);
