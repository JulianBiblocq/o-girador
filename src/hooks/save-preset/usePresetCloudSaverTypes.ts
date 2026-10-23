/**
 * Types d'interface pour l'action de sauvegarde cloud (< 40 lignes).
 */

import { QueryClient } from '@tanstack/react-query';
import { CatalogVisibility, Preset, CloudPreset } from '../../types';

export interface ExecuteSaveParams {
  name: string;
  presetData: Preset;
  userProfile: any;
  isAdmin: boolean;
  isMestre: boolean;
  visibility: CatalogVisibility;
  isDraft: boolean;
  effectiveMestreId?: string | null;
  effectiveGroupId?: string;
  matchedPreset: CloudPreset | null;
  loadedMorceauId: string | null;
  cloudPresets: CloudPreset[];
  autoGenerateAudio: boolean;
  genererEtUploaderPresetCloudBounce: any;
  lang: 'fr' | 'pt';
  sequencer: any;
  queryClient: QueryClient;
  onClose: () => void;
  options?: { forceNew?: boolean };
}
