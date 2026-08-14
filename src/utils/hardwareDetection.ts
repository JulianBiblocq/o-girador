/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AudioQuality = 'high' | 'medium' | 'low';
export type LODLevel = 0 | 1 | 2 | 3 | 4;

export interface HardwareInfo {
  ram: number | undefined;
  cores: number | undefined;
  recommendedQuality: AudioQuality;
  initialLOD: LODLevel;
  isUltraEcoRecommended: boolean;
}

/**
 * Utility to detect device hardware capabilities using native web APIs.
 * Classifies device into performance tiers to prevent Web Audio buffer underruns.
 *
 * IMPORTANT: Classification is based ONLY on real hardware metrics (cores, RAM)
 * reported by the browser. User-Agent sniffing is no longer used for LOD assignment
 * because it produced false positives on modern tablets, disabling the playhead
 * animation on devices perfectly capable of running it at 60 FPS.
 */
export function detectHardwareCapabilities(): HardwareInfo {
  let cores: number | undefined = undefined;
  let ram: number | undefined = undefined;

  if (typeof navigator !== 'undefined') {
    if ('hardwareConcurrency' in navigator) {
      cores = navigator.hardwareConcurrency;
    }
    if ('deviceMemory' in navigator) {
      ram = (navigator as any).deviceMemory;
    }
  }

  // Classification based purely on hardware metrics — no UA sniffing bias
  let recommendedQuality: AudioQuality = 'high';
  let initialLOD: LODLevel = 0;
  let isUltraEcoRecommended = false;

  const isUltraLowCPU = cores !== undefined && cores <= 2;
  const isUltraLowRAM = ram !== undefined && ram <= 2;

  const isLowEndCPU = cores !== undefined && cores <= 4;
  const isLowEndRAM = ram !== undefined && ram <= 4;

  const isMidEndCPU = cores !== undefined && cores <= 8;
  const isMidEndRAM = ram !== undefined && ram <= 8;

  if (isUltraLowCPU || isUltraLowRAM) {
    // Tier 3 Ultra-Eco: ONLY for genuinely ancient hardware (≤ 2 cores or ≤ 2 GB RAM)
    recommendedQuality = 'low';
    initialLOD = 4;
    isUltraEcoRecommended = true;
  } else if (isLowEndCPU || isLowEndRAM) {
    // Tier 2: 3-4 cores or 3-4 GB RAM — cut heavy CSS, bypass EQ & reverb, but keep playhead fluid
    recommendedQuality = 'low';
    initialLOD = 3;
  } else if (isMidEndCPU || isMidEndRAM) {
    // Tier 1: 5-8 cores or 5-8 GB RAM — cut only heavy CSS animations
    recommendedQuality = 'medium';
    initialLOD = 1;
  } else {
    // Tier 0: Full quality (8+ cores, 8+ GB RAM, or metrics unavailable)
    recommendedQuality = 'high';
    initialLOD = 0;
  }

  return {
    ram,
    cores,
    recommendedQuality,
    initialLOD,
    isUltraEcoRecommended
  };
}

