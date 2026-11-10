/**
 * polarityGain.ts — Inversion de polarité 180° « Zéro Nœud Supplémentaire » (< 70 lignes).
 * Le signe est porté par le gain d'entrée déjà présent de la tranche (`trackInputs` / `busInputs`).
 * Chaque étage n'applique QUE son propre signe : le produit physique du graphe garantit -1 * -1 = +1.
 */

export const POLARITY_RAMP_SEC = 0.008;

export type PolaritySign = 1 | -1;

export function getPolaritySign(t?: { phaseInverted?: boolean } | null): PolaritySign {
  return t?.phaseInverted ? -1 : 1;
}

/** Produit des signes d'une chaîne (piste puis ancêtres) : utilisé par le Bounce hors-ligne. */
export function multiplyPolarity(...items: Array<{ phaseInverted?: boolean } | null | undefined>): PolaritySign {
  let sign: PolaritySign = 1;
  for (const it of items) if (it?.phaseInverted) sign = (sign === 1 ? -1 : 1);
  return sign;
}

const appliedTargets = new WeakMap<object, number>();

interface PolarityParamLike {
  value: number;
  cancelAndHoldAtTime?: (t: number) => unknown;
  cancelScheduledValues?: (t: number) => unknown;
  setValueAtTime?: (v: number, t: number) => unknown;
  linearRampToValueAtTime?: (v: number, t: number) => unknown;
}

/**
 * Applique `baseGain * signe` sur le gain d'entrée avec une rampe linéaire de 8 ms (passage doux par zéro, zéro clic).
 * `immediate` : affectation directe (création du nœud, contexte non démarré).
 */
export function applyInputPolarity(
  node: { gain?: PolarityParamLike; context?: { currentTime?: number } } | null | undefined,
  baseGain: number,
  inverted: boolean,
  immediate = false
): void {
  const param = node?.gain;
  if (!node || !param) return;
  const target = baseGain * (inverted ? -1 : 1);
  const prev = appliedTargets.get(node);
  if (prev === target) return;
  appliedTargets.set(node, target);
  if (prev === undefined && !immediate) {
    try { if (Math.abs(param.value - target) < 1e-6) return; } catch (_) {}
  }

  const now = node.context?.currentTime;
  if (immediate || typeof now !== 'number' || !param.linearRampToValueAtTime) {
    try { param.value = target; } catch (_) {}
    return;
  }
  try {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { param.cancelScheduledValues?.(now); param.setValueAtTime?.(param.value, now); }
    param.linearRampToValueAtTime(target, now + POLARITY_RAMP_SEC);
  } catch (_) {
    try { param.value = target; } catch (_) {}
  }
}
