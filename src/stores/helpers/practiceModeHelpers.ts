
export function resolveInitialPracticeMode(): boolean {
  if (typeof window === 'undefined') return true;
  // Par défaut à l'ouverture, tout le monde démarre en Mode Pratique épuré sur RODA
  return true;
}
