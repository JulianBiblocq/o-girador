// Helper functions for random micro-variations (Humanisation / "balanço")
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomSign = () => (Math.random() > 0.5 ? 1 : -1);

// ============================================================================
// TABLEAUX DE BORD - VARIABLES DE PHYSIQUE DES BAGUETTES (À AJUSTER)
// Modifiez ces valeurs à chaud pour tester le rendu de l'animation.
// ============================================================================

export const PHYSICS_ALFAIA = {
  strong: {
    windUpScale: 1.15,
    windUpDuration: 100, // ms
    impactScale: 0.85,
    impactTranslateY: -220, // plonge profondément
    impactRotateX: 55,
    impactDuration: 25,
    reboundDuration: 225,
  },
  weak: {
    windUpScale: 1.05,
    windUpDuration: 80,
    impactScale: 0.95,
    impactTranslateY: -130, // plonge modérément
    impactRotateX: 35,
    impactDuration: 20,
    reboundDuration: 200,
  },
  randomXRange: 15,
  randomYRange: 15
};

export const PHYSICS_DRUM = {
  strong: {
    windUpScale: 1.15,
    windUpDuration: 90,
    impactScale: 0.85,
    impactTranslateY: -150,
    impactRotateX: 45,
    impactDuration: 20,
    reboundDuration: 190,
  },
  weak: {
    windUpScale: 1.05,
    windUpDuration: 70,
    impactScale: 0.95,
    impactTranslateY: -90,
    impactRotateX: 25,
    impactDuration: 15,
    reboundDuration: 165,
  },
  randomXRange: 10,
  randomYRange: 10
};

export const PHYSICS_GONGUE = {
  strong: {
    windUpDuration: 60,
    impactTranslateY: -50,
    impactDuration: 20,
    reboundDuration: 220,
  },
  weak: {
    windUpDuration: 50,
    impactTranslateY: -20,
    impactDuration: 15,
    reboundDuration: 185,
  },
  randomXRange: 5,
  randomYRange: 5
};

export const PHYSICS_MINEIRO = {
  strong: {
    windUpDuration: 50,
    impactTranslateY: -20,
    impactDuration: 20,
    reboundDuration: 230,
  },
  weak: {
    windUpDuration: 40,
    impactTranslateY: -10,
    impactDuration: 15,
    reboundDuration: 195,
  },
  randomXRange: 3,
  randomYRange: 3
};

export const PHYSICS_AGBE = {
  strong: {
    windUpDuration: 70,
    impactTranslateX: 130,
    impactDuration: 30,
    reboundDuration: 250,
  },
  weak: {
    windUpDuration: 60,
    impactTranslateX: 80,
    impactDuration: 25,
    reboundDuration: 215,
  },
  randomXRange: 5,
  randomYRange: 5
};

export const PHYSICS_TIMBAL = {
  strong: {
    windUpScale: 1.12,
    windUpDuration: 90,
    impactScale: 0.98,
    impactTranslateY: 100, // Timbal hand hits downwards
    impactRotateX: 15,
    impactDuration: 25,
    reboundDuration: 235,
  },
  weak: {
    windUpScale: 1.06,
    windUpDuration: 70,
    impactScale: 0.99,
    impactTranslateY: 60,
    impactRotateX: 5,
    impactDuration: 20,
    reboundDuration: 210,
  },
  randomXRange: 8,
  randomYRange: 8
};

// ============================================================================

export function getTotalDuration(physicsBlock: any, isStrong: boolean): number {
  const p = isStrong ? physicsBlock.strong : physicsBlock.weak;
  return p.windUpDuration + p.impactDuration + p.reboundDuration;
}

