/**
 * Helper d'étanchéité SaaS Multi-Tenant pour Sequenciador.
 * Isolé strictement au groupe historique `samambaia` (`sammbia` inclus pour rétrocompatibilité).
 */

export function isLegacySamambaiaGroup(groupId?: string | null): boolean {
  const clean = String(groupId || '').trim().toLowerCase();
  return clean === 'samambaia' || clean === 'sammbia';
}
