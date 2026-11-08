import React, { useEffect } from 'react';
import {
  CONFIG_GONGUE_STICK,
  GongueDynamicState,
  subscribeGongueStickConfig,
} from '../../audio/animations/gongueStickConfig';

export function getGongueStaticPoseState(forceAuto = false): GongueDynamicState {
  const { posePreview, hand, tip } = CONFIG_GONGUE_STICK;
  const mode = forceAuto ? 'auto' : posePreview;
  if (mode === 'grave_impact') {
    return { handX: hand.graveX, handY: hand.graveY, handScale: hand.graveScale, tipX: tip.graveX, tipY: tip.graveY, tipScale: tip.graveImpactScale, shadowDrop: 0 };
  }
  if (mode === 'grave_windup') {
    return { handX: hand.graveX + 8, handY: hand.graveY - hand.windUpLiftY, handScale: +(hand.graveScale * hand.windUpScaleMult).toFixed(3), tipX: tip.graveX + 14, tipY: tip.graveY - tip.graveWindUpLiftY, tipScale: tip.graveWindUpScale, shadowDrop: 1 };
  }
  if (mode === 'aigu_impact') {
    return { handX: hand.aiguX, handY: hand.aiguY, handScale: hand.aiguScale, tipX: tip.aiguX, tipY: tip.aiguY, tipScale: tip.aiguImpactScale, shadowDrop: 0 };
  }
  if (mode === 'aigu_windup') {
    return { handX: hand.aiguX + 8, handY: hand.aiguY - hand.windUpLiftY, handScale: +(hand.aiguScale * hand.windUpScaleMult).toFixed(3), tipX: tip.aiguX + 14, tipY: tip.aiguY - tip.aiguWindUpLiftY, tipScale: tip.aiguWindUpScale, shadowDrop: 1 };
  }
  return {
    handX: Math.round((hand.graveX + hand.aiguX) * 0.5),
    handY: Math.round((hand.graveY + hand.aiguY) * 0.5),
    handScale: +((hand.graveScale + hand.aiguScale) * 0.5).toFixed(3),
    tipX: Math.round((tip.graveX + tip.aiguX) * 0.5) + 22,
    tipY: Math.round((tip.graveY + tip.aiguY) * 0.5),
    tipScale: +((tip.graveImpactScale + tip.aiguImpactScale) * 0.55).toFixed(3),
    shadowDrop: 0.75,
  };
}

