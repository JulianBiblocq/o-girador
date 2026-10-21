export interface EcoConfig {
  disableFx: boolean;
  disableEq: boolean;
  disableAnimations: boolean;
}

export const detectEcoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('o-girador-eco-mode');
  if (saved !== null) {
    return saved === 'true';
  }
  // Détection matérielle stricte : seuls les appareils avec <= 2 cœurs
  // sont placés en mode éco par défaut. Zéro bridage basé sur l'User-Agent mobile.
  const cores = navigator.hardwareConcurrency;
  const isVeryLowEndCPU = cores !== undefined && cores <= 2;
  return isVeryLowEndCPU;
};
