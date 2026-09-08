/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure mathematical interpolation for automation parameters (Volume, Pan, Reverb)
 * Executes outside React renders (Zero Render Thrashing, 60 FPS).
 *
 * @param startVal Value at the beginning of the measure (from previous measure)
 * @param endVal Value at the end of the measure (current measure target)
 * @param progress Normalized progress in the measure t in [0, 1]
 * @param transition Transition curve: 'immediate' | 'ramp' | 'bezier'
 * @returns Interpolated value at progress t
 */
export function interpolateAutomationValue(
  startVal: number,
  endVal: number,
  progress: number,
  transition: 'immediate' | 'ramp' | 'bezier' = 'immediate'
): number {
  const t = Math.max(0, Math.min(1, progress));

  if (transition === 'ramp') {
    // Linear interpolation
    return startVal + (endVal - startVal) * t;
  }

  if (transition === 'bezier') {
    // Smooth cubic S-curve (smoothstep): 3t² - 2t³
    const s = t * t * (3 - 2 * t);
    return startVal + (endVal - startVal) * s;
  }

  // 'immediate': jumps directly to endVal
  return endVal;
}
