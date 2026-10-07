/**
 * Hook d'interception et de chargement dynamique des Deep Links d'O Girador.
 * Gère le chargement de morceaux (?loadPreset), de sections (?loadSection) et de motifs (?editPatternId),
 * avec décompression, alimentation du store, notification toast et hygiène d'URL.
 */

import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

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

// Fonction utilitaire pour notifier l'interface via le bus d'événements
function notifyToast(type: 'success' | 'error' | 'info', message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, message } }));
  }
}

// Nettoyage des paramètres d'URL pour préserver l'hygiène SPA
function cleanUrlParams(keys: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;
    keys.forEach((k) => { if (url.searchParams.has(k)) { url.searchParams.delete(k); modified = true; } });
    if (modified) {
      const s = url.searchParams.toString();
      window.history.replaceState({}, document.title, url.pathname + (s ? `?${s}` : '') + url.hash);
    }
  } catch (_) {}
}

export function useDeepLinkLoader({ audio, sequencer, authLoading }: UseDeepLinkLoaderOptions) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // Attendre que l'authentification soit résolue avant de charger les ressources
    if (authLoading || hasExecutedRef.current || typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    // Ignorer si un flux d'entraînement SpeedTrainer spécifique est demandé
    if (searchParams.has('trainingId') || searchParams.has('tocarJunto')) {
      return;
    }

    const loadPresetId = searchParams.get('loadPreset');
    const loadSectionId = searchParams.get('loadSection');
    const editPatternId = searchParams.get('editPatternId');

    if (!loadPresetId && !loadSectionId && !editPatternId) {
      return;
    }

    // Verrouillage d'exécution unique au montage
    hasExecutedRef.current = true;

    const executeLoader = async () => {
      try {
        // 1. Chargement d'un Morceau complet (?loadPreset)
        if (loadPresetId) {
          const { getCloudPreset } = await import('../cloudLibrary');
          let presetData = await getCloudPreset(loadPresetId);
          if (!presetData) {
            await new Promise((r) => setTimeout(r, 400));
            presetData = await getCloudPreset(loadPresetId);
          }

          if (presetData) {
            if (audio.setActivePresetName) {
              audio.setActivePresetName(`cloud:${loadPresetId}`);
            }
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

        // 2. Importation d'une Section multipiste (?loadSection)
        if (loadSectionId) {
          const { getCloudSectionData } = await import('../cloudSections');
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

        // 3. Ouverture d'un Motif / Pattern dans la grille (?editPatternId)
        if (editPatternId) {
          const { getCloudPattern } = await import('../cloudPatterns');
          let cloudPattern = await getCloudPattern(editPatternId);
          if (!cloudPattern) {
            await new Promise((r) => setTimeout(r, 400));
            cloudPattern = await getCloudPattern(editPatternId);
          }

          if (cloudPattern) {
            const currentTracks = useSequencerStore.getState().tracks;
            const targetTrack = currentTracks.find((t: any) => {
              const inst = instrumentsConfig[t.instrumentIdx];
              return inst && (inst.id === cloudPattern.instrumentId || inst.name.toLowerCase() === (cloudPattern.instrumentId || '').toLowerCase());
            });

            if (targetTrack) {
              const pId = Date.now();
              const newPat = {
                ...cloudPattern,
                id: pId,
                measureAssignments: targetTrack.patterns?.[0]?.measureAssignments || [true]
              };
              const updated = currentTracks.map((t: any) => (
                t.id === targetTrack.id
                  ? { ...t, patterns: [...(t.patterns || []), newPat], selectedPatternId: pId }
                  : t
              ));
              useSequencerStore.getState().setTracks(updated);
              useSequencerStore.getState().setEditingTrackId(targetTrack.id);
            } else {
              const instConf = instrumentsConfig.find((i) => i.id === cloudPattern.instrumentId) || instrumentsConfig[0];
              const instIdx = instrumentsConfig.indexOf(instConf);
              const pId = Date.now();
              const singleTrackPreset = {
                version: 3,
                bpm: 100,
                timeSig: '4/4',
                totalMeasures: 1,
                tracks: [{
                  id: 1,
                  instrumentIdx: instIdx !== -1 ? instIdx : 0,
                  customName: cloudPattern.name,
                  patterns: [{ ...cloudPattern, id: pId, measureAssignments: [true] }],
                  selectedPatternId: pId,
                  volume: 80,
                  pan: 0,
                  reverbLevel: 20,
                  isMuted: false,
                  isSoloed: false,
                  isHidden: false
                }]
              };
              await audio.applyPreset(singleTrackPreset);
              useSequencerStore.getState().setEditingTrackId(1);
            }

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
