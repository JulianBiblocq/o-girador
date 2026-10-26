/**
 * Normalisation stricte des liaisons et bus (Caixas et Alfaias) post-gabarit (< 80 lignes).
 */
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBusFamily } from './workspaceTemplateBusMatcher';

export function normalizeWorkspaceTemplateLinks(
  tracks: TrackGroup[],
  areSongAlfaiasIndependent: boolean
): TrackGroup[] {
  // 1. Détection du bus Caixas éventuel
  const caixasBus = tracks.find((t) => t.isBusFolder && getBusFamily(t, tracks, instrumentsConfig) === 'caixas');
  const caixasBusIdStr = caixasBus ? String(caixasBus.id) : undefined;
  const isCaixasLinkFolder = Boolean(caixasBus?.isLinkFolder);

  // 2. Identification des pistes de la famille Caixas
  const caixasTracks = tracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const instId = instrumentsConfig[t.instrumentIdx]?.id || '';
    return ['caixa', 'tarol'].includes(instId) || [3, 4].includes(t.instrumentIdx);
  });

  const caixaMaster = caixasTracks[0];

  return tracks.map((track) => {
    // A. Normalisation de la famille Caixas
    if (caixasTracks.some((ct) => ct.id === track.id)) {
      const isMaster = caixaMaster && track.id === caixaMaster.id;
      const updated: TrackGroup = { ...track };

      if (caixasBusIdStr) {
        updated.busId = caixasBusIdStr;
      }

      if (isMaster) {
        updated.isLinkMaster = true;
        updated.isHidden = false;
        if (caixasBusIdStr && isCaixasLinkFolder) {
          updated.linkedToTrackId = caixasBusIdStr;
        } else {
          updated.linkedToTrackId = undefined;
        }
      } else {
        updated.isLinkMaster = false;
        if (caixasBusIdStr && isCaixasLinkFolder) {
          updated.linkedToTrackId = caixasBusIdStr;
        } else if (caixaMaster) {
          updated.linkedToTrackId = String(caixaMaster.id);
        }
      }
      return updated;
    }

    // B. Préservation des Alfaias indépendantes
    if (areSongAlfaiasIndependent && [0, 1, 2].includes(track.instrumentIdx) && !track.isBusFolder) {
      return {
        ...track,
        linkedToTrackId: undefined,
        isLinkMaster: undefined,
        isLinkFolder: false,
        isHidden: false,
      };
    }

    return track;
  });
}
