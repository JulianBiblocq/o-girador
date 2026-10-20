// ============================================================================
// FLASH / HALO / STATIC EFFECTS KEYFRAMES
// ============================================================================

export const KEYFRAMES_HALO = [
  { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.6)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_FLASH_STRONG: Keyframe[] = [
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_FLASH_WEAK: Keyframe[] = [
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(0.8)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
];

export const KEYFRAMES_FLASH_VIBRATE: Keyframe[] = [
  { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.2 },
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1.05)', offset: 0.4 },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.6 },
  { opacity: 0.3, transform: 'translate(-50%, -50%) scale(1.02)', offset: 0.8 },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_TIMBAL_G: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_A: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_S: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_S_WEAK: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_D: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_P: Keyframe[] = [];

export const KEYFRAMES_AGBE_STRETCH_Y_STRONG = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.15)', offset: 0.3 },
  { transform: 'scaleY(1)' },
];

export const KEYFRAMES_AGBE_STRETCH_Y_WEAK = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.08)', offset: 0.3 },
  { transform: 'scaleY(1)' },
];

export const KEYFRAMES_AGBE_STRETCH_X_STRONG = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.15)', offset: 0.3 },
  { transform: 'scaleX(1)' },
];

export const KEYFRAMES_AGBE_STRETCH_X_WEAK = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.08)', offset: 0.3 },
  { transform: 'scaleX(1)' },
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
  { transform: 'translate(0, 0) scale(1)' },
];
