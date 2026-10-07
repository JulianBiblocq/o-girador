/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plafonnement de sécurité de la durée d'une note vocale (pur, sans React / Tone).
 *
 * `spanSteps` (attaque + prolongations explicites) est toujours respecté. Seule la « queue » due au decay
 * (`decaySteps - spanSteps`) est bornée : elle ne peut couvrir que des pas SILENCIEUX consécutifs, jamais
 * dépasser la prochaine attaque ni la fin du motif. Une note ne déborde donc jamais sur des mesures de silence.
 */

const isStepActive = (state: unknown): boolean =>
  state !== undefined && state !== null && state !== 0 && state !== '0' && state !== '';

export interface CapVoiceNoteStepsParams {
  /** Pas occupés par la note (attaque + prolongations). */
  spanSteps: number;
  /** Pas souhaités d'après le decay. */
  decaySteps: number;
  /** Pas actifs du motif dans lequel la note a été lue. */
  activeSteps: ReadonlyArray<unknown> | undefined | null;
  /** Premier indice APRÈS la note tenue (cellIdx + spanSteps). */
  startIdx: number;
  /** Nombre de pas du tableau `activeSteps` lu. */
  totalSteps: number;
}

export function capVoiceNoteSteps(p: CapVoiceNoteStepsParams): number {
  const span = Math.max(1, Math.floor(p.spanSteps) || 1);
  const tail = Math.floor(p.decaySteps) - span;
  if (!(tail > 0) || !p.activeSteps) return span;

  const end = Math.min(p.totalSteps, p.startIdx + tail);
  let silent = 0;
  for (let i = Math.max(0, p.startIdx); i < end; i++) {
    if (isStepActive(p.activeSteps[i])) break;
    silent++;
  }
  return span + silent;
}
