
import { StepSculptValue } from '../../../types';

export const SCISSORS_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238b2a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='6' cy='6' r='3'/><circle cx='6' cy='18' r='3'/><line x1='20' y1='4' x2='8.12' y2='15.88'/><line x1='14.47' y1='14.48' x2='20' y2='20'/><line x1='8.12' y1='8.12' x2='12' y2='12'/></svg>") 6 6, crosshair`;

export const GLUE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%238b2a1a' stroke='%23f4ecd8' stroke-width='1.5'><path d='M12 2C12 2 5 11 5 16a7 7 0 0 0 14 0c0-5-7-14-7-14z'/><circle cx='10' cy='14' r='1.5' fill='%23f4ecd8'/></svg>") 12 20, pointer`;

export const getSculptNumber = (val: StepSculptValue | undefined, fallback = 100, subIndex = 0): number => {
  if (val === undefined) return fallback;
  if (Array.isArray(val)) return val[subIndex] ?? val[0] ?? fallback;
  return typeof val === 'number' ? val : fallback;
};
