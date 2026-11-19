import { CONFIG_AGBE_LAB } from './agbeLabConfig';

export * from './agbeLabConfig';

let lastAgbeEndTransform: string | null = null;

export function resetAgbePostureMemory(): void {
  lastAgbeEndTransform = null;
}

export function getAgbeRestTransform(): string {
  return 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)';
}

export function getAgbeImpactPoseTransform(stroke: string): string {
  const c = CONFIG_AGBE_LAB;
  const s = (stroke || 'D').trim();
  const sUp = s.toUpperCase();
  if (sUp === 'B' || s === '~') {
    return `translate(${-c.barulhoJitterPx}px, 0px) rotateZ(${-Math.round(c.barulhoJitterPx * 0.4)}deg) scale(0.99, 1.01)`;
  }
  if (sUp === 'S') {
    const mult = s === 'S' ? 1 : 0.65;
    const ty = Math.round(c.saltoJumpY * mult);
    const sx = +(1 + (c.saltoSquash - 1) * mult).toFixed(3);
    const sy = +(2 - sx).toFixed(3);
    return `translate(0px, ${ty}px) rotateZ(0deg) scale(${sx}, ${sy})`;
  }
  if (sUp === 'V') {
    const mult = s === 'V' ? 1 : 0.65;
    const ty = Math.round(c.voltaDropY * mult);
    const sq = 1 + (c.voltaSquash - 1) * mult;
    const sz = 1 + (c.voltaScaleZ - 1) * mult;
    const sx = +(sq * sz).toFixed(3);
    const sy = +((2 - sq) * sz).toFixed(3);
    const rz = +(c.voltaRotationDeg * mult).toFixed(1);
    return `translate(0px, ${ty}px) rotateZ(${rz}deg) scale(${sx}, ${sy})`;
  }
  const isRight = s === 'D' || s === 'd';
  const isStrong = s === 'D' || s === 'E';
  const dir = isRight ? -1 : 1;
  const tx = (isStrong ? c.strongTranslateX : c.weakTranslateX) * dir;
  const rz = (isStrong ? c.strongRotateZ : c.weakRotateZ) * dir;
  return `translate(${tx}px, 0px) rotateZ(${rz}deg) scale(1, 1)`;
}

function resolveAgbeNextTransform(nextStroke?: string): string {
  const c = CONFIG_AGBE_LAB;
  if (nextStroke === 'V' || nextStroke === 'v') {
    return `translate(0px, ${Math.round(Math.min(-18, c.saltoJumpY * 0.55))}px) rotateZ(0deg) scale(0.96, 1.04)`;
  }
  if (nextStroke && ['D', 'd', 'E', 'e'].includes(nextStroke)) {
    const nextDir = nextStroke === 'D' || nextStroke === 'd' ? -1 : 1, ant = c.nextAnticipationRatio;
    return `translate(${Math.round(-nextDir * c.weakTranslateX * 0.45 * ant)}px, 0px) rotateZ(${+(-nextDir * c.weakRotateZ * 0.45 * ant).toFixed(1)}deg) scale(1, 1)`;
  }
  return getAgbeRestTransform();
}

export function buildAgbeBarulhoFrames(amplitude = 1, nextStroke?: string, commitEnd = false): {
  startTr: string; loopFrames: Keyframe[]; endTr: string;
} {
  const c = CONFIG_AGBE_LAB, jx = +(c.barulhoJitterPx * amplitude).toFixed(1), jz = +(jx * 0.4).toFixed(1);
  const startTr = lastAgbeEndTransform || getAgbeRestTransform();
  const endTr = resolveAgbeNextTransform(nextStroke);
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

export function generateAgbeKeyframes(stroke: string, _bpm: number = 100, nextStroke?: string): Keyframe[] {
  const c = CONFIG_AGBE_LAB;
  const s = (stroke || 'D').trim();
  const sUp = s.toUpperCase();
  const atk = Math.min(0.42, Math.max(0.08, c.attackOffset));

  if (sUp === 'B' || s === '~') return buildAgbeBarulhoFrames(s === 'b' ? 0.6 : 1, nextStroke, true).loopFrames;

  const highEntryY = Math.round(Math.min(-18, c.saltoJumpY * 0.55));
  const voltaHighTr = `translate(0px, ${highEntryY}px) rotateZ(0deg) scale(0.96, 1.04)`;
  const endTr = resolveAgbeNextTransform(nextStroke);

  const startTr = sUp === 'V' ? voltaHighTr : (lastAgbeEndTransform || getAgbeRestTransform());
  lastAgbeEndTransform = endTr;
  const impTr = getAgbeImpactPoseTransform(s);

  if (sUp === 'V') {
    return [
      { transform: startTr, offset: 0, easing: 'cubic-bezier(0.35, 0, 0.85, 0.5)' },
      { transform: impTr, offset: atk, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { transform: endTr, offset: 1 },
    ];
  }
  if (sUp === 'S') {
    return [
      { transform: startTr, offset: 0, easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
      { transform: impTr, offset: atk, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      { transform: endTr, offset: 1 },
    ];
  }

  const isRight = s === 'D' || s === 'd';
  const isStrong = s === 'D' || s === 'E';
  const dir = isRight ? -1 : 1;
  const tx = (isStrong ? c.strongTranslateX : c.weakTranslateX) * dir;
  const rz = (isStrong ? c.strongRotateZ : c.weakRotateZ) * dir;
  const microX = c.beadInertiaPx * dir;
  const microZ = +(c.beadInertiaPx * 0.45 * dir).toFixed(1);
  const rebOff = Math.min(0.65, +(atk + 0.1).toFixed(2));

  return [
    { transform: startTr, offset: 0, easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
    { transform: impTr, offset: atk, easing: 'linear' },
    { transform: `translate(${tx - microX}px, 0px) rotateZ(${rz - microZ}deg) scale(1, 1)`, offset: rebOff, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    { transform: endTr, offset: 1 },
  ];
}
