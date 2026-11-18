/**
 * gonguePoseBuilder.ts — Construction des poses 2-nœuds et interpolation du Gonguê Ao Vivo (< 70 lignes).
 * - Sur `X` (`Parada / Toque abafado`), la baguette s'écrase fermement contre le métal (`shadowDrop: 0`).
 */
import {
  CONFIG_GONGUE_STICK,
  GongueDynamicState,
  GongueNextStrokeKind,
} from './gongueStickConfig';

export function classifyGongueToken(tok: string): GongueNextStrokeKind | null {
  const s = (tok || '').trim();
  if (!s || s === '0' || s === '-' || s === '.' || s === '/') return null;
  if (s === 'G' || s === 'D' || s === 'X' || s === 'x') return 'grave_strong';
  if (s === 'g' || s === 'd') return 'grave_weak';
  if (s === 'A' || s === 'E') return 'aigu_strong';
  if (s === 'a' || s === 'e') return 'aigu_weak';
  return 'grave_strong';
}

export function buildGonguePoseForStroke(stroke: string, isImpact: boolean, customAmp?: number): GongueDynamicState {
  const { hand, tip, weakStrokeRatio, flancOffsetX, flancOffsetY } = CONFIG_GONGUE_STICK;
  const s = (stroke || 'G').trim();
  const sUp = s.toUpperCase();

  if (sUp === 'X') {
    const tx = tip.graveX + flancOffsetX * 0.45;
    const ty = tip.graveY + flancOffsetY * 0.55;
    if (isImpact) {
      return {
        handX: hand.graveX + 10, handY: hand.graveY + 12, handScale: hand.graveScale,
        tipX: tx, tipY: ty, tipScale: +(tip.graveImpactScale * 1.04).toFixed(3), shadowDrop: 0,
      };
    }
    return {
      handX: hand.graveX + 20, handY: hand.graveY - hand.windUpLiftY,
      handScale: +(hand.graveScale * hand.windUpScaleMult).toFixed(3),
      tipX: tx + 18, tipY: ty - 16, tipScale: tip.graveWindUpScale, shadowDrop: 1,
    };
  }

  const isAigu = sUp === 'A' || sUp === 'E';
  const isWeak = s === 'g' || s === 'a' || s === 'd' || s === 'e';
  const amp = customAmp !== undefined ? customAmp : isWeak ? weakStrokeRatio : 1.0;
  const hX = isAigu ? hand.aiguX : hand.graveX, hY = isAigu ? hand.aiguY : hand.graveY;
  const hS = isAigu ? hand.aiguScale : hand.graveScale;
  const tX = isAigu ? tip.aiguX : tip.graveX, tY = isAigu ? tip.aiguY : tip.graveY;
  const tImpS = isAigu ? tip.aiguImpactScale : tip.graveImpactScale;
  const tWindS = isAigu ? tip.aiguWindUpScale : tip.graveWindUpScale;
  const tLiftY = isAigu ? tip.aiguWindUpLiftY : tip.graveWindUpLiftY;
  if (isImpact) return { handX: hX, handY: hY, handScale: hS, tipX: tX, tipY: tY, tipScale: tImpS, shadowDrop: 0 };
  return {
    handX: hX + Math.round(8 * amp), handY: hY - Math.round(hand.windUpLiftY * amp),
    handScale: +(hS * (1 + (hand.windUpScaleMult - 1) * amp)).toFixed(3),
    tipX: tX + Math.round(14 * amp), tipY: tY - Math.round(tLiftY * amp),
    tipScale: +(tImpS + (tWindS - tImpS) * amp).toFixed(3), shadowDrop: Math.min(1, amp),
  };
}

export function lerpGongueState(a: GongueDynamicState, b: GongueDynamicState, t: number): GongueDynamicState {
  const k = Math.max(0, Math.min(1, t));
  return {
    handX: a.handX + (b.handX - a.handX) * k, handY: a.handY + (b.handY - a.handY) * k,
    handScale: a.handScale + (b.handScale - a.handScale) * k, tipX: a.tipX + (b.tipX - a.tipX) * k,
    tipY: a.tipY + (b.tipY - a.tipY) * k, tipScale: a.tipScale + (b.tipScale - a.tipScale) * k,
    shadowDrop: a.shadowDrop + (b.shadowDrop - a.shadowDrop) * k,
  };
}
