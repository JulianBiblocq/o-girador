/**
 * Convertit toutes les frappes vocales ('P' ou 'C') d'un tableau activeSteps
 * pour forcer le rôle de la piste de destination.
 * Ne touche ni aux notes, ni aux lyrics, ni aux durées.
 * Impact CPU : O(n) trivial, aucun Reflow/Paint.
 */
export function convertStepsToVocalRole(
  steps: (string | number | [string, string])[],
  targetRole: 'P' | 'C'
): (string | number | [string, string])[] {
  const sourceToReplace = targetRole === 'P' ? 'C' : 'P';
  return steps.map((step: string | number | [string, string]) => {
    if (step === sourceToReplace) return targetRole;
    if (step === targetRole) return step;
    if (Array.isArray(step)) {
      return step.map((s: string) => s === sourceToReplace ? targetRole : s) as [string, string];
    }
    return step;
  });
}
