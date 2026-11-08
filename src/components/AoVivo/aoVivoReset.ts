import { CONFIG_MINEIRO } from '../../audio/animationGenerators';
import { resetHandPostureMemory } from '../../audio/animations/handTransitionEngine';
import { resetGonguePostureMemory } from '../../audio/animations/gongueKinematics';
import { resetAlfaiaSticksAndShadows } from './alfaiaLookaheadHelper';
import { resetCaixaSticksAndShadows } from './caixaLookaheadHelper';
import { resetTimbalHandsAndShadows } from './timbalLookaheadHelper';
import { resetGongueStickAndShadow, resetAgbeAndMineiroRest } from './aoVivoOtherDispatchers';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';

export function resolveAoVivoPatternAndSteps(
  activeTrack: any,
  allTracks: any[],
  measure: number,
  soloPlayId: number | null,
  varMap: Record<number, any> | undefined,
  isAlfaia: boolean
): { pattern: any | null; activePlayingSteps: any[] } {
  if (!activeTrack) return { pattern: null, activePlayingSteps: [] };
  const targetBusId = activeTrack.busId || activeTrack.linkedToTrackId || activeTrack.id;
  const parent = allTracks.find((t: any) => String(t.id) === String(targetBusId) && t.id !== activeTrack.id);
  const master = resolveMasterTrack(activeTrack.id, allTracks);
  const groupTracks = allTracks.filter(
    (t: any) =>
      String(t.id) === String(targetBusId) ||
      String(t.linkedToTrackId) === String(targetBusId) ||
      String(t.busId) === String(targetBusId)
  );

  const findById = (pid: any) => {
    for (const src of [activeTrack, parent, master, ...groupTracks]) {
      const found = src?.patterns?.find((p: any) => String(p.id) === String(pid));
      if (found) return found;
    }
    return null;
  };

  let pattern: any = null;
  if (soloPlayId !== null && soloPlayId !== undefined) {
    pattern = findById(soloPlayId);
  }
  if (!pattern && activeTrack.patternOverrides?.[measure] !== undefined) {
    const ov = activeTrack.patternOverrides[measure];
    if (ov === null) return { pattern: null, activePlayingSteps: [] };
    pattern = findById(ov);
  }
  if (!pattern) {
    for (const src of [activeTrack, parent, master]) {
      const assigned = src?.patterns?.find((p: any) => p?.measureAssignments?.[measure]);
      if (assigned) {
        pattern = activeTrack.patterns?.find((p: any) => p.name === assigned.name) || assigned;
        break;
      }
    }
  }
  if (!pattern) {
    pattern = activeTrack.patterns?.[0] || parent?.patterns?.[0] || master?.patterns?.[0] || null;
  }
  if (!pattern) return { pattern: null, activePlayingSteps: [] };

  const baseSteps: any[] =
    varMap?.[activeTrack.id] ||
    (parent ? varMap?.[parent.id] : undefined) ||
    (master ? varMap?.[master.id] : undefined) ||
    pattern.activeSteps ||
    [];

  if (!isAlfaia) return { pattern, activePlayingSteps: baseSteps };

  const combined = baseSteps.slice();
  for (const c of groupTracks) {
    if (c.id === activeTrack.id || c.isBusFolder) continue;
    const ov = c.patternOverrides?.[measure];
    const cPat = ov !== undefined && ov !== null ? findById(ov) : null;
    const cSteps = varMap?.[c.id] || cPat?.activeSteps;
    if (!cSteps) continue;
    for (let i = 0; i < Math.max(combined.length, cSteps.length); i++) {
      const mVal = combined[i];
      const cVal = cSteps[i];
      const hasM = Boolean(mVal && mVal !== 0 && mVal !== '0' && mVal !== '-');
      const hasC = Boolean(cVal && cVal !== 0 && cVal !== '0' && cVal !== '-');
      if (!hasM && hasC) combined[i] = cVal;
      else if (hasM && hasC && mVal !== cVal && !Array.isArray(mVal) && !Array.isArray(cVal)) {
        combined[i] = { sim: [String(mVal), String(cVal)] };
      }
    }
  }
  return { pattern, activePlayingSteps: combined };
}

export function resetAoVivoRestPosition(
  instId: string | undefined,
  isLeftHanded: boolean,
  leftStickRef: React.RefObject<SVGSVGElement | null>,
  rightStickRef: React.RefObject<SVGSVGElement | null>,
  gongueStickRef: React.RefObject<SVGSVGElement | null>,
  mineiroStickRef: React.RefObject<SVGSVGElement | null>,
  agbeWholeRef: React.RefObject<SVGGElement | null>,
  activeTrack?: any
) {
  if (!instId) return;
  resetHandPostureMemory();
  resetGonguePostureMemory();

  if (['marcante', 'meiao', 'repique'].includes(instId)) {
    resetAlfaiaSticksAndShadows(activeTrack, isLeftHanded, leftStickRef.current, rightStickRef.current);
  } else if (['caixa', 'tarol'].includes(instId)) {
    resetCaixaSticksAndShadows(instId, leftStickRef.current, rightStickRef.current);
  } else if (instId === 'timbal') {
    resetTimbalHandsAndShadows(leftStickRef.current, rightStickRef.current);
  } else if (instId === 'gongue') {
    resetGongueStickAndShadow(isLeftHanded, gongueStickRef.current);
  } else if (instId === 'mineiro' || instId === 'agbe') {
    resetAgbeAndMineiroRest(agbeWholeRef.current, mineiroStickRef.current);
  }
}
