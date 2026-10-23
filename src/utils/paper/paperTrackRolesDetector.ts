/**
 * Détection des rôles instrumentaux actifs dans une partition papier (< 50 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { disambiguateAllPresetPatterns } from './paperRoleDisambiguator';

export function detectActivePaperRoles(preset: PaperPreset): Set<string> {
  const active = new Set<string>();
  const sanitizedPatterns = disambiguateAllPresetPatterns(preset.patterns || {});
  const secEntries = Object.entries(sanitizedPatterns);
  const baseMap = secEntries[0]?.[1] || {};

  secEntries.forEach(([, pupitreMap]) => {
    Object.entries(pupitreMap).forEach(([roleKey, steps]) => {
      const code = roleKey.toLowerCase();
      let stepArr: any[] = Array.isArray(steps) ? steps : [];
      const rawStepVal: any = steps;
      if (typeof rawStepVal === 'string' && /^(base|idem|%)$/i.test(rawStepVal.trim())) {
        const baseVal = (baseMap as any)[roleKey];
        if (Array.isArray(baseVal)) stepArr = baseVal;
      }
      const hasHit = stepArr.some((s) => s !== 0 && s !== '0' && s !== '' && s !== '.' && s !== '-' && s !== null && s !== undefined);
      if (hasHit) active.add(code);
    });
  });
  return active;
}
