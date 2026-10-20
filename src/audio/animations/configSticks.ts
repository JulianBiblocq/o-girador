/**
 * O Girador - Stick & Drum/Alfaia Biomechanical Animation Configurations
 */

export const CONFIG_STICKS = {
  spacing: {
    targetXOffsetDrum: 18,
    targetXOffsetAlfaia: 48,
    targetXOffsetTimbal: 30,
    handSeparationX: 4,
    spreadX: 10,
    spreadY: 10,
  },
  angles: {
    drum: { left: -3, right: 3 },
    alfaia: { bacalhau: -4, macaneta: 4 },
    wristWhipAngle: 4.5,
    rotJitter: 6.0,
  },
  vShapeAngle: 7,
  wristWhipAngle: 2.2,
  humanize: {
    handSeparationX: 4,
    spreadX: 10,
    spreadY: 10,
    rotJitter: 2.0,
  },
  rest: {
    translateY: -85,
    scale: 0.92,
  },
  strong: {
    duration: 290,
    windUp: {
      offset: 0.15,
      translateY: 25,
      scaleAlfaia: 1.35,
      scaleDrum: 1.20,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -105,
      scale: 0.88,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -85,
      scale: 0.92,
      easing: 'linear',
    },
  },
  weak: {
    duration: 160,
    windUp: {
      offset: 0.15,
      translateY: -78,
      scaleAlfaia: 1.05,
      scaleDrum: 1.03,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -95,
      scale: 0.90,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -85,
      scale: 0.92,
      easing: 'linear',
    },
  },
  rufada: {
    duration: 200,
    baseY: -95,
    baseScale: 0.90,
    rotateZMax: 0.5,
    jitterY: 4,
    scaleVariation: 0.02,
  },
  crossClick: {
    duration: 240,
    windUpY: 15,
    scaleAlfaia: 1.30,
    scaleDrum: 1.20,
    rotateZLeft: 4,
    rotateZRight: -4,
  },
  rimShot: {
    duration: 200,
    windUpY: 20,
    windUpScale: 1.25,
    impactTranslateY: -45,
    impactScale: 0.95,
    rotateZLeft: -12,
    rotateZRight: 12,
    reboundTranslateY: -65,
  },
};

export const PHYSICS_ALFAIA = {
  strong: { windUpMs: 44, impactMs: 29, reboundMs: 44, recoveryMs: 173, totalMs: 290 },
  weak: { windUpMs: 24, impactMs: 16, reboundMs: 24, recoveryMs: 96, totalMs: 160 },
  ghost: { windUpMs: 15, impactMs: 10, reboundMs: 15, recoveryMs: 60, totalMs: 100 },
};

export const PHYSICS_DRUM = {
  strong: { windUpMs: 42, impactMs: 28, reboundMs: 42, recoveryMs: 168, totalMs: 280 },
  weak: { windUpMs: 22, impactMs: 15, reboundMs: 22, recoveryMs: 91, totalMs: 150 },
  ghost: { windUpMs: 14, impactMs: 9, reboundMs: 14, recoveryMs: 53, totalMs: 90 },
};
