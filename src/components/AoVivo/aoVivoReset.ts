import { CONFIG_STICKS, CONFIG_GONGUE, CONFIG_MINEIRO, getTimbalRestTransform } from '../../audio/animationGenerators';

export function resetAoVivoRestPosition(
  instId: string | undefined,
  isLeftHanded: boolean,
  leftStickRef: React.RefObject<SVGSVGElement | null>,
  rightStickRef: React.RefObject<SVGSVGElement | null>,
  gongueStickRef: React.RefObject<SVGSVGElement | null>,
  mineiroStickRef: React.RefObject<SVGSVGElement | null>,
  agbeWholeRef: React.RefObject<SVGGElement | null>
) {
  if (!instId) return;

  if (['marcante', 'meiao', 'repique'].includes(instId)) {
    if (leftStickRef.current) {
      const angle = isLeftHanded ? -CONFIG_STICKS.angles.alfaia.macaneta : CONFIG_STICKS.angles.alfaia.bacalhau;
      leftStickRef.current.style.transition = 'none';
      leftStickRef.current.style.transform = `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${angle}deg) scale(${CONFIG_STICKS.rest.scale})`;
    }
    if (rightStickRef.current) {
      const angle = isLeftHanded ? -CONFIG_STICKS.angles.alfaia.bacalhau : CONFIG_STICKS.angles.alfaia.macaneta;
      rightStickRef.current.style.transition = 'none';
      rightStickRef.current.style.transform = `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${angle}deg) scale(${CONFIG_STICKS.rest.scale})`;
    }
  } else if (['caixa', 'tarol'].includes(instId)) {
    if (leftStickRef.current) {
      leftStickRef.current.style.transition = 'none';
      leftStickRef.current.style.transform = `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.drum.left}deg) scale(${CONFIG_STICKS.rest.scale})`;
    }
    if (rightStickRef.current) {
      rightStickRef.current.style.transition = 'none';
      rightStickRef.current.style.transform = `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${CONFIG_STICKS.angles.drum.right}deg) scale(${CONFIG_STICKS.rest.scale})`;
    }
  } else if (instId === 'timbal') {
    if (leftStickRef.current) {
      leftStickRef.current.style.transition = 'none';
      leftStickRef.current.style.transform = getTimbalRestTransform(true);
    }
    if (rightStickRef.current) {
      rightStickRef.current.style.transition = 'none';
      rightStickRef.current.style.transform = getTimbalRestTransform(false);
    }
  } else if (instId === 'gongue') {
    if (gongueStickRef.current) {
      gongueStickRef.current.style.transition = 'none';
      gongueStickRef.current.style.transform = `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${CONFIG_GONGUE.perspective.scaleXCenter}, ${CONFIG_GONGUE.rest.scaleY})`;
    }
  } else if (instId === 'mineiro') {
    if (mineiroStickRef.current) {
      mineiroStickRef.current.style.transition = 'none';
      mineiroStickRef.current.style.transform = `translate3d(0, ${CONFIG_MINEIRO.backWeak.y}px, 0) scale(${CONFIG_MINEIRO.backWeak.scale}) rotateZ(${CONFIG_MINEIRO.backWeak.rotateZ}deg)`;
    }
  } else if (instId === 'agbe') {
    if (agbeWholeRef.current) {
      agbeWholeRef.current.style.transition = 'none';
      agbeWholeRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  }
}
