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
}

/**
 * Utility to detect device hardware capabilities using native web APIs.
 * Classifies device into performance tiers to prevent Web Audio buffer underruns.
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

  // Classification threshold
  let recommendedQuality: AudioQuality = 'high';
  let initialLOD: LODLevel = 0;

  const isLowEndCPU = cores !== undefined && cores <= 4;
  const isLowEndRAM = ram !== undefined && ram <= 4;

  const isMidEndCPU = cores !== undefined && cores <= 8;
  const isMidEndRAM = ram !== undefined && ram <= 8;

  if (isLowEndCPU || isLowEndRAM) {
    recommendedQuality = 'low';
    initialLOD = 3; // Cut CSS animations, bypass EQ, bypass convolution Reverb
  } else if (isMidEndCPU || isMidEndRAM) {
    recommendedQuality = 'medium';
    initialLOD = 1; // Cut heavy CSS animations
  } else {
    recommendedQuality = 'high';
    initialLOD = 0;
  }

  return {
    ram,
    cores,
    recommendedQuality,
    initialLOD
  };
}
