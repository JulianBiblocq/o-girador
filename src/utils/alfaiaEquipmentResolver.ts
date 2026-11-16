import { instrumentsConfig } from '../data';
import type { AlfaiaEquipmentMetadata, AlfaiaSecondaryStickType } from '../types/common.types';
import { resolveMasterTrack } from './trackMasterResolver';

export type { AlfaiaEquipmentMetadata, AlfaiaSecondaryStickType };
export type StepValue = string | number | [string, string] | { sim?: string[] } | null | undefined;

const PRIO: Record<AlfaiaSecondaryStickType, number> = { macaneta: 0, fina: 1, bacalhau: 2 };
const ALFAIA_MAP: Record<string, string> = { alfaia: 'alfaia', marcante: 'marcante', meiao: 'meiao', repique: 'repique', alfaia_grave: 'marcante', alfaia_medio: 'meiao', alfaia_agudo: 'repique' };
const maxStick = (a: AlfaiaSecondaryStickType, b: AlfaiaSecondaryStickType): AlfaiaSecondaryStickType => (PRIO[b] > PRIO[a] ? b : a);

function getAlfaiaRole(track: any): string | null {
  if (!track || track.isBusFolder || track.isLinkFolder) return null;
  const raw = String(track.instrumentId ?? track.roleId ?? instrumentsConfig[track.instrumentIdx]?.id ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ALFAIA_MAP[raw] ?? null;
}

export function resolveAlfaiaSecondaryStickFromSteps(stepsList: StepValue[][]): AlfaiaSecondaryStickType {
  let hasAbafado = false;
  for (const steps of stepsList || []) {
    for (const cell of steps || []) {
      const toks = Array.isArray(cell) ? cell : (cell && typeof cell === 'object' && Array.isArray(cell.sim) ? cell.sim : [cell]);
      for (const raw of toks) {
        const s = String(raw ?? '').trim();
        if (s === 'I' || s === 'i') return 'bacalhau';
        if (s === 'A' || s === 'a') hasAbafado = true;
      }
    }
  }
  return hasAbafado ? 'fina' : 'macaneta';
}

export function collectAlfaiaTrackStepsList(track: any, allTracks: any[] = [], editingTrackId?: number | null, soloId?: number | null): StepValue[][] {
  if (!track) return [];
  const pId = track.linkedToTrackId ?? track.busId;
  const parent = pId !== undefined ? allTracks.find((t: any) => String(t.id) === String(pId) && t.id !== track.id) : null;
  const master = track.id !== undefined ? resolveMasterTrack(track.id, allTracks) : null;
  const pats: any[] = track.patterns || [], used = new Map<any, any>();
  const add = (p: any) => { if (p && !used.has(p.id ?? p)) used.set(p.id ?? p, p); };

  pats.forEach((p) => { if (p?.measureAssignments?.some(Boolean)) add(p); });
  [parent, master].forEach((src) => (src?.patterns || []).forEach((mp: any) => {
    if (mp?.measureAssignments?.some(Boolean)) add(pats.find((p) => String(p.id) === String(mp.id) || p.name === mp.name) || mp);
  }));
  Object.values(track.patternOverrides || {}).forEach((ov) => {
    if (ov !== null && ov !== undefined) add(pats.find((p) => String(p.id) === String(ov)) || parent?.patterns?.find((p: any) => String(p.id) === String(ov)));
  });
  if (soloId !== null && soloId !== undefined) add(pats.find((p) => String(p.id) === String(soloId)));
  if (editingTrackId !== null && editingTrackId !== undefined && String(editingTrackId) === String(track.id)) add(pats.find((p) => String(p.id) === String(track.selectedPatternId)) || pats[0]);
  if (used.size === 0) add(pats.find((p) => String(p.id) === String(track.selectedPatternId)) || pats[0]);

  const out: StepValue[][] = [];
  used.forEach((p) => {
    if (Array.isArray(p.activeSteps)) out.push(p.activeSteps);
    if (Array.isArray(p.preRollActiveSteps)) out.push(p.preRollActiveSteps);
    (p.variations || []).forEach((v: any) => { if (Array.isArray(v?.steps)) out.push(v.steps); });
  });
  return out;
}

export function resolvePresetAlfaiaEquipment(projectState: { tracks?: any[]; circles?: any[] } | null | undefined): AlfaiaEquipmentMetadata | null {
  const allTracks = projectState?.tracks || [], byRole: Record<string, AlfaiaSecondaryStickType> = {};
  let secondaryStick: AlfaiaSecondaryStickType = 'macaneta', found = false;

  for (const trk of allTracks) {
    const role = getAlfaiaRole(trk);
    if (!role) continue;
    found = true;
    const stick = resolveAlfaiaSecondaryStickFromSteps(collectAlfaiaTrackStepsList(trk, allTracks));
    byRole[role] = byRole[role] ? maxStick(byRole[role], stick) : stick;
    secondaryStick = maxStick(secondaryStick, stick);
  }
  for (const c of (!found && projectState?.circles) ? projectState.circles : []) {
    const role = getAlfaiaRole(c);
    if (!role) continue;
    found = true;
    const stick = resolveAlfaiaSecondaryStickFromSteps([c.activeSteps || []]);
    byRole[role] = byRole[role] ? maxStick(byRole[role], stick) : stick;
    secondaryStick = maxStick(secondaryStick, stick);
  }
  return found ? { secondaryStick, byRole } : null;
}