// Alfaia Animation Keyframes Generator
export function generateAlfaiaKeyframes(stroke: string, isLeft: boolean): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['D', 'E', 'I', 'X', 'C'].includes(stroke);
  const p = isStrong ? PHYSICS_ALFAIA.strong : PHYSICS_ALFAIA.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(2, PHYSICS_ALFAIA.randomXRange);
  const randY = randomSign() * randomRange(2, PHYSICS_ALFAIA.randomYRange);

  const reposY = isStrong ? -100 : 0;
  const reposRotX = isStrong ? 15 : 30;

  if (isVibrate) {
    return [
        { transform: `translate(${randX}px, ${reposY + randY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-in-out' },
        { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY - 18 + randY * 0.2}px) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translateX(${18 - randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
      ];
  }

  let targetY = p.impactTranslateY + randY;
  let targetRotX = p.impactRotateX;
  let targetRotZ = 0;

  if (stroke === 'x' || stroke === 'X') {
    targetRotZ = isLeft ? -16 : 16;
  } else if (stroke === 'c' || stroke === 'C') {
    targetRotZ = isLeft ? 16 : -16;
    targetY = p.impactTranslateY * 0.7 + randY; // Cerclage is less deep
  }

  const windUpY = reposY + 20; // L'élan lève légèrement la baguette

  return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'ease-out' },
      { transform: `translate(0px, ${windUpY}px) rotateX(${reposRotX - 10}deg) rotateZ(${targetRotZ * 0.5}deg) scale(${p.windUpScale})`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translate(${randX}px, ${targetY}px) rotateX(${targetRotX}deg) rotateZ(${targetRotZ}deg) scale(${p.impactScale})`, offset: t2, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
}

// Drum (Caixa/Tarol) Keyframes Generator
export function generateDrumKeyframes(stroke: string, isLeft: boolean): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['D', 'E', 'R', 'F', 'X', 'C'].includes(stroke);
  const p = isStrong ? PHYSICS_DRUM.strong : PHYSICS_DRUM.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(2, PHYSICS_DRUM.randomXRange);
  const randY = randomSign() * randomRange(2, PHYSICS_DRUM.randomYRange);

  const reposY = isStrong ? -60 : 0;
  const reposRotX = isStrong ? 10 : 25;

  if (isVibrate) {
    return [
        { transform: `translate(${randX}px, ${reposY + randY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-in-out' },
        { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY - 18 + randY * 0.2}px) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translateX(${18 - randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
      ];
  }

  if (stroke === 'R' || stroke === 'r') {
    // Rufada - Rebonds multiples très rapides
    const hitY = PHYSICS_DRUM.weak.impactTranslateY;
    return [
        { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translate(${randX}px, ${hitY + randY}px) rotateZ(0deg) scale(1)`, offset: 0.25, easing: 'linear' },
        { transform: `translate(${randX * 0.8}px, ${hitY + 15}px) rotateZ(0deg) scale(1)`, offset: 0.40, easing: 'linear' },
        { transform: `translate(${randX * 0.6}px, ${hitY + randY}px) rotateZ(0deg) scale(1)`, offset: 0.55, easing: 'linear' },
        { transform: `translate(${randX * 0.4}px, ${hitY + 15}px) rotateZ(0deg) scale(1)`, offset: 0.70, easing: 'linear' },
        { transform: `translate(${randX * 0.2}px, ${hitY + randY}px) rotateZ(0deg) scale(1)`, offset: 0.85, easing: 'ease-out' },
        { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
      ];
  }

  let targetY = p.impactTranslateY + randY;
  let targetRotX = p.impactRotateX;
  let targetRotZ = 0;

  if (stroke === 'f' || stroke === 'F') {
    targetRotZ = isLeft ? 16 : -16;
  } else if (stroke === 'x' || stroke === 'X') {
    targetRotZ = isLeft ? -16 : 16;
  } else if (stroke === 'c' || stroke === 'C') {
    targetRotZ = isLeft ? 16 : -16;
  }

  const windUpY = reposY + 15;

  return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'ease-out' },
      { transform: `translate(0px, ${windUpY}px) rotateX(${reposRotX - 8}deg) rotateZ(${targetRotZ * 0.5}deg) scale(${p.windUpScale})`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translate(${randX}px, ${targetY}px) rotateX(${targetRotX}deg) rotateZ(${targetRotZ}deg) scale(${p.impactScale})`, offset: t2, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
}

// Gonguê Keyframes Generator
export function generateGongueKeyframes(stroke: string): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['G', 'A'].includes(stroke);
  const p = isStrong ? PHYSICS_GONGUE.strong : PHYSICS_GONGUE.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(1, PHYSICS_GONGUE.randomXRange);
  const randY = randomSign() * randomRange(1, PHYSICS_GONGUE.randomYRange);

  const reposRotX = isStrong ? 4 : 8;

  if (isVibrate) {
    return [
        { transform: `translateY(0px) rotateX(${reposRotX}deg)`, easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randX}px) translateY(${-10 + randY}px)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translateX(${10 - randX}px) translateY(${10 - randY}px)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randX}px) translateY(${10 - randY}px)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: `translateY(0px) rotateX(${reposRotX}deg)` }
      ];
  }

  // Le pivot visuel du gonguê est top center, l'élan va vers le bas (Y positif), puis remonte pour frapper
  const windUpY = 15;

  return [
      { transform: `translateY(0px) rotateX(${reposRotX}deg)`, easing: 'ease-out' },
      { transform: `translateY(${windUpY}px) rotateX(${reposRotX + 5}deg)`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translate(${randX}px, ${p.impactTranslateY + randY}px) rotateX(0deg)`, offset: t2, easing: 'ease-out' },
      { transform: `translateY(0px) rotateX(${reposRotX}deg)` }
    ];
}

