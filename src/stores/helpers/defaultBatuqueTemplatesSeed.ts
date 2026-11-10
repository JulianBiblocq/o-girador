import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';
import { STUDIO_MASTER_AMBIANCES } from '../../audio/effects/studioMasterAmbiances';
import { buildDefaultBatuqueTracks, DEFAULT_RODA_TRACK_IDS } from './defaultBatuqueTemplateTracks';

export const DEFAULT_BATUQUE_TEMPLATES_SEED: WorkspaceTemplate[] = STUDIO_MASTER_AMBIANCES.map((amb, idx) => ({
  id: amb.id,
  name: `${amb.labelFr} / ${amb.labelPt}`,
  nameFr: amb.labelFr,
  namePt: amb.labelPt,
  descriptionFr: amb.descFr,
  descriptionPt: amb.descPt,
  ownerId: 'system_studio',
  authorName: 'Studio O Girador',
  options: {
    includeStructure: true,
    includeDisplayOrder: true,
    includeVolumePan: true,
    includeEQ: true,
    includeFX: true,
  },
  tracks: buildDefaultBatuqueTracks(amb.id),
  rodaTrackOrder: [...DEFAULT_RODA_TRACK_IDS],
  masterSettings: JSON.parse(JSON.stringify(amb.masterSettings)),
  createdAt: 1793000000000 + idx * 1000,
  updatedAt: 1793000000000 + idx * 1000,
}));
