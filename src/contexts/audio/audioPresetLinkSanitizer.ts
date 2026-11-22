/**
 * audioPresetLinkSanitizer.ts
 * Assainissement non-destructif des liens de pistes et cohabitation Bus Audio + Track Linking (< 95 lignes).
 */
import { TrackGroup } from '../../types';
import { isPatternCompletelySilent } from '../../utils/slavePatternCloneHelper';

function hasDistinctNonEmptyPatterns(a: TrackGroup, b: TrackGroup): boolean {
  const aActive = (a.patterns || []).filter((p) => !isPatternCompletelySilent(p));
  const bActive = (b.patterns || []).filter((p) => !isPatternCompletelySilent(p));
  if (aActive.length === 0 || bActive.length === 0) return false;
  if (aActive.length !== bActive.length) return true;
  return aActive.some((ap, i) => JSON.stringify(ap.activeSteps) !== JSON.stringify(bActive[i]?.activeSteps));
}

export function sanitizeTrackLinkingAndBuses(tracks: TrackGroup[]): TrackGroup[] {
  const alfaias = tracks.filter(
    (t) => !t.isBusFolder && !t.isLinkFolder && (t.instrumentIdx === 0 || t.instrumentIdx === 1 || t.instrumentIdx === 2)
  );
  const hasExplicitAlfaiaLink =
    alfaias.some((a) => a.isLinkMaster === true) &&
    alfaias.some((a) => !a.isLinkMaster && Boolean(a.linkedToTrackId));

  const shouldUnlinkAlfaias =
    !hasExplicitAlfaiaLink &&
    alfaias.length >= 2 &&
    alfaias.some((a, i) => hasDistinctNonEmptyPatterns(a, alfaias[(i + 1) % alfaias.length]));

  const caixasBus = tracks.find(
    (t) => t.isBusFolder && (t.customName?.toUpperCase().includes('CAIXA') || t.instrumentIdx === 3)
  );

  return tracks.map((track) => {
    if (track.isBusFolder && track.customName?.toUpperCase().includes('ALFAIA') && shouldUnlinkAlfaias) {
      return { ...track, isLinkFolder: false };
    }

    if ((track.instrumentIdx === 0 || track.instrumentIdx === 1 || track.instrumentIdx === 2) && shouldUnlinkAlfaias) {
      return { ...track, isLinkMaster: false, isLinkFolder: false, linkedToTrackId: undefined };
    }

    let next = track;
    if (!track.isBusFolder && (track.instrumentIdx === 3 || track.instrumentIdx === 4) && caixasBus) {
      const cxBusId = String(caixasBus.id);
      if (caixasBus.isLinkFolder) {
        next = { ...next, busId: cxBusId, linkedToTrackId: cxBusId };
      } else if (!next.busId) {
        next = { ...next, busId: cxBusId };
      }
    }

    if (!next.linkedToTrackId) return next;

    const parent = tracks.find((p) => String(p.id) === String(next.linkedToTrackId));
    if (parent && parent.isBusFolder && !parent.isLinkFolder) {
      const busIdStr = String(parent.id);
      const explicitMaster = tracks.find(
        (m) =>
          !m.isBusFolder &&
          !m.isLinkFolder &&
          m.isLinkMaster === true &&
          (String(m.linkedToTrackId) === busIdStr || String(m.busId) === busIdStr)
      );
      const hasLinkedSlaveOnBus = tracks.some(
        (s) => !s.isBusFolder && !s.isLinkFolder && !s.isLinkMaster && String(s.linkedToTrackId) === busIdStr
      );

      if (explicitMaster && hasLinkedSlaveOnBus) {
        if (next.id === explicitMaster.id) {
          return { ...next, busId: next.busId || busIdStr, isLinkMaster: true, linkedToTrackId: undefined };
        }
        return { ...next, busId: next.busId || busIdStr, isLinkMaster: false, linkedToTrackId: String(explicitMaster.id) };
      }

      return {
        ...next,
        busId: next.busId || busIdStr,
        linkedToTrackId: undefined,
        isLinkMaster: false,
      };
    }

    return next;
  });
}
