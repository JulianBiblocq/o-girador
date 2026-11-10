export interface HardwareInfo {
  ram: number | undefined;
  cores: number | undefined;
  isVeryLowEnd: boolean;
}

/**
 * Detection materielle stricte (coeurs CPU + RAM rapportes par le navigateur).
 * Zero sniffing User-Agent : seuls les appareils reellement anciens (<= 2 coeurs ou <= 2 Go)
 * sont marques `isVeryLowEnd`, ce qui ne declenche JAMAIS que le Palier 1 Eco (visuel).
 */
export function detectHardwareCapabilities(): HardwareInfo {
  let cores: number | undefined;
  let ram: number | undefined;
  if (typeof navigator !== 'undefined') {
    if ('hardwareConcurrency' in navigator) cores = navigator.hardwareConcurrency;
    if ('deviceMemory' in navigator) ram = (navigator as any).deviceMemory;
  }
  const isVeryLowEnd = (cores !== undefined && cores <= 2) || (ram !== undefined && ram <= 2);
  return { ram, cores, isVeryLowEnd };
}
