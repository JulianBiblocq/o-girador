/**
 * O Girador - Gonguê Biomechanical Animation Configuration
 */

export const CONFIG_GONGUE = {
  perspective: {
    scaleXBas: 1.38,
    scaleXHaut: 0.86,
    scaleXCenter: 1.05,
  },
  rest: {
    translateY: 0,
    rotateX: 6,
    scaleY: 0.98,
  },
  strong: {
    duration: 220,
    windUp: {
      offset: 0.15,
      translateY: 20,
      scaleBoost: 1.12,
      rotateX: 12,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -50,
      scaleBoost: 0.94,
      rotateX: 0,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -15,
      scaleBoost: 0.98,
      rotateX: 6,
      easing: 'linear',
    },
  },
  weak: {
    duration: 160,
    windUp: {
      offset: 0.15,
      translateY: 8,
      scaleBoost: 1.04,
      rotateX: 8,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -22,
      scaleBoost: 0.96,
      rotateX: 0,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -7,
      scaleBoost: 0.98,
      rotateX: 6,
      easing: 'linear',
    },
  },
  humanize: {
    spreadX: 4,
    spreadY: 4,
  },
};

export const PHYSICS_GONGUE = {
  strong: {
    windUpMs: 33,
    impactMs: 22,
    reboundMs: 33,
    recoveryMs: 132,
    totalMs: 220,
  },
  weak: {
    windUpMs: 24,
    impactMs: 16,
    reboundMs: 24,
    recoveryMs: 96,
    totalMs: 160,
  },
  ghost: {
    windUpMs: 15,
    impactMs: 10,
    reboundMs: 15,
    recoveryMs: 60,
    totalMs: 100,
  },
};
