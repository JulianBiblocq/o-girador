import { Pattern, PatternVariation } from '../../types';
import { getRodaMeasureGeometry, resolveActiveBeatResolutions } from '../rodaTimeSigGeometry';

let sectionIdSeq = 1;
export function allocSectionEntityId(): number {
  sectionIdSeq = (sectionIdSeq + 1) % 900000;
  return Date.now() * 10 + (sectionIdSeq % 10);
}

function getPatternNominalBarSteps(pattern: Pattern, fallbackSig = '4/4'): number {
  const sig = pattern.timeSignature || fallbackSig;
  const geom = getRodaMeasureGeometry(sig);
  const res = resolveActiveBeatResolutions(sig, pattern);
  return Math.max(1, res.reduce((acc, v) => acc + Math.max(1, v), 0) || geom.defaultSteps);
}

function sliceVariationRange(v: PatternVariation, stepStart: number, stepEnd: number): PatternVariation {
  const cloned: PatternVariation = JSON.parse(JSON.stringify(v));
  cloned.steps = (cloned.steps || []).slice(stepStart, stepEnd);
  if (Array.isArray(cloned.volumes)) cloned.volumes = cloned.volumes.slice(stepStart, stepEnd);
  if (Array.isArray(cloned.decays)) cloned.decays = cloned.decays.slice(stepStart, stepEnd);
  if (Array.isArray(cloned.microtimings)) cloned.microtimings = cloned.microtimings.slice(stepStart, stepEnd);
  return cloned;
}

/**
 * Découpe fidèlement un motif (16..64 pas, variations, nuances et métadonnées vocales)
 * sur `[startM .. endM]`. Si le motif est intégralement contenu dans la plage, conserve 100 %
 * de sa structure multi-mesures et de ses champs vocaux (`audioUrl`, `vocalClip`, anacrouse...).
 */
export function sliceTrackPatternForSection(
  sourcePattern: Pattern,
  activeOnMeasure: (m: number) => boolean,
  allowVarOnMeasure: (m: number) => boolean,
  startM: number,
  endM: number,
  fallbackSig = '4/4'
): Pattern[] {
  const numMeasures = endM - startM + 1;
  const barSteps = getPatternNominalBarSteps(sourcePattern, fallbackSig);
  const fullSteps = Math.max(barSteps, sourcePattern.steps || sourcePattern.activeSteps?.length || barSteps);
  const spanMeasures = Math.max(1, Math.round(fullSteps / barSteps));

  const relAssigns = Array.from({ length: numMeasures }, (_, r) => activeOnMeasure(startM + r));
  if (!relAssigns.some(Boolean)) return [];
  const relAllowVars = Array.from({ length: numMeasures }, (_, r) => allowVarOnMeasure(startM + r));

  if (spanMeasures <= 1) {
    const cloned: Pattern = JSON.parse(JSON.stringify(sourcePattern));
    cloned.measureAssignments = relAssigns;
    cloned.measureAllowVariations = relAllowVars;
    return [cloned];
  }

  const out: Pattern[] = [];
  let r = 0;
  while (r < numMeasures) {
    if (!relAssigns[r]) { r++; continue; }
    let runEnd = r;
    while (runEnd + 1 < numMeasures && relAssigns[runEnd + 1]) runEnd++;

    const globalRunStart = startM + r;
    let trueRunStart = globalRunStart;
    while (trueRunStart > 0 && activeOnMeasure(trueRunStart - 1)) trueRunStart--;

    const startPhaseBars = (globalRunStart - trueRunStart) % spanMeasures;
    const runLenBars = runEnd - r + 1;
    const isFullAligned = startPhaseBars === 0 && runLenBars >= spanMeasures && runLenBars % spanMeasures === 0;

    if (isFullAligned) {
      const fullClone: Pattern = JSON.parse(JSON.stringify(sourcePattern));
      fullClone.id = allocSectionEntityId();
      fullClone.measureAssignments = Array.from({ length: numMeasures }, (_, idx) => idx >= r && idx <= runEnd);
      fullClone.measureAllowVariations = [...relAllowVars];
      out.push(fullClone);
    } else {
      for (let sub = r; sub <= runEnd; sub++) {
        const barPhase = (globalRunStart + (sub - r) - trueRunStart) % spanMeasures;
        const stepStart = barPhase * barSteps;
        const stepEnd = stepStart + barSteps;
        const subClone: Pattern = JSON.parse(JSON.stringify(sourcePattern));
        subClone.id = allocSectionEntityId();
        subClone.steps = barSteps;
        subClone.activeSteps = (subClone.activeSteps || []).slice(stepStart, stepEnd);
        subClone.lyrics = (subClone.lyrics || []).slice(stepStart, stepEnd);
        subClone.notes = (subClone.notes || []).slice(stepStart, stepEnd);
        if (Array.isArray(subClone.volumes)) subClone.volumes = subClone.volumes.slice(stepStart, stepEnd);
        if (Array.isArray(subClone.decays)) subClone.decays = subClone.decays.slice(stepStart, stepEnd);
        if (Array.isArray(subClone.microtimings)) subClone.microtimings = subClone.microtimings.slice(stepStart, stepEnd);
        if (Array.isArray(subClone.variations)) {
          subClone.variations = subClone.variations.map((v) => sliceVariationRange(v, stepStart, stepEnd));
        }
        subClone.measureAssignments = Array.from({ length: numMeasures }, (_, idx) => idx === sub);
        subClone.measureAllowVariations = [...relAllowVars];
        out.push(subClone);
      }
    }
    r = runEnd + 1;
  }
  return out;
}

function buildPatternContentSignature(p: Pattern): string {
  const raw = p as Pattern & Record<string, unknown>;
  return JSON.stringify({
    name: (p.name || '').trim().toLowerCase(),
    steps: p.steps || p.activeSteps?.length || 16,
    sig: p.timeSignature || '',
    activeSteps: p.activeSteps || [],
    volumes: p.volumes || [],
    decays: p.decays || [],
    microtimings: p.microtimings || [],
    beatRes: p.beatResolutions || [],
    lyrics: p.lyrics || [],
    notes: p.notes || [],
    vars: (p.variations || []).map((v) => ({
      n: (v.name || '').trim().toLowerCase(), s: v.steps, pr: v.probability,
      f: Boolean(v.playFirstTimeOnly), v: v.volumes, d: v.decays, m: v.microtimings, b: v.beatResolutions,
    })),
    voc: [raw.audioUrl, p.vocalAudioUrl, p.sungKey, p.troupeKey, raw.transpositionSemitones, p.packTranspositionSemitones, p.hasAnacrusis, p.vocalClip, p.preRollActiveSteps, p.preRollNotes, p.preRollLyrics],
  });
}

export function areSectionPatternsEquivalent(a: Pattern, b: Pattern): boolean {
  return buildPatternContentSignature(a) === buildPatternContentSignature(b);
}