export function updateGongueStickGeometry(svgEl: SVGSVGElement | null, st: GongueDynamicState, isLeftHanded: boolean): void {
  if (!svgEl) return;
  const hSign = isLeftHanded ? -1 : 1;
  const { hand, tip, globalOffsetX, globalOffsetY, flatBevelPx, shadowDepthPx, shadowOpacity } = CONFIG_GONGUE_STICK;
  const hx = 250 + (st.handX + globalOffsetX) * hSign;
  const hy = 250 + st.handY + globalOffsetY;
  const tx = 250 + (st.tipX + globalOffsetX) * hSign;
  const ty = 250 + st.tipY + globalOffsetY;
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const buttExt = 58 * st.handScale;
  const bx = hx - ux * buttExt;
  const by = hy - uy * buttExt;
  const rB = (hand.baseWidth * st.handScale * 1.06) / 2;
  const rT = (tip.baseWidth * st.tipScale) / 2;

  const b1x = +(bx + nx * rB).toFixed(1), b1y = +(by + ny * rB).toFixed(1);
  const b2x = +(bx - nx * rB).toFixed(1), b2y = +(by - ny * rB).toFixed(1);
  const t1x = +(tx + nx * rT).toFixed(1), t1y = +(ty + ny * rT).toFixed(1);
  const t2x = +(tx - nx * rT).toFixed(1), t2y = +(ty - ny * rT).toFixed(1);

  const bodyEl = svgEl.querySelector('[data-gongue-body]');
  bodyEl?.setAttribute('d', `M ${b1x} ${b1y} L ${t1x} ${t1y} L ${t2x} ${t2y} L ${b2x} ${b2y} Z`);

  const sSign = ny >= 0 ? 1 : -1;
  const sbX = +(bx + nx * rB * sSign * 0.18).toFixed(1), sbY = +(by + ny * rB * sSign * 0.18).toFixed(1);
  const stX = +(tx + nx * rT * sSign * 0.18).toFixed(1), stY = +(ty + ny * rT * sSign * 0.18).toFixed(1);
  const edgeBX = sSign > 0 ? b1x : b2x, edgeBY = sSign > 0 ? b1y : b2y;
  const edgeTX = sSign > 0 ? t1x : t2x, edgeTY = sSign > 0 ? t1y : t2y;
  svgEl.querySelector('[data-gongue-shade]')?.setAttribute('d', `M ${sbX} ${sbY} L ${stX} ${stY} L ${edgeTX} ${edgeTY} L ${edgeBX} ${edgeBY} Z`);

  const fDepth = Math.max(2, +(flatBevelPx * st.tipScale).toFixed(1));
  const f1x = +(t1x - ux * fDepth).toFixed(1), f1y = +(t1y - uy * fDepth).toFixed(1);
  const f2x = +(t2x - ux * fDepth).toFixed(1), f2y = +(t2y - uy * fDepth).toFixed(1);
  svgEl.querySelector('[data-gongue-face]')?.setAttribute('d', `M ${t1x} ${t1y} L ${t2x} ${t2y} L ${f2x} ${f2y} L ${f1x} ${f1y} Z`);

  let hatchD = '';
  for (let i = 1; i <= 5; i++) {
    const t = i / 6.2;
    const cx = bx + (tx - bx) * t, cy = by + (ty - by) * t;
    const r = rB + (rT - rB) * t;
    const x1 = +(cx + nx * r * sSign * 0.25).toFixed(1), y1 = +(cy + ny * r * sSign * 0.25).toFixed(1);
    const x2 = +(cx + nx * r * sSign * 0.88 - ux * 4).toFixed(1), y2 = +(cy + ny * r * sSign * 0.88 - uy * 4).toFixed(1);
    hatchD += `M ${x1} ${y1} L ${x2} ${y2} `;
  }
  svgEl.querySelector('[data-gongue-hatch]')?.setAttribute('d', hatchD);

  const shEl = svgEl.querySelector('[data-stick-shadow]');
  if (shEl) {
    const shBX = bx - hSign * 6, shBY = by + shadowDepthPx * 0.45;
    const shTX = tx - hSign * 8 * st.shadowDrop, shTY = ty + shadowDepthPx * 1.5 * st.shadowDrop;
    const srB = rB * 0.9, srT = rT * (0.96 - 0.1 * st.shadowDrop);
    shEl.setAttribute('d', `M ${+(shBX + nx * srB).toFixed(1)} ${+(shBY + ny * srB).toFixed(1)} L ${+(shTX + nx * srT).toFixed(1)} ${+(shTY + ny * srT).toFixed(1)} L ${+(shTX - nx * srT).toFixed(1)} ${+(shTY - ny * srT).toFixed(1)} L ${+(shBX - nx * srB).toFixed(1)} ${+(shBY - ny * srB).toFixed(1)} Z`);
    shEl.setAttribute('opacity', String(+(shadowOpacity * (1 - 0.52 * st.shadowDrop)).toFixed(2)));
  }
}

export const GongueStickOverlay: React.FC<{
  isLeftHanded: boolean;
  gongueWrapperRef: React.RefObject<HTMLDivElement | null>;
  gongueStickRef: React.RefObject<SVGSVGElement | null>;
}> = ({ isLeftHanded, gongueWrapperRef, gongueStickRef }) => {
  useEffect(() => {
    const applyPose = () => updateGongueStickGeometry(gongueStickRef.current, getGongueStaticPoseState(), isLeftHanded);
    applyPose();
    return subscribeGongueStickConfig(applyPose);
  }, [isLeftHanded, gongueStickRef]);

  return (
    <div ref={gongueWrapperRef} className="absolute pointer-events-none z-10 overflow-visible" style={{ width: '500px', height: '500px', overflow: 'visible' }}>
      <svg ref={gongueStickRef} viewBox="0 0 500 500" className="w-full h-full overflow-visible" style={{ overflow: 'visible' }}>
        <path data-stick-shadow fill="var(--cordel-stick-ink)" style={{ filter: 'blur(3.5px)' }} />
        <path data-gongue-body fill="var(--cordel-stick-nylon)" stroke="var(--cordel-stick-ink)" strokeWidth="4" strokeLinejoin="miter" />
        <path data-gongue-shade fill="var(--cordel-stick-nylon-shade)" />
        <path data-gongue-face fill="var(--cordel-stick-nylon-shade)" stroke="var(--cordel-stick-ink)" strokeWidth="3" strokeLinejoin="miter" />
        <path data-gongue-hatch fill="none" stroke="var(--cordel-stick-ink)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
