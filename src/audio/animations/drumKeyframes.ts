/**
 * O Girador - Alfaia & Drum (Caixa/Tarol) Keyframe Generators
 */

import { buildStickKeyframes } from './stickBaseKeyframes';

export function generateAlfaiaKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100,
  isLeftHanded: boolean = false
): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm, 'alfaia', isLeftHanded);
}

export function generateDrumKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100,
  isLeftHanded: boolean = false
): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm, 'drum', isLeftHanded);
}
