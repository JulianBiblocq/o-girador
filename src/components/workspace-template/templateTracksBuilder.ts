/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Construction des pistes de gabarit selon les options sélectionnées (< 45 lignes).
 */

import { TrackGroup, WorkspaceTemplateOptions, WorkspaceTemplateTrack } from '../../types';

export function buildTemplateTracks(tracks: TrackGroup[], options: WorkspaceTemplateOptions): WorkspaceTemplateTrack[] {
  return tracks.map((t) => {
    const item: WorkspaceTemplateTrack = {
      id: t.id,
      instrumentIdx: t.instrumentIdx,
      customName: t.customName,
      isBusFolder: t.isBusFolder,
      isLinkFolder: t.isLinkFolder,
      isLinkMaster: t.isLinkMaster,
      busId: t.busId,
      linkedToTrackId: t.linkedToTrackId,
    };

    if (options.includeVolumePan) {
      item.volumeVal = t.volumeVal;
      item.pan = t.pan;
      item.panVal = t.panVal;
    }

    if (options.includeEQ) {
      item.eqBands = t.eqBands;
      item.lowCut = t.lowCut;
    }

    if (options.includeFX) {
      item.reverbVal = t.reverbVal;
      item.fxSends = t.fxSends;
    }

    return item;
  });
}
