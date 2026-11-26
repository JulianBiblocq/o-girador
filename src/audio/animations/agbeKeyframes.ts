import { CONFIG_AGBE_LAB } from './agbeLabConfig';
import { computeElasticImpactTiming } from './aoVivoBallisticMath';

export * from './agbeLabConfig';

let lastAgbeEndTransform: string | null = null;

export function resetAgbePostureMemory(): void {
  lastAgbeEndTransform = null;
}

export function getAgbeRestTransform(): string {
  return 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)';
}

function resolveAgbeHandDir(stroke: string, isLeftHanded = false): number {
  const isDominantTok = stroke === 'D' || stroke === 'd';
  return isDominantTok !== isLeftHanded ? -1 : 1;
}

export function getAgbeImpactPoseTransform(stroke: string, isLeftHanded = false): string {
  const c = CONFIG_AGBE_LAB;
  const s = (stroke || 'D').trim(), sUp = s.toUpperCase();
  if (sUp === 'B' || s === '~') {
    return `translate(${-c.barulhoJitterPx}px, 0px) rotateZ(${-Math.round(c.barulhoJitterPx * 0.4)}deg) scale(0.99, 1.01)`;
  }
  if (sUp === 'S') {
    const mult = s === 'S' ? 1 : 0.65, ty = Math.round(c.saltoJumpY * mult);
    const sx = +(1 + (c.saltoSquash - 1) * mult).toFixed(3);
    return `translate(0px, ${ty}px) rotateZ(0deg) scale(${sx}, ${+(2 - sx).toFixed(3)})`;
  }
  if (sUp === 'V') {
    const mult = s === 'V' ? 1 : 0.65, ty = Math.round(c.voltaDropY * mult);
    const sq = 1 + (c.voltaSquash - 1) * mult, sz = 1 + (c.voltaScaleZ - 1) * mult;
    return `translate(0px, ${ty}px) rotateZ(${+(c.voltaRotationDeg * mult).toFixed(1)}deg) scale(${+(sq * sz).toFixed(3)}, ${+((2 - sq) * sz).toFixed(3)})`;
  }
  const isStrong = s === 'D' || s === 'E', dir = resolveAgbeHandDir(s, isLeftHanded);
  const tx = (isStrong ? c.strongTranslateX : c.weakTranslateX) * dir;
  const rz = (isStrong ? c.strongRotateZ : c.weakRotateZ) * dir;
  return `translate(${tx}px, 0px) rotateZ(${rz}deg) scale(1, 1)`;
}

function resolveAgbeNextTransform(nextStroke?: string, isLeftHanded = false): string {
  const c = CONFIG_AGBE_LAB;
  if (nextStroke === 'V' || nextStroke === 'v') {
    return `translate(0px, ${Math.round(Math.min(-18, c.saltoJumpY * 0.55))}px) rotateZ(0deg) scale(0.96, 1.04)`;
  }
  if (nextStroke && ['D', 'd', 'E', 'e'].includes(nextStroke)) {
    const nextDir = resolveAgbeHandDir(nextStroke, isLeftHanded), ant = c.nextAnticipationRatio;
    return `translate(${Math.round(-nextDir * c.weakTranslateX * 0.45 * ant)}px, 0px) rotateZ(${+(-nextDir * c.weakRotateZ * 0.45 * ant).toFixed(1)}deg) scale(1, 1)`;
  }
  return getAgbeRestTransform();
}

export function buildAgbeBarulhoFrames(amplitude = 1, nextStroke?: string, commitEnd = false, isLeftHanded = false): {
  startTr: string; loopFrames: Keyframe[]; endTr: string;
} {
  const c = CONFIG_AGBE_LAB, jx = +(c.barulhoJitterPx * amplitude).toFixed(1), jz = +(jx * 0.4).toFixed(1);
  const startTr = lastAgbeEndTransform || getAgbeRestTransform();
  const endTr = resolveAgbeNextTransform(nextStroke, isLeftHanded);
  lastAgbeEndTransform = commitEnd ? endTr : 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)';
  const loopFrames: Keyframe[] = [
    { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', offset: 0 },
    { transform: `translate(${-jx}px, 0px) rotateZ(${-jz}deg) scale(0.99, 1.01)`, offset: 0.25 },
    { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', offset: 0.5 },
    { transform: `translate(${jx}px, 0px) rotateZ(${jz}deg) scale(0.99, 1.01)`, offset: 0.75 },
    { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', offset: 1 },
  ];
  return { startTr, loopFrames, endTr };
}

export function generateAgbeKeyframes(stroke: string, _bpm = 100, nextStroke?: string, isLeftHanded = false, durationMs = 225): Keyframe[] {
  const c = CONFIG_AGBE_LAB, s = (stroke || 'D').trim(), sUp = s.toUpperCase();
  if (sUp === 'B' || s === '~') return buildAgbeBarulhoFrames(s === 'b' ? 0.6 : 1, nextStroke, true, isLeftHanded).loopFrames;

  const { impactOff, cushionOff } = computeElasticImpactTiming(durationMs);
  const highEntryY = Math.round(Math.min(-18, c.saltoJumpY * 0.55));
  const voltaHighTr = `translate(0px, ${highEntryY}px) rotateZ(0deg) scale(0.96, 1.04)`;
  const endTr = resolveAgbeNextTransform(nextStroke, isLeftHanded);
  const startTr = sUp === 'V' ? voltaHighTr : (lastAgbeEndTransform || getAgbeRestTransform());
  lastAgbeEndTransform = endTr;
  const impTr = getAgbeImpactPoseTransform(s, isLeftHanded);

  if (sUp === 'V') {
    const mult = s === 'V' ? 1 : 0.65;
    const cushY = Math.round(c.voltaDropY * mult * 0.72);
    const cushTr = `translate(0px, ${cushY}px) rotateZ(${+(c.voltaRotationDeg * mult * 0.55).toFixed(1)}deg) scale(1.01, 0.99)`;
    return [
      { transform: startTr, offset: 0, easing: 'cubic-bezier(0.35, 0, 0.85, 0.5)' },
      { transform: impTr, offset: impactOff, easing: 'ease-out' },
      { transform: cushTr, offset: cushionOff, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { transform: endTr, offset: 1 },
    ];
  }
  if (sUp === 'S') {
    const mult = s === 'S' ? 1 : 0.65;
    const cushY = Math.round(c.saltoJumpY * mult * 0.76);
    return [
      { transform: startTr, offset: 0, easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
      { transform: impTr, offset: impactOff, easing: 'ease-out' },
      { transform: `translate(0px, ${cushY}px) rotateZ(0deg) scale(0.99, 1.01)`, offset: cushionOff, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      { transform: endTr, offset: 1 },
    ];
  }

  const isStrong = s === 'D' || s === 'E', dir = resolveAgbeHandDir(s, isLeftHanded);
  const tx = (isStrong ? c.strongTranslateX : c.weakTranslateX) * dir;
  const rz = (isStrong ? c.strongRotateZ : c.weakRotateZ) * dir;
  const cushX = Math.round(tx * 0.72 - c.beadInertiaPx * dir * 0.5);
  const cushZ = +(rz * 0.72 - c.beadInertiaPx * 0.35 * dir).toFixed(1);
  return [
    { transform: startTr, offset: 0, easing: 'cubic-bezier(0.22, 0, 0.38, 1)' },
    { transform: impTr, offset: impactOff, easing: 'ease-out' },
    { transform: `translate(${cushX}px, 0px) rotateZ(${cushZ}deg) scale(1, 1)`, offset: cushionOff, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    { transform: endTr, offset: 1 },
  ];
}
