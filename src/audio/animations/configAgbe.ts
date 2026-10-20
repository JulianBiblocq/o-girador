/**
 * O Girador - Agbê / Xequerê Biomechanical Animation Configuration
 */

export const CONFIG_AGBE = {
  dimensions: {
    radius: 405,
    amplitude: 30,
    beadRadius: 8,
  },
  transformOrigin: '50% 12%',
  lateralStrong: {
    duration: 260,
    translateX: 52,
    rotateZ: 16,
    microJitterX: 4,
    microJitterZ: 2,
  },
  lateralWeak: {
    duration: 200,
    translateX: 24,
    rotateZ: 7,
    microJitterX: 2,
    microJitterZ: 1,
  },
  impactBase: {
    duration: 220,
    translateY: -28,
    squashScaleX: 1.05,
    squashScaleY: 0.95,
  },
  shaking: {
    duration: 180,
    jitterX: 10,
    jitterZ: 4,
  },
};

export const PHYSICS_AGBE = {
  strong: {
    windUpMs: 39,
    impactMs: 26,
    reboundMs: 39,
    recoveryMs: 156,
    totalMs: 260,
  },
  weak: {
    windUpMs: 30,
    impactMs: 20,
    reboundMs: 30,
    recoveryMs: 120,
    totalMs: 200,
  },
  ghost: {
    windUpMs: 18,
    impactMs: 12,
    reboundMs: 18,
    recoveryMs: 72,
    totalMs: 120,
  },
};
