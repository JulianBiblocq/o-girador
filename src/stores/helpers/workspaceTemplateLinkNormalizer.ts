/**
 * Normalisation stricte des liaisons et bus (Caixas et Alfaias) post-gabarit (< 95 lignes).
 */
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBusFamily } from './workspaceTemplateBusMatcher';
import { reconcileAllLinkedTracks } from '../../utils/trackLinkingSync';

export function normalizeWorkspaceTemplateLinks(
  tracks: TrackGroup[],
  areSongAlfaiasIndependent: boolean
): TrackGroup[] {
  const caixasBus = tracks.find((t) => t.isBusFolder && getBusFamily(t, tracks, instrumentsConfig) === 'caixas');
  const caixasBusIdStr = caixasBus ? String(caixasBus.id) : undefined;
  const isCaixasLinkFolder = Boolean(caixasBus?.isLinkFolder);

  const caixasTracks = tracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const instId = instrumentsConfig[t.instrumentIdx]?.id || '';
    return ['caixa', 'tarol'].includes(instId) || [3, 4].includes(t.instrumentIdx);
  });
  const caixaMaster = caixasTracks.find((t) => t.isLinkMaster === true) || caixasTracks[0];

  const alfaiasBus = tracks.find((t) => t.isBusFolder && getBusFamily(t, tracks, instrumentsConfig) === 'alfaias');
  const alfaiasBusIdStr = alfaiasBus ? String(alfaiasBus.id) : undefined;
  const isAlfaiasLinkFolder = Boolean(alfaiasBus?.isLinkFolder);
  const alfaiaTracks = tracks.filter((t) => !t.isBusFolder && !t.isLinkFolder && [0, 1, 2].includes(t.instrumentIdx));
  const alfaiaMaster = alfaiaTracks.find((t) => t.isLinkMaster === true);

  const normalized = tracks.map((track) => {
    // A. Normalisation de la famille Caixas
    if (caixasTracks.some((ct) => ct.id === track.id)) {
      const isMaster = Boolean(caixaMaster && track.id === caixaMaster.id);
      const updated: TrackGroup = { ...track };
      if (caixasBusIdStr) updated.busId = caixasBusIdStr;

      if (isMaster) {
        updated.isLinkMaster = true;
        updated.isHidden = false;
        updated.linkedToTrackId = caixasBusIdStr && isCaixasLinkFolder ? caixasBusIdStr : undefined;
      } else {
        updated.isLinkMaster = false;
        updated.linkedToTrackId = caixasBusIdStr && isCaixasLinkFolder
          ? caixasBusIdStr
          : (caixaMaster ? String(caixaMaster.id) : updated.linkedToTrackId);
      }
      return updated;
    }

    // B. Préservation des Alfaias réellement indépendantes (motifs distincts non vides)
    if (areSongAlfaiasIndependent && [0, 1, 2].includes(track.instrumentIdx) && !track.isBusFolder) {
      return {
        ...track,
        linkedToTrackId: undefined,
        isLinkMaster: undefined,
        isLinkFolder: false,
        isHidden: false,
      };
    }

    // C. Cohérence d'une famille Alfaias liée (avec LinkFolder ou Bus Audio pur)
    if (!areSongAlfaiasIndependent && alfaiaMaster && alfaiaTracks.some((at) => at.id === track.id)) {
      const isMaster = track.id === alfaiaMaster.id;
      const updated: TrackGroup = { ...track };
      if (alfaiasBusIdStr) updated.busId = alfaiasBusIdStr;
      if (isMaster) {
        updated.isLinkMaster = true;
        updated.isHidden = false;
        updated.linkedToTrackId = alfaiasBusIdStr && isAlfaiasLinkFolder ? alfaiasBusIdStr : undefined;
      } else if (track.linkedToTrackId || isAlfaiasLinkFolder) {
        updated.isLinkMaster = false;
        updated.linkedToTrackId = alfaiasBusIdStr && isAlfaiasLinkFolder ? alfaiasBusIdStr : String(alfaiaMaster.id);
      }
      return updated;
    }

    return track;
  });

  return reconcileAllLinkedTracks(normalized).tracks;
}
