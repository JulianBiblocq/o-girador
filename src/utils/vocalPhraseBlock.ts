/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Résolution (pure, sans dépendance React / Tone) de la position d'une mesure à l'intérieur
 * d'une phrase vocale multi-mesures (Toada de 2, 4… mesures + anacrouse).
 *
 * Convention identique à `audioCompiler.worker.ts` : un motif de `steps` pas couvre
 * `span = round(steps / pasParMesure)` mesures contiguës (`measureAssignments` à `true`),
 * la mesure relative dans la phrase est `(mesure - débutDuBloc) % span`.
 */

export interface PhraseBlockPatternLike {
  id?: number | string;
  steps?: number;
  measureAssignments?: { [idx: number]: boolean | undefined } | null;
  beatResolutions?: number[];
}

export interface PhraseBlockInfo {
  /** Nombre de mesures couvertes par le motif (1 pour un motif mono-mesure). */
  span: number;
  /** Index de la première mesure du bloc courant (clé de verrouillage du lecteur vocal). */
  blockStartMeasure: number;
  /** Mesure relative dans la phrase : 0 = début du bloc. */
  relIdx: number;
  /** `true` sur la première mesure du bloc (seule mesure autorisée à (re)déclencher le sample / l'anacrouse). */
  isBlockStart: boolean;
  /** Nombre de pas d'UNE mesure (somme des résolutions de temps). */
  stepsPerMeasure: number;
  /** Pas par mesure à utiliser pour le découpage en ticks (legacy `steps` si mono-mesure). */
  cellsPerMeasure: number;
  /** Indice absolu (dans le motif) du premier pas de la mesure courante : relIdx × stepsPerMeasure. */
  stepOffset: number;
}

/** Nombre de pas d'une mesure : somme des résolutions des `beatsPerMeasure` premiers temps (défaut 4 par temps). */
export function getPatternStepsPerMeasure(pattern: PhraseBlockPatternLike, beatsPerMeasure: number): number {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const res = pattern.beatResolutions;
  if (Array.isArray(res) && res.length >= beats) {
    let sum = 0;
    for (let b = 0; b < beats; b++) sum += res[b] > 0 ? res[b] : 4;
    return sum;
  }
  return beats * 4;
}

function buildInfo(
  pattern: PhraseBlockPatternLike,
  spm: number,
  span: number,
  relIdx: number,
  blockStartMeasure: number
): PhraseBlockInfo {
  return {
    span,
    blockStartMeasure,
    relIdx,
    isBlockStart: relIdx === 0,
    stepsPerMeasure: spm,
    cellsPerMeasure: span > 1 ? spm : (pattern.steps || 16),
    stepOffset: relIdx * spm,
  };
}

function getSpan(pattern: PhraseBlockPatternLike, spm: number): number {
  return Math.max(1, Math.round((pattern.steps || spm) / spm));
}

/** Position de `measureIdx` dans le bloc contigu du motif (lecture timeline). */
export function getPhraseBlockInfo(
  pattern: PhraseBlockPatternLike,
  measureIdx: number,
  beatsPerMeasure: number
): PhraseBlockInfo {
  const spm = getPatternStepsPerMeasure(pattern, beatsPerMeasure);
  const span = getSpan(pattern, spm);
  // Chemin rapide : motif mono-mesure → aucun balayage.
  if (span === 1) return buildInfo(pattern, spm, 1, 0, measureIdx);

  const assignments = pattern.measureAssignments;
  let startM = measureIdx;
  while (startM > 0 && assignments && assignments[startM - 1]) startM--;
  const relIdx = (measureIdx - startM) % span;
  return buildInfo(pattern, spm, span, relIdx, measureIdx - relIdx);
}

/** Position dans la phrase en mode solo / pré-écoute (la mesure de phrase vient d'un compteur, pas de la timeline). */
export function getSoloPhraseInfo(
  pattern: PhraseBlockPatternLike,
  soloMeasureCounter: number,
  beatsPerMeasure: number
): PhraseBlockInfo {
  const spm = getPatternStepsPerMeasure(pattern, beatsPerMeasure);
  const span = getSpan(pattern, spm);
  const relIdx = ((soloMeasureCounter % span) + span) % span;
  return buildInfo(pattern, spm, span, relIdx, 0);
}

/** Plus grande étendue (en mesures) parmi les motifs solo portant cet identifiant. */
export function getSoloPhraseSpan(
  tracks: ReadonlyArray<{ patterns?: ReadonlyArray<PhraseBlockPatternLike> }>,
  soloPatternId: number | string | null,
  beatsPerMeasure: number
): number {
  if (soloPatternId === null || soloPatternId === undefined) return 1;
  let maxSpan = 1;
  for (let t = 0; t < tracks.length; t++) {
    const patterns = tracks[t].patterns;
    if (!patterns) continue;
    for (let p = 0; p < patterns.length; p++) {
      const ptn = patterns[p];
      if (String(ptn.id) !== String(soloPatternId)) continue;
      const span = getSpan(ptn, getPatternStepsPerMeasure(ptn, beatsPerMeasure));
      if (span > maxSpan) maxSpan = span;
    }
  }
  return maxSpan;
}

/** Compteur de mesure de phrase du mode solo, avancé à chaque rebouclage d'une mesure. */
export function advanceSoloPhraseMeasure(
  current: number,
  tracks: ReadonlyArray<{ patterns?: ReadonlyArray<PhraseBlockPatternLike> }>,
  soloPatternId: number | string | null,
  beatsPerMeasure: number
): number {
  return (current + 1) % getSoloPhraseSpan(tracks, soloPatternId, beatsPerMeasure);
}

export interface ResolveVocalPhraseParams {
  pattern: PhraseBlockPatternLike;
  measureIdx: number;
  beatsPerMeasure: number;
  isSolo: boolean;
  soloMeasureCounter: number;
}

/** Point d'entrée unique du moteur : timeline ou solo selon le contexte. */
export function resolveVocalPhraseInfo(p: ResolveVocalPhraseParams): PhraseBlockInfo {
  return p.isSolo
    ? getSoloPhraseInfo(p.pattern, p.soloMeasureCounter, p.beatsPerMeasure)
    : getPhraseBlockInfo(p.pattern, p.measureIdx, p.beatsPerMeasure);
}

/** Vrai si `measureIdx` ouvre un bloc de phrase (seule mesure autorisée à lancer l'anacrouse / le sample au départ). Solo → toujours vrai. */
export function isPhraseBlockStart(
  pattern: PhraseBlockPatternLike,
  measureIdx: number,
  beatsPerMeasure: number,
  isSolo: boolean = false
): boolean {
  return resolveVocalPhraseInfo({ pattern, measureIdx, beatsPerMeasure, isSolo, soloMeasureCounter: 0 }).isBlockStart;
}
