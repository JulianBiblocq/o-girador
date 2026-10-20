import {
  generateMineiroKeyframes,
  generateAgbeKeyframes,
  generateGongueKeyframes,
  getMineiroDuration,
  getNextMineiroPole,
  getAgbeDuration,
  getGongueDuration,
  MineiroPole,
} from '../../audio/animationGenerators';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function dispatchMineiro(
  stroke: string,
  isVibrate: boolean,
  mineiroStickEl: SVGSVGElement | null,
  poleRef: React.MutableRefObject<MineiroPole>,
  animRef: React.MutableRefObject<Animation | null>
) {
  if (!mineiroStickEl) return;
  const keyframes = generateMineiroKeyframes(stroke, poleRef.current);
  const duration = getMineiroDuration(stroke);
  animRef.current = mineiroStickEl.animate(keyframes, {
    duration: isVibrate ? 110 : duration,
    iterations: isVibrate ? Infinity : 1,
    fill: 'forwards',
  });
  poleRef.current = getNextMineiroPole(stroke, poleRef.current);
}

export function dispatchAgbe(
  stroke: string,
  isVibrate: boolean,
  agbeWholeEl: SVGGElement | null,
  animRef: React.MutableRefObject<Animation | null>
) {
  if (!agbeWholeEl) return;
  const bpm = useSequencerStore.getState().bpm || 100;
  animRef.current?.cancel();
  animRef.current = agbeWholeEl.animate(generateAgbeKeyframes(stroke, bpm), {
    duration: isVibrate ? 100 : getAgbeDuration(stroke),
    iterations: isVibrate ? Infinity : 1,
    fill: 'forwards',
  });
}

export function dispatchGongue(
  stroke: string,
  isVibrate: boolean,
  gongueStickEl: SVGSVGElement | null,
  animRef: React.MutableRefObject<Animation | null>
) {
  if (!gongueStickEl) return;
  const bpm = useSequencerStore.getState().bpm || 100;
  animRef.current?.cancel();
  animRef.current = gongueStickEl.animate(generateGongueKeyframes(stroke, bpm), {
    duration: isVibrate ? 100 : getGongueDuration(stroke),
    iterations: isVibrate ? Infinity : 1,
    fill: 'forwards',
  });
}
