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
  const cores = navigator.hardwareConcurrency;
  const isLowEndCPU = cores !== undefined && cores <= 4;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  return isLowEndCPU || isMobile;
};
