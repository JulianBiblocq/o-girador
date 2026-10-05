import { instrumentsConfig } from '../data';

export const COMPATIBLE_FAMILIES: Record<string, string[]> = {
  alfaias: ['alfaia', 'alfaia_meiao', 'alfaia_replica', 'marcante', 'meiao', 'repique'],
  caixas: ['caixa', 'tarol', 'caixa_1', 'caixa_2'],
  voices: ['puxador', 'coro', 'toada']
};

export function getInstrumentFamily(instId: string): string {
  const cleanId = (instId || '').toLowerCase();
  for (const [family, members] of Object.entries(COMPATIBLE_FAMILIES)) {
    if (members.some(m => cleanId.includes(m) || m.includes(cleanId))) {
      return family;
    }
  }
  return cleanId;
}

export function canTransferPatterns(source: any, target: any): boolean {
  if (!source || !target) return false;

  const sourceInstId = source.sourceInstId 
    ?? (source.instrumentIdx !== undefined ? instrumentsConfig[source.instrumentIdx]?.id : '')
    ?? source.id 
    ?? '';
  const targetInstId = target.sourceInstId
    ?? (target.instrumentIdx !== undefined ? instrumentsConfig[target.instrumentIdx]?.id : '')
    ?? target.id
    ?? '';

  if (sourceInstId && targetInstId && sourceInstId === targetInstId) return true;

  const sourceFamily = source.sourceFamily ?? getInstrumentFamily(sourceInstId);
  const targetFamily = target.sourceFamily ?? getInstrumentFamily(targetInstId);

  return sourceFamily === targetFamily && sourceFamily !== '';
}

/**
 * Convertit atomiquement les frappes vocales pour forcer le rôle de la piste cible ('P' ou 'C').
 * Ne touche ni aux notes, ni aux paroles, ni aux silences.
 */
export function convertStepsToVocalRole(
  steps: (string | number | [string, string])[],
  targetRole: 'P' | 'C'
): (string | number | [string, string])[] {
  const sourceToReplace = targetRole === 'P' ? 'C' : 'P';
  return steps.map(step => {
    if (step === sourceToReplace) return targetRole;
    if (step === targetRole) return step;
    if (Array.isArray(step)) {
      return step.map(s => s === sourceToReplace ? targetRole : s) as [string, string];
    }
    return step;
  });
}
