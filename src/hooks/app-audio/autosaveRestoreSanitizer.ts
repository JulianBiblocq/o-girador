/**
 * Assainissement défensif d'un autosave IndexedDB au redémarrage (< 30 lignes) :
 * - Démute les pistes feuilles si 100 % d'entre elles étaient mutées (ex: Groupe de Mute mobile actif à la fermeture).
 * - Réinitialise un `masterVol <= -60 dB` (ou non fini) à `0 dB` pour éviter tout démarrage muet fantôme.
 */
export function sanitizeRestoredAutosave(saved: any): any {
  if (!saved || !Array.isArray(saved.tracks) || saved.tracks.length === 0) return null;
  const leafTracks = saved.tracks.filter((t: any) => t && !t.isBusFolder && !t.isLinkFolder);
  if (leafTracks.length > 0 && leafTracks.every((t: any) => t.isMute === true)) {
    saved = {
      ...saved,
      tracks: saved.tracks.map((t: any) => (t && !t.isBusFolder && !t.isLinkFolder ? { ...t, isMute: false } : t)),
    };
  }
  if (typeof saved.masterVol === 'number' && (!Number.isFinite(saved.masterVol) || saved.masterVol <= -60)) {
    saved = { ...saved, masterVol: 0 };
  }
  return saved;
}
