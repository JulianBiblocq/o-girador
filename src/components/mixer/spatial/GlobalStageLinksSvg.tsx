/**
 * GlobalStageLinksSvg.tsx — Fond polaire 140°, graduations G/E-C-D et fils de liaison SVG Maître ↔ Esclaves (< 115 lignes).
 */
import React from 'react';
import { getLeftPanPrefix } from '../../controls/panKnobMath';
import { CONE_MAX_RAD, CONE_MIN_RAD } from '../../wizard/wizardStageGeometry';
import {
  dbToStageRadiusNorm,
  panValToStageThetaRad,
  STAGE_ZERO_DB_RADIUS_NORM,
} from '../../../utils/stagePlaceBidirectionalMath';
import type { GlobalStagePawnItem } from './globalStagePawnModel';

export interface VisualStagePawn extends GlobalStagePawnItem {
  visualX: number;
  visualY: number;
}

interface GlobalStageLinksSvgProps {
  visualPawns: readonly VisualStagePawn[];
  activeId: string | null;
  widthPx: number;
  heightPx: number;
  lang: string;
}

const DB_ARCS = [6, 0, -6, -12, -18] as const;
const ANGLE_TICKS = [-100, -50, 0, 50, 100] as const;

export const GlobalStageLinksSvg: React.FC<GlobalStageLinksSvgProps> = ({
  visualPawns,
  activeId,
  widthPx: W,
  heightPx: H,
  lang,
}) => {
  const coneLen = Math.max(W, H) * 1.35;
  const leftPrefix = getLeftPanPrefix(lang);
  const byId = new Map<string, VisualStagePawn>();
  for (let i = 0; i < visualPawns.length; i++) byId.set(visualPawns[i].id, visualPawns[i]);

  const activePawn = activeId ? byId.get(activeId) : undefined;
  const activeAnchorId = activePawn ? (activePawn.linkAnchorPawnId || activePawn.id) : null;
  const labelArcR = H * 0.93;

  return (
    <svg className="absolute inset-0 pointer-events-none text-[var(--cordel-text)]" width={W} height={H}>
      <line x1={W / 2} y1={H} x2={W / 2} y2={0} stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.22" strokeDasharray="4 4" />
      <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MAX_RAD)} y2={H - coneLen * Math.sin(CONE_MAX_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.36" />
      <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MIN_RAD)} y2={H - coneLen * Math.sin(CONE_MIN_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.36" />

      {ANGLE_TICKS.map((panTick) => {
        const theta = panValToStageThetaRad(panTick);
        const lx = Math.max(22, Math.min(W - 22, W / 2 + labelArcR * Math.cos(theta)));
        const ly = Math.max(13, Math.min(H - 18, H - labelArcR * Math.sin(theta)));
        const lbl = panTick === 0 ? 'C' : panTick < 0 ? `${leftPrefix}${Math.abs(panTick)}` : `D${panTick}`;
        return (
          <g key={panTick}>
            {panTick !== 0 && Math.abs(panTick) < 100 && (
              <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(theta)} y2={H - coneLen * Math.sin(theta)} stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.14" strokeDasharray="2 4" />
            )}
            <text x={lx} y={ly} textAnchor="middle" fill="currentColor" fontSize="9.5" fontFamily="monospace" fontWeight="bold" opacity={panTick === 0 ? '0.85' : '0.62'}>
              {lbl}
            </text>
          </g>
        );
      })}

      {DB_ARCS.map((db) => {
        const rNorm = db === 0 ? STAGE_ZERO_DB_RADIUS_NORM : dbToStageRadiusNorm(db);
        const r = H * rNorm, isZero = db === 0;
        const x1 = W / 2 + r * Math.cos(CONE_MIN_RAD), y1 = H - r * Math.sin(CONE_MIN_RAD);
        const x2 = W / 2 + r * Math.cos(CONE_MAX_RAD), y2 = H - r * Math.sin(CONE_MAX_RAD);
        return (
          <g key={db}>
            <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`} fill="none" stroke={isZero ? 'var(--cordel-wood)' : 'currentColor'} strokeWidth={isZero ? '2' : '1'} strokeOpacity={isZero ? '0.65' : '0.2'} strokeDasharray={isZero ? '0' : '3 3'} />
            <text x={W / 2 + 6} y={Math.max(22, H - r - 3)} fill={isZero ? 'var(--cordel-wood)' : 'currentColor'} fontSize="8.5" fontWeight="bold" opacity={isZero ? '0.9' : '0.45'}>{db > 0 ? `+${db}` : db} dB</text>
          </g>
        );
      })}

      {visualPawns.map((p) => {
        if (!p.linkAnchorPawnId) return null;
        const anchor = byId.get(p.linkAnchorPawnId);
        if (!anchor) return null;
        const isHighlighted = activeAnchorId !== null && (p.linkAnchorPawnId === activeAnchorId || p.id === activeAnchorId);
        const isLinkedTrackPair = p.roleKind === 'slave';
        return (
          <line
            key={`link-${p.id}`}
            data-testid={`stage-link-${anchor.id}-${p.id}`}
            x1={anchor.visualX}
            y1={anchor.visualY}
            x2={p.visualX}
            y2={p.visualY}
            stroke={isHighlighted || isLinkedTrackPair ? 'var(--cordel-wood)' : 'currentColor'}
            strokeWidth={isHighlighted ? '2.2' : isLinkedTrackPair ? '1.6' : '1.2'}
            strokeOpacity={isHighlighted ? '0.92' : isLinkedTrackPair ? '0.62' : '0.38'}
            strokeDasharray={isLinkedTrackPair ? '4 3' : '2 3'}
          />
        );
      })}
    </svg>
  );
};
