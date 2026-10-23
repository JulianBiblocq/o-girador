/**
 * Helper centralisé de vérification du bypass d'automations (< 45 lignes).
 */

export interface GlobalAutomationBypass {
  all: boolean;
  volume: boolean;
  pan: boolean;
  reverb: boolean;
}

export function isAutomationBypassed(
  track: { automationBypass?: { volume?: boolean; pan?: boolean; reverb?: boolean } } | null | undefined,
  param: 'volume' | 'pan' | 'reverb',
  globalBypass?: GlobalAutomationBypass | null
): boolean {
  if (globalBypass?.all) return true;
  if (globalBypass?.[param]) return true;
  return Boolean(track?.automationBypass?.[param]);
}

export function isMasterVolumeBypassedHelper(
  isMasterVolBypassed?: boolean,
  globalBypass?: GlobalAutomationBypass | null
): boolean {
  if (globalBypass?.all || globalBypass?.volume) return true;
  return Boolean(isMasterVolBypassed);
}
