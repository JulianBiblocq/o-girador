/**
 * O Girador - Mineiro Biomechanical Animation Configuration
 */

export type MineiroPole = 'frontStrong' | 'frontWeak' | 'backWeak' | 'backStrong';

export const CONFIG_MINEIRO = {
  frontStrong: {
    y: -28,
    scale: 0.95,
    rotateZ: 2.2,
  },
  frontWeak: {
    y: -7,
    scale: 0.99,
    rotateZ: 0.6,
  },
  backWeak: {
    y: 6,
    scale: 1.01,
    rotateZ: -0.6,
  },
  backStrong: {
    y: 24,
    scale: 1.05,
    rotateZ: -2.2,
  },
  lateralX: -32,
  durationTravelStrong: 160,
  durationTravelWeak: 110,
  durationLateral: 150,
  durationBarulho: 110,
  easingTravel: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export const PHYSICS_MINEIRO = {
  strong: {
    windUpMs: 24,
    impactMs: 16,
    reboundMs: 24,
    recoveryMs: 96,
    totalMs: 160,
  },
  weak: {
    windUpMs: 16,
    impactMs: 11,
    reboundMs: 16,
    recoveryMs: 67,
    totalMs: 110,
  },
  ghost: {
    windUpMs: 12,
    impactMs: 8,
    reboundMs: 12,
    recoveryMs: 48,
    totalMs: 80,
  },
};
