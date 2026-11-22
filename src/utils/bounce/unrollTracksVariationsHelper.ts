/**
 * unrollTracksVariationsHelper.ts — Déroulé offline des variations (1ª VEZ + probabilistes + synchro Maître/Esclave) (< 120 lignes).
 */
import { getVariationSculptArrays } from '../../utils/soloVariationMatcher';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

export function unrollTracksWithVariations(
  tracks: any[],
  expanded: Array<{ baseMeasure: number; iteration: number }>,
  randomSource: () => number = Math.random
): any[] {
  let syntheticPatId = 900000;
  const masterChoiceByExpFam = new Map<string, { varIdx: number; varId: string | null; varName: string | null }>();
  const sharedRandByExpFam = new Map<string, number>();

  const getSharedRand = (expIdx: number, famKey: string): number => {
    const k = `${expIdx}:${famKey}`;
    if (!sharedRandByExpFam.has(k)) sharedRandByExpFam.set(k, randomSource() * 100);
    return sharedRandByExpFam.get(k)!;
  };

  const orderedIndices = tracks.map((_, i) => i).sort((ia, ib) => {
    const aSlave = isSlaveTrack(tracks[ia], tracks) ? 1 : 0;
    const bSlave = isSlaveTrack(tracks[ib], tracks) ? 1 : 0;
    return aSlave - bSlave;
  });

  const outTracks: any[] = new Array(tracks.length);

  for (const tOrderIdx of orderedIndices) {
    const t = tracks[tOrderIdx];
    const mapArr = <T>(arr: T[] | undefined): T[] | undefined =>
      Array.isArray(arr) && arr.length > 0 ? expanded.map((e) => arr[e.baseMeasure] as T) : arr;
    const isSlave = isSlaveTrack(t, tracks);
    const masterTrack = isSlave ? resolveMasterTrack(t.id, tracks) : (t.isLinkMaster ? t : null);
    const famKey = masterTrack ? String(masterTrack.id) : String(t.id);
    const nextPatterns: any[] = [];

    for (const p of t.patterns || []) {
      const assignAll = expanded.map((e) => Boolean(p.measureAssignments?.[e.baseMeasure]));
      const vars: any[] = Array.isArray(p.variations) ? p.variations : [];
      if (vars.length === 0 || !assignAll.some(Boolean)) {
        nextPatterns.push({ ...p, measureAssignments: assignAll });
        continue;
      }

      const firstVars = vars.filter((v) => v?.playFirstTimeOnly);
      const regularVars = vars.filter((v) => !v?.playFirstTimeOnly);
      const baseAssigns = Array(expanded.length).fill(false);
      const varAssignsByVarIdx = new Map<number, boolean[]>();

      for (let expIdx = 0; expIdx < expanded.length; expIdx++) {
        if (!assignAll[expIdx]) continue;
        const { baseMeasure, iteration } = expanded[expIdx];
        const mfKey = `${expIdx}:${famKey}`;
        let chosenIdx = -1;

        if (isSlave && masterTrack && masterChoiceByExpFam.has(mfKey)) {
          const mc = masterChoiceByExpFam.get(mfKey)!;
          if (mc.varIdx >= 0) {
            chosenIdx = vars.findIndex((v) => String(v.id) === mc.varId);
            if (chosenIdx < 0 && mc.varName) chosenIdx = vars.findIndex((v) => v.name?.trim().toLowerCase() === mc.varName);
            if (chosenIdx < 0 && mc.varIdx < vars.length) chosenIdx = mc.varIdx;
          }
        } else {
          if (iteration === 1 && firstVars.length > 0) {
            chosenIdx = vars.indexOf(firstVars[0]);
          } else if (regularVars.length > 0 && (p.measureAllowVariations ? p.measureAllowVariations[baseMeasure] !== false : true)) {
            const r = getSharedRand(expIdx, famKey);
            let sum = 0;
            for (const rv of regularVars) {
              if (r >= sum && r < sum + (rv.probability || 0)) { chosenIdx = vars.indexOf(rv); break; }
              sum += rv.probability || 0;
            }
          }
          if (t.isLinkMaster) {
            const cv = chosenIdx >= 0 ? vars[chosenIdx] : null;
            masterChoiceByExpFam.set(mfKey, {
              varIdx: chosenIdx, varId: cv ? String(cv.id) : null, varName: cv?.name?.trim().toLowerCase() || null,
            });
          }
        }

        if (chosenIdx >= 0 && vars[chosenIdx]) {
          if (!varAssignsByVarIdx.has(chosenIdx)) varAssignsByVarIdx.set(chosenIdx, Array(expanded.length).fill(false));
          varAssignsByVarIdx.get(chosenIdx)![expIdx] = true;
        } else {
          baseAssigns[expIdx] = true;
        }
      }

      const hasBase = baseAssigns.some(Boolean);
      const varEntries = Array.from(varAssignsByVarIdx.entries());
      varEntries.forEach(([vIdx, vAssigns], k) => {
        const chosenVar = vars[vIdx];
        const s = getVariationSculptArrays(p, chosenVar);
        const reuseOrigId = !hasBase && k === 0;
        nextPatterns.push({
          ...p, id: reuseOrigId ? p.id : ++syntheticPatId, activeSteps: s.steps, volumes: s.volumes,
          decays: s.decays, microtimings: s.microtimings, beatResolutions: s.beatResolutions,
          notes: chosenVar.notes || p.notes, lyrics: chosenVar.lyrics || p.lyrics, variations: [],
          measureAssignments: vAssigns,
        });
      });
      if (hasBase || varEntries.length === 0) {
        nextPatterns.push({ ...p, variations: [], measureAssignments: baseAssigns });
      }
    }

    outTracks[tOrderIdx] = {
      ...t, patternOverrides: undefined, measureVols: mapArr(t.measureVols),
      measurePans: mapArr(t.measurePans), measureReverbSends: mapArr(t.measureReverbSends), patterns: nextPatterns,
    };
  }
  return outTracks;
}
