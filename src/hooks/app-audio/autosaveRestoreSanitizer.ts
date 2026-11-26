/**
 * Assainissement défensif d'un autosave IndexedDB au redémarrage (< 55 lignes) :
 * - Démute les pistes et dossiers Bus si 100 % des pistes feuilles se retrouvent effectivement muettes
 *   (incluant un dossier Bus parent resté `isMute: true` ou un Solo orphelin sur une piste muette).
 * - Réinitialise un `masterVol <= -60 dB` (ou non fini) à `0 dB` et une automation `measureVols` nulle à `100`.
 */

function isLeafEffectivelyMutedInSaved(leaf: any, allTracks: any[], hasAnySolo: boolean): boolean {
  if (hasAnySolo && leaf.isSolo !== true) return true;
  if (leaf.isMute === true) return true;
  let busId = leaf.busId;
  const visited = new Set<string>();
  while (busId !== undefined && busId !== null && !visited.has(String(busId))) {
    visited.add(String(busId));
    const parent = allTracks.find((t: any) => t && String(t.id) === String(busId));
    if (!parent) break;
    if (parent.isMute === true) return true;
    busId = parent.busId;
  }
  return false;
}

export function sanitizeRestoredAutosave(saved: any): any {
  if (!saved || !Array.isArray(saved.tracks) || saved.tracks.length === 0) return null;
  const leafTracks = saved.tracks.filter((t: any) => t && !t.isBusFolder && !t.isLinkFolder);
  const hasAnySolo = leafTracks.some((t: any) => t.isSolo === true);
  if (leafTracks.length > 0 && leafTracks.every((t: any) => isLeafEffectivelyMutedInSaved(t, saved.tracks, hasAnySolo))) {
    saved = {
      ...saved,
      tracks: saved.tracks.map((t: any) => (t ? { ...t, isMute: false, isSolo: false } : t)),
    };
  }
  if (typeof saved.masterVol === 'number' && (!Number.isFinite(saved.masterVol) || saved.masterVol <= -60)) {
    saved = { ...saved, masterVol: 0 };
  }
  if (
    Array.isArray(saved.measureVols) &&
    saved.measureVols.length > 0 &&
    saved.measureVols.every((v: any) => !Number.isFinite(Number(v)) || Number(v) <= 3)
  ) {
    saved = { ...saved, measureVols: saved.measureVols.map(() => 100) };
  }
  return saved;
}
