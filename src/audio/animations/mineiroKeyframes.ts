import { MineiroPole } from './configMineiro';
import { CONFIG_MINEIRO_LAB } from './mineiroLabConfig';

export * from './mineiroLabConfig';

interface MineiroPose {
  x: number;
  y: number;
  scale: number;
  rot: number;
  skewX: number;
  skewY: number;
}

let lastMineiroPose: MineiroPose | null = null;

export function resetMineiroPostureMemory(): void {
  lastMineiroPose = null;
}

function formatMineiroPose(p: MineiroPose): string {
  return `translate3d(${+p.x.toFixed(1)}px, ${+p.y.toFixed(1)}px, 0) rotateZ(${+p.rot.toFixed(2)}deg) skewY(${+p.skewY.toFixed(2)}deg) skewX(${+p.skewX.toFixed(2)}deg) scale(${+p.scale.toFixed(3)})`;
}

function getMineiroPolePose(pole: MineiroPole): MineiroPose {
  const c = CONFIG_MINEIRO_LAB;
  if (pole === 'frontStrong') return { x: 0, y: c.pushStrongY, scale: c.pushStrongScaleZ, rot: c.pushStrongTiltDeg, skewX: 0, skewY: 0 };
  if (pole === 'frontWeak') return { x: 0, y: c.pushWeakY, scale: c.pushWeakScaleZ, rot: +(c.pushStrongTiltDeg * 0.35).toFixed(2), skewX: 0, skewY: 0 };
  if (pole === 'backStrong') return { x: 0, y: c.pullStrongY, scale: c.pullStrongScaleZ, rot: c.pullStrongTiltDeg, skewX: 0, skewY: 0 };
  return { x: 0, y: c.pullWeakY, scale: c.pullWeakScaleZ, rot: +(c.pullStrongTiltDeg * 0.35).toFixed(2), skewX: 0, skewY: 0 };
}

function getMineiroLadoPose(isStrong: boolean, isLeftHanded = false): MineiroPose {
  const c = CONFIG_MINEIRO_LAB;
  const sign = isLeftHanded ? -1 : 1;
  const mult = isStrong ? 1 : 0.65;
  const twist = c.ladoTwistSkewDeg * mult * sign;
  return {
    x: c.ladoOffsetX * mult * sign,
    y: c.ladoOffsetY * mult,
    scale: 1 + (c.ladoScaleZ - 1) * mult,
    rot: c.ladoAngleDeg * mult * sign,
    skewY: twist,
    skewX: -twist * 0.4,
  };
}

export function getMineiroPoleTransform(pole: MineiroPole): string {
  return formatMineiroPose(getMineiroPolePose(pole));
}

export function getMineiroRestTransform(): string {
  return formatMineiroPose({ x: 0, y: 0, scale: 1, rot: 0, skewX: 0, skewY: 0 });
}

function resolveMineiroPeakPose(stroke: string, isLeftHanded = false): MineiroPose {
  const c = CONFIG_MINEIRO_LAB;
  const s = (stroke || 'P').trim();
  const norm = s === 'D' || s === 'F' ? 'P' : s === 'd' || s === 'f' ? 'p' : s === 'E' ? 'T' : s === 'e' ? 't' : s;
  if (norm === 'P') return getMineiroPolePose('frontStrong');
  if (norm === 'p') return getMineiroPolePose('frontWeak');
  if (norm === 'T') return getMineiroPolePose('backStrong');
  if (norm === 't') return getMineiroPolePose('backWeak');
  if (norm.toUpperCase() === 'L') return getMineiroLadoPose(norm === 'L', isLeftHanded);
  if (norm.toUpperCase() === 'B' || norm === '~') return { x: -c.barulhoJitterPx, y: 0, scale: 1, rot: 0, skewX: 0, skewY: 0 };
  return getMineiroPolePose('frontWeak');
}

export function getMineiroImpactPoseTransform(stroke: string, isLeftHanded = false): string {
  return formatMineiroPose(resolveMineiroPeakPose(stroke, isLeftHanded));
}

export function buildMineiroBarulhoFrames(currentPole: MineiroPole = 'backWeak', amplitude = 1, commitRest = false): {
  startTr: string; loopFrames: Keyframe[]; endTr: string;
} {
  const c = CONFIG_MINEIRO_LAB, startPose = lastMineiroPose || getMineiroPolePose(currentPole);
  const jx = +(c.barulhoJitterPx * amplitude).toFixed(1), by = +(startPose.y * 0.35).toFixed(1);
  const midPose: MineiroPose = { x: 0, y: by, scale: 1, rot: 0, skewX: 0, skewY: 0 };
  const restPose: MineiroPose = { x: 0, y: 0, scale: 1, rot: 0, skewX: 0, skewY: 0 };
  lastMineiroPose = commitRest ? restPose : midPose;
  const loopFrames: Keyframe[] = [
    { transform: formatMineiroPose(midPose), offset: 0 },
    { transform: formatMineiroPose({ ...midPose, x: -jx, rot: -1.2 * amplitude }), offset: 0.25 },
    { transform: formatMineiroPose(midPose), offset: 0.5 },
    { transform: formatMineiroPose({ ...midPose, x: jx, rot: 1.2 * amplitude }), offset: 0.75 },
    { transform: formatMineiroPose(midPose), offset: 1 },
  ];
  return { startTr: formatMineiroPose(startPose), loopFrames, endTr: formatMineiroPose(restPose) };
}

export function generateMineiroKeyframes(stroke: string, currentPole: MineiroPole = 'backWeak', isLeftHanded = false): Keyframe[] {
  const c = CONFIG_MINEIRO_LAB;
  const s = (stroke || 'P').trim();
  const atk = Math.min(0.45, Math.max(0.08, c.beadImpactOffset));
  const startPose: MineiroPose = lastMineiroPose || getMineiroPolePose(currentPole);

  if (s.toUpperCase() === 'B' || s === '~') {
    return buildMineiroBarulhoFrames(currentPole, s === 'b' ? 0.6 : 1, true).loopFrames;
  }

  const f = Math.max(0, Math.min(1, c.fluidity));
  const d = Math.max(0.1, Math.min(1, c.dampingSoftness));
  const rec = Math.max(0, Math.min(0.85, c.recoilReturnRatio));
  const keep = 1 - rec;

  const attackEase = `cubic-bezier(${+(0.12 + (1 - f) * 0.25).toFixed(2)}, ${+(0.55 + f * 0.4).toFixed(2)}, ${+(0.25 + (1 - f) * 0.35).toFixed(2)}, 1)`;
  const settleEase = `cubic-bezier(${+(0.25 * (1 - d * 0.5)).toFixed(2)}, ${+(0.7 + d * 0.3).toFixed(2)}, ${+(0.35 + d * 0.25).toFixed(2)}, 1)`;

  const peakPose = resolveMineiroPeakPose(s, isLeftHanded);
  const settlePose: MineiroPose = {
    x: peakPose.x * keep,
    y: peakPose.y * keep,
    scale: 1 + (peakPose.scale - 1) * keep,
    rot: peakPose.rot * keep,
    skewX: peakPose.skewX * keep,
    skewY: peakPose.skewY * keep,
  };
  lastMineiroPose = settlePose;

  return [
    { transform: formatMineiroPose(startPose), offset: 0, easing: attackEase },
    { transform: formatMineiroPose(peakPose), offset: atk, easing: settleEase },
    { transform: formatMineiroPose(settlePose), offset: 1 },
  ];
}
