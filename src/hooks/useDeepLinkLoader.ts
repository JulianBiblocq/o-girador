/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { notifyToast, cleanUrlParams } from './deep-link/deepLinkHelpers';
import { applyPatternDeepLink } from './deep-link/deepLinkPatternLoader';
import { getCloudPreset } from '../cloudLibrary';
import { getCloudSectionData } from '../cloudSections';
import { getCloudPattern } from '../cloudPatterns';
import { fetchCloudToadaById } from '../services/cloudToadas';
import { importToadaPackIntoSequencer } from '../utils/toadaPackImporter';

interface UseDeepLinkLoaderOptions {
  audio: {
    applyPreset: (preset: any) => Promise<void>;
    setActivePresetName?: (name: string) => void;
  };
  sequencer: {
    handleInsertCloudSection?: (sectionData: any, insertAtMeasure: number) => void;
  };
  authLoading: boolean;
}

export function useDeepLinkLoader({ audio, sequencer, authLoading }: UseDeepLinkLoaderOptions) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (authLoading || hasExecutedRef.current || typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('trainingId') || searchParams.has('tocarJunto')) return;

    const loadPresetId = searchParams.get('loadPreset');
    const loadSectionId = searchParams.get('loadSection');
    const editPatternId = searchParams.get('editPatternId');
    const loadToadaId = searchParams.get('loadToadaId');

    if (!loadPresetId && !loadSectionId && !editPatternId && !loadToadaId) return;
    hasExecutedRef.current = true;

    const executeLoader = async () => {
      try {
        if (loadToadaId) {
          const toadaPack = await fetchCloudToadaById(loadToadaId);
          if (toadaPack) {
            await importToadaPackIntoSequencer(null, { pack: toadaPack, deployStartMeasureIdx: 0 });
            cleanUrlParams(['loadToadaId']);
            const name = toadaPack.project?.title || toadaPack.metadata?.title || 'Toada';
            notifyToast('success', `Toada ${name} importée et déroulée dès M1`);
          } else {
            cleanUrlParams(['loadToadaId']);
            notifyToast('error', 'Toada Cloud introuvable');
          }
          return;
        }

        if (loadPresetId) {
          let presetData = await getCloudPreset(loadPresetId);
          if (!presetData) {
            await new Promise((r) => setTimeout(r, 400));
            presetData = await getCloudPreset(loadPresetId);
          }
          if (presetData) {
            if (audio.setActivePresetName) audio.setActivePresetName(`cloud:${loadPresetId}`);
            await audio.applyPreset(presetData);
            cleanUrlParams(['loadPreset', 'presetId']);
            const name = presetData.metadata?.toada || (presetData as any).name || 'Morceau';
            notifyToast('success', `Morceau ${name} chargé depuis le catalogue`);
          } else {
            cleanUrlParams(['loadPreset', 'presetId']);
            notifyToast('error', 'Ressource introuvable ou accès non autorisé');
          }
          return;
        }

        if (loadSectionId) {
          let sectionData = await getCloudSectionData(loadSectionId);
          if (!sectionData) {
            await new Promise((r) => setTimeout(r, 400));
            sectionData = await getCloudSectionData(loadSectionId);
          }
          if (sectionData && sequencer.handleInsertCloudSection) {
            const insertAt = useSequencerStore.getState().totalMeasures || 0;
            sequencer.handleInsertCloudSection(sectionData, insertAt);
            cleanUrlParams(['loadSection']);
            const name = (sectionData as any).name || 'Section';
            notifyToast('success', `Section ${name} importée`);
          } else {
            cleanUrlParams(['loadSection']);
            notifyToast('error', 'Ressource introuvable ou accès non autorisé');
          }
          return;
        }

        if (editPatternId) {
          let cloudPattern = await getCloudPattern(editPatternId);
          if (!cloudPattern) {
            await new Promise((r) => setTimeout(r, 400));
            cloudPattern = await getCloudPattern(editPatternId);
          }
          if (cloudPattern) {
            await applyPatternDeepLink(cloudPattern, audio.applyPreset);
            cleanUrlParams(['editPatternId', 'loadPattern']);
            const name = cloudPattern.name || 'Motif';
            notifyToast('success', `Motif ${name} ouvert pour édition`);
          } else {
            cleanUrlParams(['editPatternId', 'loadPattern']);
            notifyToast('error', 'Ressource introuvable ou accès non autorisé');
          }
        }
      } catch (err) {
        console.error('[useDeepLinkLoader] Erreur traitement deep link :', err);
        cleanUrlParams(['loadPreset', 'loadSection', 'editPatternId', 'loadPattern', 'presetId']);
        notifyToast('error', 'Ressource introuvable ou accès non autorisé');
      }
    };

    executeLoader();
  }, [authLoading, audio, sequencer]);
}
