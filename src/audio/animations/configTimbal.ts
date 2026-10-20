/**
 * O Girador - Timbal Biomechanical Animation Configuration
 */

export const CONFIG_TIMBAL = {
  baseOffsetY: 320,
  handSpread: 600,
  targetXOffset: 370,
  handScale: 1.5,
  vShapeAngle: 15,
  grave: {
    duration: 220,
    impactY: -280,
    scale: 0.94,
    reboundY: -210,
  },
  slap: {
    duration: 190,
    windUpY: 15,
    windUpScale: 1.15,
    impactY: -60,
    impactScale: 0.96,
    reboundY: -60,
  },
  aberto: {
    duration: 180,
    impactY: 90,
    scale: 1.0,
    reboundY: 55,
  },
  ghost: {
    duration: 120,
    impactY: 10,
    reboundY: 0,
    jitterY: 4,
  },
  rest: {
    y: 20,
    scale: 1.0,
  },
};

export const PHYSICS_TIMBAL = {
  grave: {
    windUpMs: 33,
    impactMs: 22,
    reboundMs: 33,
    recoveryMs: 132,
    totalMs: 220,
  },
  slap: {
    windUpMs: 28,
    impactMs: 19,
    reboundMs: 28,
    recoveryMs: 115,
    totalMs: 190,
  },
  aberto: {
    windUpMs: 27,
    impactMs: 18,
    reboundMs: 27,
    recoveryMs: 108,
    totalMs: 180,
  },
  ghost: {
    windUpMs: 18,
    impactMs: 12,
    reboundMs: 18,
    recoveryMs: 72,
    totalMs: 120,
  },
};