// Mineiro Keyframes Generator
export function generateMineiroKeyframes(stroke: string): Keyframe[] {
  const normalizedStroke = (stroke === 'F' || stroke === 'f') ? 'D' : stroke;
  const isStrong = ['D', 'P', 'T', 'L', 'B'].includes(normalizedStroke);
  const p = isStrong ? PHYSICS_MINEIRO.strong : PHYSICS_MINEIRO.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randOffset = randomSign() * randomRange(1, PHYSICS_MINEIRO.randomYRange);

  if (normalizedStroke === 'P' || normalizedStroke === 'D') {
    return [
        { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
        { transform: 'translateY(10px) scale(1.02)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateY(${p.impactTranslateY + randOffset}px) scale(0.95)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateY(0px) scale(1)' }
      ];
  } else if (stroke === 'p') {
    return [
        { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
        { transform: 'translateY(5px) scale(1.01)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateY(${p.impactTranslateY + randOffset}px) scale(0.98)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateY(0px) scale(1)' }
      ];
  } else if (stroke === 'T') {
    return [
        { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
        { transform: 'translateY(-10px) scale(0.98)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateY(${-p.impactTranslateY + randOffset}px) scale(1.05)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateY(0px) scale(1)' }
      ];
  } else if (stroke === 't') {
    return [
        { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
        { transform: 'translateY(-5px) scale(0.99)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateY(${-p.impactTranslateY + randOffset}px) scale(1.02)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateY(0px) scale(1)' }
      ];
  } else if (stroke === 'L' || stroke === 'l') {
    return [
        { transform: `translate(${-200 + randOffset}px, 0)`, easing: 'ease-in-out' },
        { transform: 'translate(0, 0)' }
      ];
  } else if (stroke === 'B' || stroke === 'b') {
    return [
        { transform: 'translate(0, 0)', easing: 'ease-in-out' },
        { transform: `translate(${-15 + randOffset}px, 0)`, offset: 0.25 },
        { transform: `translate(${15 - randOffset}px, 0)`, offset: 0.75 },
        { transform: 'translate(0, 0)' }
      ];
  }

  return [{ transform: 'translate(0, 0)' }];
}

// Agbê Keyframes Generator
export function generateAgbeKeyframes(stroke: string): Keyframe[] {
  const isStrong = ['D', 'E', 'S', 'V', 'B'].includes(stroke);
  const p = isStrong ? PHYSICS_AGBE.strong : PHYSICS_AGBE.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(1, PHYSICS_AGBE.randomXRange);
  const randY = randomSign() * randomRange(1, PHYSICS_AGBE.randomYRange);

  if (stroke === 'D' || stroke === 'd') {
    return [
        { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', easing: 'ease-out' },
        { transform: `translateX(-20px) translateY(5px) rotateZ(-5deg)`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateX(${p.impactTranslateX + randX}px) translateY(${-20 + randY}px) rotateZ(25deg)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)' }
      ];
  }

  if (stroke === 'E' || stroke === 'e') {
    return [
        { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', easing: 'ease-out' },
        { transform: `translateX(20px) translateY(5px) rotateZ(5deg)`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translateX(${-p.impactTranslateX + randX}px) translateY(${-20 + randY}px) rotateZ(-25deg)`, offset: t2, easing: 'ease-out' },
        { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)' }
      ];
  }
  
  return [{ transform: 'translate(0, 0)' }];
}

// Timbal Keyframes Generator
export function generateTimbalKeyframes(stroke: string, isLeft: boolean): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['G', 'A', 'S', 'D', 'P'].includes(stroke);
  const p = isStrong ? PHYSICS_TIMBAL.strong : PHYSICS_TIMBAL.weak;
  
  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(2, PHYSICS_TIMBAL.randomXRange);
  const randY = randomSign() * randomRange(2, PHYSICS_TIMBAL.randomYRange);

  if (isVibrate) {
    return [
        { transform: `translate(0px, 0px) rotateX(0deg) scale(1)`, easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randY * 0.2}px) translateY(${-10 + randY * 0.2}px) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translateX(${10 - randY * 0.2}px) translateY(${10 - randY * 0.2}px) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randY * 0.2}px) translateY(${10 - randY * 0.2}px) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: `translate(0px, 0px) rotateX(0deg) scale(1)` }
      ];
  }

  let targetY = p.impactTranslateY + randY;
  let targetRotX = p.impactRotateX;

  if (stroke === 'G' || stroke === 'g') {
    targetY = -250;
    targetRotX = -5;
  } else if (stroke === 'A' || stroke === 'a') {
    targetY = 500;
    targetRotX = 15;
  }

  const windUpY = -40;

  return [
      { transform: `translate(0px, 0px) rotateX(0deg) scale(1)`, easing: 'ease-out' },
      { transform: `translate(0px, ${windUpY}px) rotateX(-5deg) scale(${p.windUpScale})`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translate(${randX}px, ${targetY}px) rotateX(${targetRotX}deg) scale(${p.impactScale})`, offset: t2, easing: 'ease-out' },
      { transform: `translate(0px, 0px) rotateX(0deg) scale(1)` }
    ];
}

// Static Halo / Flash Effects
export const KEYFRAMES_HALO = [
  { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.6)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];

export const KEYFRAMES_FLASH_STRONG: Keyframe[] = [
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];

export const KEYFRAMES_FLASH_WEAK: Keyframe[] = [
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(0.8)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' }
];

export const KEYFRAMES_FLASH_VIBRATE: Keyframe[] = [
  { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.2 },
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1.05)', offset: 0.4 },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.6 },
  { opacity: 0.3, transform: 'translate(-50%, -50%) scale(1.02)', offset: 0.8 },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];

// Compatibility exports for Agbê static stretches in AoVivoOverlay
export const KEYFRAMES_AGBE_STRETCH_Y_STRONG = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.15)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];
export const KEYFRAMES_AGBE_STRETCH_Y_WEAK = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.08)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];
export const KEYFRAMES_AGBE_STRETCH_X_STRONG = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.15)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];
export const KEYFRAMES_AGBE_STRETCH_X_WEAK = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.08)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];
export const KEYFRAMES_AGBE_SHAKE = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.1 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.2 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.3 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.4 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.5 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.6 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.7 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.8 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.9 },
  { transform: 'translate(0, 0) scale(1)' }
];
