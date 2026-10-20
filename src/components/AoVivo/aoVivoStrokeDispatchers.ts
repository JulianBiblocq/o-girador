import {
  generateAlfaiaKeyframes,
  generateDrumKeyframes,
  generateTimbalKeyframes,
  generateMineiroKeyframes,
  generateAgbeKeyframes,
  generateGongueKeyframes,
  getStickDuration,
  getMineiroDuration,
  getNextMineiroPole,
  getAgbeDuration,
  getGongueDuration,
  KEYFRAMES_HALO,
  CONFIG_TIMBAL,
  MineiroPole,
} from '../../audio/animationGenerators';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function dispatchAlfaiaOrDrum(
  instId: string,
  stroke: string,
  isVibrate: boolean,
  isSubStep: boolean,
  isLeftHanded: boolean,
  leftStickEl: SVGSVGElement | null,
  rightStickEl: SVGSVGElement | null,
  haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>,
  rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }
) {
  const bpm = useSequencerStore.getState().bpm || 100;
  const isAlfaia = ['marcante', 'meiao', 'repique'].includes(instId);
  const gen = isAlfaia ? generateAlfaiaKeyframes : generateDrumKeyframes;

  let keyframesLeft: Keyframe[] | null = null;
  let keyframesRight: Keyframe[] | null = null;
  let triggerLeft = false;
  let triggerRight = false;
  let animHalo = false;
  let haloOffsetY = 0;

  if (isVibrate) {
    keyframesLeft = gen(stroke, true, bpm, isLeftHanded);
    keyframesRight = gen(stroke, false, bpm, isLeftHanded);
    triggerLeft = true; triggerRight = true;
  } else {
    if (stroke === 'D' || stroke === 'd') {
      const isStrong = stroke === 'D';
      if (isLeftHanded) { keyframesLeft = gen(isStrong ? 'D' : 'd', true, bpm, isLeftHanded); triggerLeft = true; }
      else { keyframesRight = gen(isStrong ? 'D' : 'd', false, bpm, isLeftHanded); triggerRight = true; }
    } else if (stroke === 'E' || stroke === 'e') {
      const isStrong = stroke === 'E';
      if (isLeftHanded) { keyframesRight = gen(isStrong ? 'E' : 'e', false, bpm, isLeftHanded); triggerRight = true; }
      else { keyframesLeft = gen(isStrong ? 'E' : 'e', true, bpm, isLeftHanded); triggerLeft = true; }
    } else if (stroke === 'x' || stroke === 'X' || stroke === 'c' || stroke === 'C') {
      keyframesLeft = gen(stroke, true, bpm, isLeftHanded);
      keyframesRight = gen(stroke, false, bpm, isLeftHanded);
      triggerLeft = true; triggerRight = true; animHalo = true; haloOffsetY = stroke.toLowerCase() === 'c' ? -150 : -100;
    } else if (!isAlfaia && (stroke === 'f' || stroke === 'F')) {
      const isRightStrong = stroke === 'F';
      keyframesLeft = generateDrumKeyframes(isRightStrong ? 'fla-weak' : 'fla-strong', true, bpm, isLeftHanded);
      keyframesRight = generateDrumKeyframes(isRightStrong ? 'fla-strong' : 'fla-weak', false, bpm, isLeftHanded);
      triggerLeft = true; triggerRight = true;
    } else if (!isAlfaia && (stroke === 'R' || stroke === 'r')) {
      if (isLeftHanded) { keyframesLeft = generateDrumKeyframes(stroke, true, bpm, isLeftHanded); triggerLeft = true; }
      else { keyframesRight = generateDrumKeyframes(stroke, false, bpm, isLeftHanded); triggerRight = true; }
    }
  }

  const duration = isVibrate ? 100 : getStickDuration(stroke, isSubStep);
  if (triggerLeft && leftStickEl && keyframesLeft) {
    leftAnimRef.current?.cancel();
    leftAnimRef.current = leftStickEl.animate(keyframesLeft, { duration, iterations: isVibrate ? Infinity : 1, fill: 'forwards' });
  }
  if (triggerRight && rightStickEl && keyframesRight) {
    rightAnimRef.current?.cancel();
    rightAnimRef.current = rightStickEl.animate(keyframesRight, { duration, iterations: isVibrate ? Infinity : 1, fill: 'forwards' });
  }
  if (animHalo && haloEl) {
    haloEl.style.left = `${geometry.targetX}px`;
    haloEl.style.top = `${geometry.targetY + haloOffsetY}px`;
    haloEl.animate(KEYFRAMES_HALO, { duration: 400, easing: 'ease-out' });
  }
}

export function dispatchTimbal(
  stroke: string,
  isVibrate: boolean,
  isLeftHanded: boolean,
  leftStickEl: SVGSVGElement | null,
  rightStickEl: SVGSVGElement | null,
  haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>,
  rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }
) {
  let keyframesLeft: Keyframe[] | null = null;
  let keyframesRight: Keyframe[] | null = null;
  let durationLeft = CONFIG_TIMBAL.aberto.duration;
  let durationRight = CONFIG_TIMBAL.aberto.duration;
  let triggerLeft = false;
  let triggerRight = false;

  const isForte = ['G', 'A', 'S', 'D', 'P'].includes(stroke);
  const isFaible = ['g', 'a', 's', 'd', 'p'].includes(stroke);

  if (isForte) {
    const res = generateTimbalKeyframes(stroke, isLeftHanded);
    if (isLeftHanded) { keyframesLeft = res.keyframes; durationLeft = res.duration; triggerLeft = true; }
    else { keyframesRight = res.keyframes; durationRight = res.duration; triggerRight = true; }
  } else if (isFaible) {
    const res = generateTimbalKeyframes(stroke, !isLeftHanded);
    if (isLeftHanded) { keyframesRight = res.keyframes; durationRight = res.duration; triggerRight = true; }
    else { keyframesLeft = res.keyframes; durationLeft = res.duration; triggerLeft = true; }
  } else if (['F', 'f', 'V', 'v'].includes(stroke)) {
    const key = stroke.toUpperCase() === 'F' ? 'A' : 'S';
    const resL = generateTimbalKeyframes(key, true);
    const resR = generateTimbalKeyframes(key, false);
    keyframesLeft = resL.keyframes; durationLeft = resL.duration;
    keyframesRight = resR.keyframes; durationRight = resR.duration;
    triggerLeft = true; triggerRight = true;
  }

  if (triggerLeft && leftStickEl && keyframesLeft) {
    leftAnimRef.current = leftStickEl.animate(keyframesLeft, { duration: durationLeft, iterations: isVibrate ? Infinity : 1 });
  }
  if (triggerRight && rightStickEl && keyframesRight) {
    rightAnimRef.current = rightStickEl.animate(keyframesRight, { duration: durationRight, iterations: isVibrate ? Infinity : 1 });
  }
}
