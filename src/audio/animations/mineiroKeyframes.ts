/**
 * O Girador - Mineiro Animation Keyframe Generator
 */

import { CONFIG_MINEIRO, MineiroPole } from './configMineiro';

export function generateMineiroKeyframes(stroke: string, currentPole: MineiroPole = 'backWeak'): Keyframe[] {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  const ease = CONFIG_MINEIRO.easingTravel;
  const getPosTransform = (p: MineiroPole) => {
    const cfg = CONFIG_MINEIRO[p];
    return `translate3d(0, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)`;
  };
  const fromPos = getPosTransform(currentPole);

  switch (norm) {
    case 'P': {
      const toPos = getPosTransform('frontStrong');
      if (currentPole === 'frontStrong') {
        return [
          { transform: fromPos },
          { transform: `translate3d(0, ${CONFIG_MINEIRO.frontStrong.y - 4}px, 0) scale(${CONFIG_MINEIRO.frontStrong.scale * 0.98}) rotateZ(${CONFIG_MINEIRO.frontStrong.rotateZ + 0.5}deg)`, offset: 0.35, easing: 'ease-out' },
          { transform: toPos }
        ];
      }
      return [{ transform: fromPos, easing: ease }, { transform: toPos }];
    }
    case 'p': {
      return [{ transform: fromPos, easing: ease }, { transform: getPosTransform('frontWeak') }];
    }
    case 'T': {
      const toPos = getPosTransform('backStrong');
      if (currentPole === 'backStrong') {
        return [
          { transform: fromPos },
          { transform: `translate3d(0, ${CONFIG_MINEIRO.backStrong.y + 4}px, 0) scale(${CONFIG_MINEIRO.backStrong.scale * 1.02}) rotateZ(${CONFIG_MINEIRO.backStrong.rotateZ - 0.5}deg)`, offset: 0.35, easing: 'ease-out' },
          { transform: toPos }
        ];
      }
      return [{ transform: fromPos, easing: ease }, { transform: toPos }];
    }
    case 't': {
      return [{ transform: fromPos, easing: ease }, { transform: getPosTransform('backWeak') }];
    }
    case 'L':
    case 'l': {
      const cfg = CONFIG_MINEIRO[currentPole];
      return [
        { transform: fromPos },
        { transform: `translate3d(${CONFIG_MINEIRO.lateralX}px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(-3deg)`, offset: 0.4, easing: 'ease-out' },
        { transform: fromPos }
      ];
    }
    case 'B':
    case 'b': {
      const cfg = CONFIG_MINEIRO[currentPole];
      return [
        { transform: `translate3d(-4px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)` },
        { transform: `translate3d(4px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)`, offset: 0.5 },
        { transform: fromPos }
      ];
    }
    default:
      return [{ transform: fromPos, easing: ease }, { transform: getPosTransform('frontWeak') }];
  }
}
