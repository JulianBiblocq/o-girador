import { create, StateCreator } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { TrackGroup, TimeSignature, SongSection, Pattern, PresetMetadata, Language, SongMarker, MasterFX, CloudRhythmSignal } from '../types';

import { usePerformanceStore } from './usePerformanceStore';
// Nous aurons besoin d'instrumentsConfig pour extraire les paroles
import { instrumentsConfig } from '../data';

// ---------------------------------------------------------
// 1. TRACK SLICE
// ---------------------------------------------------------
export interface TrackSlice {
  tracks: TrackGroup[];
  activeAoVivoTrackId: number | null;
  tracksVersion: number;
  masterFX: MasterFX;
  
  // Actions (Squelette pour l'instant)
  setTracks: (tracks: TrackGroup[] | ((prev: TrackGroup[]) => TrackGroup[])) => void;
  setActiveAoVivoTrackId: (id: number | null) => void;
  handleReorderTracksDnd: (activeId: number, overId: number) => void;
  handleTrackInstrumentIdxChange: (id: number, targetInstIdx: number) => void;
  handleTrackMuteToggle: (id: number) => void;
  handleTrackSoloToggle: (id: number) => void;
  handleTrackHideToggle: (id: number) => void;
  handleTrackDelete: (id: number) => void;
  handleTrackVolumeChange: (id: number, val: number) => void;
  handleTrackReverbChange: (id: number, val: number) => void;
  handleTrackPanChange: (id: number, val: number) => void;
  handleTrackSwingChange: (id: number, val: number) => void;
  setTrackFxSend: (trackId: number, fxType: 'reverb' | 'distortion', value: number) => void;
  setTrackPan: (trackId: number, value: number) => void;
  handleLinkTrack: (trackId: number, linkedToTrackId: string | null) => void;
  handleCreateLinkGroup: (trackId: number, name: string) => void;
  handleSetPatternOverride: (trackId: number, measureIdx: number, patternId: number | null | undefined) => void;
  handleTimelinePatternAssign: (trackId: number, patternId: number | null | undefined, measureIdx: number) => void;
  handleTimelinePatternVariationToggle: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  handleTrackStepsChange: (trackId: number, patternId: number, targetSteps: number) => void;
  handleTrackStepVolumeChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number) => void;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleCreateBus: (trackId: number, name: string) => void;
  handleCreateCustomBus: (trackIds: number[], name: string) => void;
  handleCreateCustomLinkGroup: (masterTrackId: number, slaveTrackIds: number[], name: string) => void;
  handleAssignToBus: (trackId: number, busId: string | null) => void;
  handleToggleFoldBus: (busId: string) => void;
  handleToggleSequencerFoldBus: (busId: string) => void;
  setMasterFxVolume: (fxType: 'reverb' | 'distortion', volume: number) => void;
  setMasterFxParam: (fxType: 'reverb' | 'distortion', param: 'time' | 'drive', value: number) => void;
  toggleMasterFxMute: (fxType: 'reverb' | 'distortion') => void;
  handleTrackLowCutToggle: (id: number) => void;
  handleTrackEQChange: (id: number, bands: Partial<TrackGroup['eqBands']>) => void;
  handleTrackEQReset: (id: number) => void;
  handleVocalLatencyChange: (trackId: number, patternId: number, latencyMs: number) => void;
}

export const isToadaBus = (t: { isBusFolder?: boolean; customName?: string; id?: any }): boolean => {
  return !!t.isBusFolder && (t.customName === 'Toada' || String(t.id) === 'toada');
};

export const isToadaChild = (t: { busId?: string }, allTracks: TrackGroup[]): boolean => {
  if (!t.busId) return false;
  const parent = allTracks.find(p => String(p.id) === String(t.busId));
  return !!parent && isToadaBus(parent);
};

export const ensureToadaBus = (list: TrackGroup[]): TrackGroup[] => {
  const puxTrack = list.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = list.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  
  if (!puxTrack && !coroTrack) {
    return list;
  }

  let toadaBus = list.find(t => t.isBusFolder && t.customName === 'Toada');
  let nextList = [...list];

  if (!toadaBus) {
    const newBusId = 999901; // ID unique stable
    toadaBus = {
      id: newBusId,
      instrumentIdx: puxTrack ? puxTrack.instrumentIdx : (coroTrack ? coroTrack.instrumentIdx : 8),
      patterns: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100,
      selectedPatternId: 0,
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      customName: 'Toada',
      reverbVal: 0,
      panVal: 0,
      pan: 0,
      fxSends: { reverb: 0, distortion: 0 }
    };

    // Insérer le bus Toada juste avant le premier des enfants vocaux
    const firstVoiceIndex = list.findIndex(t => 
      t.id === (puxTrack?.id ?? -1) || t.id === (coroTrack?.id ?? -1)
    );
    
    if (firstVoiceIndex !== -1) {
      nextList.splice(firstVoiceIndex, 0, toadaBus);
    } else {
      nextList.push(toadaBus);
    }
  }

  // S'assurer que les enfants pointent vers le bus
  nextList = nextList.map(t => {
    const isPux = instrumentsConfig[t.instrumentIdx]?.id === 'puxador';
    const isCoro = instrumentsConfig[t.instrumentIdx]?.id === 'coro';
    if ((isPux || isCoro) && String(t.busId) !== String(toadaBus!.id)) {
      return { ...t, busId: String(toadaBus!.id) };
    }
    return t;
  });

  return nextList;
};

export const isSequencerVisibleTrack = (t: TrackGroup, allTracks: TrackGroup[]): boolean => {
  if (isToadaChild(t, allTracks)) {
    return false;
  }
  if (isToadaBus(t)) {
    return true;
  }
  return !t.linkedToTrackId && (!t.isBusFolder || t.isLinkFolder);
};

export const isLinearDAWVisibleTrack = (t: TrackGroup, allTracks: TrackGroup[]): boolean => {
  if (isToadaChild(t, allTracks)) {
    return false;
  }
  if (isToadaBus(t)) {
    return true;
  }
  if (t.isBusFolder && !t.isLinkFolder) {
    return false;
  }
  if (t.isLinkFolder) {
    return false;
  }
  if (t.isLinkMaster) {
    return true;
  }
  if (t.linkedToTrackId) {
    return false;
  }
  return !t.isBusFolder;
};

const applyRadii = (list: TrackGroup[]): TrackGroup[] => {
  const drawableTracks = list.filter(t => 
    !t.isHidden && 
    isSequencerVisibleTrack(t, list) && 
    instrumentsConfig[t.instrumentIdx]?.id !== 'apito'
  );

  const gap = drawableTracks.length > 1 ? (495 - 180) / (drawableTracks.length - 1) : 0;
  
  return list.map(t => {
    const drawableIdx = drawableTracks.findIndex(dt => dt.id === t.id);
    if (drawableIdx === -1) {
      return t;
    }
    const newRadius = drawableTracks.length === 1 ? (180 + 495) / 2 : 180 + drawableIdx * gap;
    if (t.radius !== newRadius) {
      return { ...t, radius: newRadius };
    }
    return t;
  });
};

const createTrackSlice: StateCreator<SequencerStore, [], [], TrackSlice> = (set, get) => ({
  tracks: [],
  activeAoVivoTrackId: null,
  tracksVersion: 0,
  masterFX: {
    reverb: {
      returnVolume: 70,
      time: 30,
      isMuted: false
    },
    distortion: {
      returnVolume: 0,
      drive: 20,
      isMuted: false
    }
  },
  setTracks: (updater) => set(state => {
    let nextTracks = typeof updater === 'function' ? (updater as any)(state.tracks) : updater;
    nextTracks = ensureToadaBus(nextTracks);
    return {
      tracks: nextTracks,
      tracksVersion: state.tracksVersion + 1
    };
  }),
  setActiveAoVivoTrackId: (id) => set({ activeAoVivoTrackId: id }),
  
  handleReorderTracksDnd: (activeId, overId) => {
    if (activeId === overId) return;

    // Helper récursif interne pour forcer l'alignement hiérarchique physique dans le store
    const sortTracksHierarchically = (tracksList: TrackGroup[]): TrackGroup[] => {
      const visited = new Set<number>();
      const ordered: TrackGroup[] = [];

      const isRoot = (t: TrackGroup) => {
        if (t.linkedToTrackId && !t.isLinkMaster && !t.isLinkFolder) {
          return false;
        }
        const busIdStr = t.busId;
        if (!busIdStr) return true;
        const hasParent = tracksList.some(p => String(p.id) === String(busIdStr));
        return !hasParent;
      };

      const roots = tracksList.filter(isRoot);

      const visit = (track: TrackGroup) => {
        if (visited.has(track.id)) return;
        visited.add(track.id);
        ordered.push(track);

        const children = tracksList.filter(t => {
          if (visited.has(t.id)) return false;
          const isChildByBus = t.busId && String(t.busId) === String(track.id);
          const isChildByLink = t.linkedToTrackId && String(t.linkedToTrackId) === String(track.id);
          return isChildByBus || isChildByLink;
        });

        children.sort((a, b) => {
          const aScore = a.isBusFolder ? 1 : 0;
          const bScore = b.isBusFolder ? 1 : 0;
          return bScore - aScore;
        });

        children.forEach(visit);
      };

      roots.forEach(visit);

      tracksList.forEach(t => {
        if (!visited.has(t.id)) {
          ordered.push(t);
        }
      });

      return ordered;
    };

    get().pushUndoState();
    set((state) => {
      // On travaille sur la liste triée hiérarchiquement
      const currentTracks = sortTracksHierarchically([...state.tracks]);
      const oldIndex = currentTracks.findIndex(t => t.id === activeId);
      const newIndex = currentTracks.findIndex(t => t.id === overId);

      if (oldIndex === -1 || newIndex === -1) return {};

      const draggedTrack = currentTracks[oldIndex];
      const overTrack = currentTracks[newIndex];

      // --- RÈGLE C : Dépôt sur un dossier de Bus / Groupe de Liaison (Routage) ---
      if (overTrack.isBusFolder && !draggedTrack.isBusFolder) {
        if (draggedTrack.busId !== String(overTrack.id)) {
          const targetBusId = String(overTrack.id);
          const isLink = !!overTrack.isLinkFolder;

          const updatedTrack: TrackGroup = {
            ...draggedTrack,
            busId: targetBusId,
            linkedToTrackId: isLink ? targetBusId : undefined,
            isLinkMaster: isLink ? false : undefined
          };

          let nextTracks = currentTracks.filter(t => t.id !== activeId);
          const busIdxInNext = nextTracks.findIndex(t => t.id === overTrack.id);
          nextTracks.splice(busIdxInNext + 1, 0, updatedTrack);

          return {
            tracks: applyRadii(sortTracksHierarchically(nextTracks)),
            tracksVersion: state.tracksVersion + 1
          };
        }
      }

      // --- RÈGLE B : Drag d'un Enfant (Déracinage automatique s'il sort du bloc) ---
      if (draggedTrack.busId && !draggedTrack.isBusFolder) {
        const busId = draggedTrack.busId;
        const groupIndices = currentTracks
          .map((t, idx) => (String(t.id) === String(busId) || String(t.busId) === String(busId) ? idx : -1))
          .filter(idx => idx !== -1);

        if (groupIndices.length > 0) {
          const minLimit = Math.min(...groupIndices);
          const maxLimit = Math.max(...groupIndices);

          if (newIndex < minLimit || newIndex > maxLimit) {
            const updatedTrack: TrackGroup = {
              ...draggedTrack,
              busId: undefined,
              linkedToTrackId: undefined,
              isLinkMaster: undefined
            };

            const tempTracks = currentTracks.map(t => t.id === activeId ? updatedTrack : t);
            const nextTracks = arrayMove(tempTracks, oldIndex, newIndex) as TrackGroup[];

            return {
              tracks: applyRadii(sortTracksHierarchically(nextTracks)),
              tracksVersion: state.tracksVersion + 1
            };
          }
        }
        
        const newTracks = arrayMove(currentTracks, oldIndex, newIndex) as TrackGroup[];
        return {
          tracks: applyRadii(sortTracksHierarchically(newTracks)),
          tracksVersion: state.tracksVersion + 1
        };
      }

      // --- RÈGLE A : Drag d'un Bus (Déplacement par Bloc) ---
      if (draggedTrack.isBusFolder) {
        const busId = draggedTrack.id;

        const blockTracks = currentTracks.filter(t => String(t.id) === String(busId) || String(t.busId) === String(busId));
        const remainingTracks = currentTracks.filter(t => String(t.id) !== String(busId) && String(t.busId) !== String(busId));

        const targetTrack = currentTracks[newIndex];
        let insertIndex = remainingTracks.findIndex(t => t.id === targetTrack.id);
        
        if (oldIndex < newIndex) {
          insertIndex = insertIndex + 1;
        }

        if (insertIndex === -1) {
          insertIndex = oldIndex < newIndex ? remainingTracks.length : 0;
        }

        const finalTracks = [
          ...remainingTracks.slice(0, insertIndex),
          ...blockTracks,
          ...remainingTracks.slice(insertIndex)
        ];

        return {
          tracks: applyRadii(sortTracksHierarchically(finalTracks)),
          tracksVersion: state.tracksVersion + 1
        };
      }

      // Déplacement standard pour les pistes autonomes
      const newTracks = arrayMove(currentTracks, oldIndex, newIndex) as TrackGroup[];
      return {
        tracks: applyRadii(sortTracksHierarchically(newTracks)),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleTrackInstrumentIdxChange: (id, targetInstIdx) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, instrumentIdx: targetInstIdx } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackMuteToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, isMute: !t.isMute } : t)
    }));
  },

  handleTrackSoloToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, isSolo: !t.isSolo } : t)
    }));
  },

  handleTrackHideToggle: (id) => {
    set((state) => {
      const next = state.tracks.map((t) => t.id === id ? { ...t, isHidden: !t.isHidden } : t);
      return { tracks: applyRadii(next) };
    });
  },

  handleTrackDelete: (id) => {
    get().pushUndoState();
    set((state) => {
      let updated = [...state.tracks];
      const trackToDelete = updated.find(t => t.id === id);

      if (trackToDelete) {
        // Cas A : On supprime un bus de liaison de partition
        if (trackToDelete.isLinkFolder) {
          const patternsToCopy = JSON.parse(JSON.stringify(trackToDelete.patterns));
          updated = updated.map(t => {
            if (String(t.linkedToTrackId) === String(id)) {
              return {
                ...t,
                linkedToTrackId: undefined,
                isLinkMaster: undefined,
                busId: undefined,
                patterns: patternsToCopy.length ? patternsToCopy : t.patterns
              };
            }
            return t;
          });
        }
        // Cas B : On supprime l'instrument maître d'un bus de liaison
        else if (trackToDelete.isLinkMaster && trackToDelete.linkedToTrackId) {
          const busId = trackToDelete.linkedToTrackId;
          const busTrack = updated.find(t => String(t.id) === String(busId) && t.isLinkFolder);
          const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

          // Dissoudre le groupe pour les autres enfants restants
          updated = updated.map(t => {
            if (t.id !== id && String(t.linkedToTrackId) === String(busId)) {
              return {
                ...t,
                linkedToTrackId: undefined,
                isLinkMaster: undefined,
                busId: undefined,
                patterns: patternsToCopy.length ? patternsToCopy : t.patterns
              };
            }
            return t;
          });
        }
        // Cas C : On supprime un bus audio de section (isBusFolder: true)
        else if (trackToDelete.isBusFolder) {
          updated = updated.filter(t => String(t.busId) !== String(id));
        }
      }


      // Effectuer la suppression physique de la piste
      const remaining = updated.filter((t) => t.id !== id);

      return { 
        tracks: applyRadii(remaining),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleTrackVolumeChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, volumeVal: val } : t)
    }));
  },

  handleTrackReverbChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, reverbVal: val } : t)
    }));
  },

  handleTrackPanChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, panVal: val, pan: val } : t)
    }));
  },

  handleTrackSwingChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, swingIntensity: val } : t)
    }));
  },

  setTrackFxSend: (trackId, fxType, value) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              reverbVal: fxType === 'reverb' ? value : t.reverbVal,
              fxSends: {
                reverb: fxType === 'reverb' ? value : (t.fxSends?.reverb ?? t.reverbVal ?? 0),
                distortion: fxType === 'distortion' ? value : (t.fxSends?.distortion ?? 0)
              }
            }
          : t
      )
    }));
  },

  setTrackPan: (trackId, value) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, pan: value, panVal: value } : t
      )
    }));
  },

  handleTrackLowCutToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, lowCut: !t.lowCut } : t
      )
    }));
  },

  handleTrackEQChange: (id, bands) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === id) {
          const currentBands = t.eqBands || {
            low: { f: 100, g: 0 },
            mid: { f: 1000, g: 0, q: 'wide' as const },
            high: { f: 8000, g: 0 }
          };
          return {
            ...t,
            eqBands: {
              low: { ...currentBands.low, ...bands.low },
              mid: { ...currentBands.mid, ...bands.mid },
              high: { ...currentBands.high, ...bands.high }
            }
          };
        }
        return t;
      })
    }));
  },

  handleTrackEQReset: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id
          ? {
              ...t,
              eqBands: {
                low: { f: 100, g: 0 },
                mid: { f: 1000, g: 0, q: 'wide' as const },
                high: { f: 8000, g: 0 }
              }
            }
          : t
      )
    }));
  },

  handleLinkTrack: (trackId, linkedToTrackId) => {
    get().pushUndoState();
    set((state) => {
      let updated = [...state.tracks];

      if (linkedToTrackId) {
        const masterTrackId = parseInt(linkedToTrackId, 10);
        const masterTrack = updated.find(t => t.id === masterTrackId);
        const slaveTrackIndex = updated.findIndex(t => t.id === trackId);

        if (masterTrack && slaveTrackIndex !== -1) {
          let targetBusId = masterTrack.busId;
          let busTrack = targetBusId ? updated.find(t => t.id === parseInt(targetBusId!, 10) && t.isLinkFolder) : null;

          // Si le maître n'est pas déjà dans un bus de liaison de partition, on en crée un automatiquement
          if (!busTrack) {
            const masterInst = instrumentsConfig[masterTrack.instrumentIdx];
            const isAlfaia = masterInst.name.toLowerCase().includes('alfaia');
            const busName = isAlfaia ? 'ALFAIAS' : `${masterInst.name.toUpperCase()}S`;
            const newBusId = Date.now();

            const clonedPatterns = JSON.parse(JSON.stringify(masterTrack.patterns));

            const newBusTrack: TrackGroup = {
              id: newBusId,
              instrumentIdx: masterTrack.instrumentIdx,
              patterns: clonedPatterns,
              isMute: false,
              isSolo: false,
              isHidden: false,
              volumeVal: 100,
              selectedPatternId: masterTrack.selectedPatternId,
              isBusFolder: true,
              isLinkFolder: true,
              isFolded: false,
              isSequencerFolded: false,
              customName: busName,
              reverbVal: 0,
              panVal: 0,
              pan: 0,
              fxSends: { reverb: 0, distortion: 0 }
            };

            const masterTrackIndex = updated.findIndex(t => t.id === masterTrackId);
            
            // Mettre à jour le maître : il devient lié au bus parent et est déclaré link master
            updated = updated.map(t => t.id === masterTrackId 
              ? { ...t, busId: String(newBusId), linkedToTrackId: String(newBusId), isLinkMaster: true } 
              : t
            );

            // Insérer le bus juste avant le maître
            updated.splice(masterTrackIndex, 0, newBusTrack);
            
            targetBusId = String(newBusId);
          }

          // Lier l'esclave au bus
          updated = updated.map(t => 
            t.id === trackId 
              ? { ...t, linkedToTrackId: targetBusId, busId: targetBusId, isLinkMaster: false } 
              : t
          );

          // Déplacer physiquement l'esclave pour la coller à la droite des autres pistes de ce bus
          const slaveTrack = updated.find(t => t.id === trackId);
          if (slaveTrack) {
            // Filtrer la track esclave de sa position actuelle
            updated = updated.filter(t => t.id !== trackId);

            // Trouver l'index du dernier membre du bus
            const lastMemberIndex = updated.map((t, idx) => 
              (String(t.id) === String(targetBusId) || String(t.busId) === String(targetBusId)) ? idx : -1
            ).reduce((max, idx) => Math.max(max, idx), -1);

            if (lastMemberIndex !== -1) {
              updated.splice(lastMemberIndex + 1, 0, slaveTrack);
            } else {
              updated.push(slaveTrack);
            }
          }
        }
      } else {
        // Délier la piste trackId
        const trackToUnlink = updated.find(t => t.id === trackId);
        if (trackToUnlink) {
          const busId = trackToUnlink.linkedToTrackId;
          const busTrack = busId ? updated.find(t => String(t.id) === String(busId) && t.isLinkFolder) : null;
          const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

          // Si c'est le maître qui se délie, on dissout TOUT le groupe de liaison
          if (trackToUnlink.isLinkMaster && busId) {
            // Pour toutes les pistes liées à ce bus
            updated = updated.map(t => {
              if (String(t.linkedToTrackId) === String(busId)) {
                return {
                  ...t,
                  linkedToTrackId: undefined,
                  isLinkMaster: undefined,
                  busId: undefined,
                  patterns: patternsToCopy.length ? patternsToCopy : t.patterns
                };
              }
              return t;
            });

            // Supprimer le bus
            updated = updated.filter(t => String(t.id) !== String(busId));
          } else {
            // Si c'est juste un esclave, on le délie individuellement
            updated = updated.map(t => 
              t.id === trackId 
                ? { 
                    ...t, 
                    linkedToTrackId: undefined, 
                    isLinkMaster: undefined,
                    busId: undefined, 
                    patterns: patternsToCopy.length ? patternsToCopy : t.patterns
                  } 
                : t
            );
          }
        }
      }

      return {
        tracks: applyRadii(updated),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleCreateLinkGroup: (trackId, name) => {
    get().pushUndoState();
    set((state) => {
      const trackIndex = state.tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return {};

      const masterTrack = state.tracks[trackIndex];
      const newBusId = Date.now();

      // On clone les patterns du maître sur le bus de liaison
      const clonedPatterns = JSON.parse(JSON.stringify(masterTrack.patterns));

      const newBusTrack: TrackGroup = {
        id: newBusId,
        instrumentIdx: masterTrack.instrumentIdx,
        patterns: clonedPatterns,
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 100,
        selectedPatternId: masterTrack.selectedPatternId,
        isBusFolder: true,
        isLinkFolder: true,
        isFolded: false,
        isSequencerFolded: false,
        customName: name,
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      // Mettre à jour le maître : il devient lié au bus parent et est déclaré link master
      const updatedTracks = state.tracks.map(t => 
        t.id === trackId 
          ? { 
              ...t, 
              busId: String(newBusId), 
              linkedToTrackId: String(newBusId), 
              isLinkMaster: true 
            } 
          : t
      );

      // Insérer le bus juste avant le maître
      const nextTracks = [
        ...updatedTracks.slice(0, trackIndex),
        newBusTrack,
        ...updatedTracks.slice(trackIndex)
      ];

      return {
        tracks: applyRadii(nextTracks),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleCreateBus: (trackId, name) => {
    get().pushUndoState();
    set((state) => {
      const trackIndex = state.tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return {};

      const newBusId = Date.now();
      const newBusTrack: TrackGroup = {
        id: newBusId,
        instrumentIdx: state.tracks[trackIndex].instrumentIdx,
        patterns: [],
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 100,
        selectedPatternId: 0,
        isBusFolder: true,
        isFolded: false,
        isSequencerFolded: false,
        customName: name,
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      const updatedTracks = state.tracks.map(t => 
        t.id === trackId ? { ...t, busId: String(newBusId), linkedToTrackId: undefined } : t
      );

      const nextTracks = [
        ...updatedTracks.slice(0, trackIndex),
        newBusTrack,
        ...updatedTracks.slice(trackIndex)
      ];

      return {
        tracks: applyRadii(nextTracks),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleCreateCustomBus: (trackIds, name) => {
    get().pushUndoState();
    set((state) => {
      if (trackIds.length === 0) return {};
      
      const indices = trackIds.map(id => state.tracks.findIndex(t => t.id === id)).filter(idx => idx !== -1);
      if (indices.length === 0) return {};
      
      const firstIndex = Math.min(...indices);
      const representativeTrack = state.tracks[firstIndex];
      const newBusId = Date.now();
      
      const newBusTrack: TrackGroup = {
        id: newBusId,
        instrumentIdx: representativeTrack.instrumentIdx,
        patterns: [],
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 100,
        selectedPatternId: 0,
        isBusFolder: true,
        isFolded: false,
        isSequencerFolded: false,
        customName: name,
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      const updatedSelectedTracks = state.tracks
        .filter(t => trackIds.includes(t.id))
        .map(t => ({ ...t, busId: String(newBusId), linkedToTrackId: undefined }));
      
      const remainingTracks = state.tracks.filter(t => !trackIds.includes(t.id));
      
      const insertIndex = Math.max(0, Math.min(firstIndex, remainingTracks.length));
      
      const nextTracks = [
        ...remainingTracks.slice(0, insertIndex),
        newBusTrack,
        ...updatedSelectedTracks,
        ...remainingTracks.slice(insertIndex)
      ];

      return {
        tracks: applyRadii(nextTracks),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleCreateCustomLinkGroup: (masterTrackId, slaveTrackIds, name) => {
    get().pushUndoState();
    set((state) => {
      const masterTrack = state.tracks.find(t => t.id === masterTrackId);
      if (!masterTrack) return {};
      
      const newBusId = Date.now();
      const clonedPatterns = JSON.parse(JSON.stringify(masterTrack.patterns));
      
      const newBusTrack: TrackGroup = {
        id: newBusId,
        instrumentIdx: masterTrack.instrumentIdx,
        patterns: clonedPatterns,
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 70,
        selectedPatternId: masterTrack.selectedPatternId,
        isBusFolder: true,
        isLinkFolder: true,
        isFolded: true,
        isSequencerFolded: true,
        customName: name,
        busId: masterTrack.busId, // Hériter du bus audio d'origine (ex: Section Caixas)
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      const masterTrackIndex = state.tracks.findIndex(t => t.id === masterTrackId);
      
      const updatedMaster = {
        ...masterTrack,
        busId: String(newBusId),
        linkedToTrackId: String(newBusId),
        isLinkMaster: true
      };
      
      const updatedSlaves = state.tracks
        .filter(t => slaveTrackIds.includes(t.id))
        .map(t => ({
          ...t,
          busId: String(newBusId),
          linkedToTrackId: String(newBusId),
          isLinkMaster: false
        }));
      
      const allSelectedIds = [masterTrackId, ...slaveTrackIds];
      const remainingTracks = state.tracks.filter(t => !allSelectedIds.includes(t.id));
      
      const insertIndex = Math.max(0, Math.min(masterTrackIndex, remainingTracks.length));
      
      const nextTracks = [
        ...remainingTracks.slice(0, insertIndex),
        newBusTrack,
        updatedMaster,
        ...updatedSlaves,
        ...remainingTracks.slice(insertIndex)
      ];

      return {
        tracks: applyRadii(nextTracks),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleSetPatternOverride: (trackId, measureIdx, patternId) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          const overrides = { ...(t.patternOverrides || {}) };
          if (patternId === undefined) {
            delete overrides[measureIdx];
          } else {
            overrides[measureIdx] = patternId;
          }
          return { ...t, patternOverrides: overrides };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleAssignToBus: (trackId, busId) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === trackId ? { ...t, busId: busId || undefined } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleToggleFoldBus: (busId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => String(t.id) === String(busId) ? { ...t, isFolded: !t.isFolded } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleToggleSequencerFoldBus: (busId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => String(t.id) === String(busId) ? { ...t, isSequencerFolded: !t.isSequencerFolded } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  setMasterFxVolume: (fxType, volume) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          returnVolume: volume
        }
      }
    }));
  },

  setMasterFxParam: (fxType, param, value) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          [param]: value
        }
      }
    }));
  },

  toggleMasterFxMute: (fxType) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          isMuted: !state.masterFX[fxType].isMuted
        }
      }
    }));
  },

  handleTimelinePatternAssign: (trackId, patternId, measureIdx) => {
    get().pushUndoState();
    set((state) => {
      const clickedTrack = state.tracks.find(t => t.id === trackId);
      const isLinkedSlave = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
      const isLinkMaster = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

      if (isLinkedSlave) {
        return {
          tracks: state.tracks.map(t => {
            if (t.id === trackId) {
              const overrides = { ...(t.patternOverrides || {}) };
              if (patternId === undefined) {
                delete overrides[measureIdx];
              } else {
                overrides[measureIdx] = patternId;
              }
              return { ...t, patternOverrides: overrides };
            }
            return t;
          }),
          tracksVersion: state.tracksVersion + 1
        };
      }

      const isToadaTrackId = isToadaBus(state.tracks.find(t => t.id === trackId) || {});
      
      let targetTrackId = trackId;
      if (isLinkMaster && clickedTrack) {
        targetTrackId = Number(clickedTrack.linkedToTrackId);
      } else if (patternId !== null && patternId !== undefined) {
        const ownerTrack = state.tracks.find(t => t.patterns.some(p => p.id === patternId));
        if (ownerTrack) {
          targetTrackId = ownerTrack.id;
        }
      }

      const puxTrack = state.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = state.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

      const isVoiceToadaAssign = isToadaTrackId || 
        (puxTrack && targetTrackId === puxTrack.id) || 
        (coroTrack && targetTrackId === coroTrack.id);

      return {
        tracks: state.tracks.map(t => {
          if (isVoiceToadaAssign && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                assign[measureIdx] = (t.id === targetTrackId && p.id === patternId);
                return { ...p, measureAssignments: assign };
              })
            };
          }
          
          if (t.id === targetTrackId) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                assign[measureIdx] = p.id === patternId;
                return { ...p, measureAssignments: assign };
              })
            };
          }
          return t;
        }),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleTimelinePatternVariationToggle: (trackId, patternId, measureIdx, val) => {
    get().pushUndoState();
    set((state) => {
      const ownerTrack = state.tracks.find(t => t.patterns.some(p => p.id === patternId));
      const targetTrackId = ownerTrack ? ownerTrack.id : trackId;
      return {
        tracks: state.tracks.map(t => {
          if (t.id === targetTrackId) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                if (p.id === patternId) {
                  const currentAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : Array(state.totalMeasures).fill(false);
                  currentAllow[measureIdx] = val;
                  return { ...p, measureAllowVariations: currentAllow };
                }
                return p;
              })
            };
          }
          return t;
        }),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleVocalLatencyChange: (trackId, patternId, latencyMs) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (p.id === patternId) {
                return { ...p, vocalLatency: latencyMs };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepsChange: (trackId, patternId, targetSteps) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const arrSteps = Array(targetSteps).fill(0);
                const arrLyrics = Array(targetSteps).fill('');
                const arrNotes = Array(targetSteps).fill('');
                const arrVols = Array(targetSteps).fill(80);
                const arrDecays = Array(targetSteps).fill(100);
                const arrMicro = Array(targetSteps).fill(0);

                for (let i = 0; i < Math.min(targetSteps, p.steps); i++) {
                  arrSteps[i] = p.activeSteps[i];
                  arrLyrics[i] = p.lyrics?.[i] || '';
                  arrNotes[i] = p.notes?.[i] || '';
                  if (p.volumes && p.volumes[i] !== undefined) arrVols[i] = p.volumes[i];
                  if (p.decays && p.decays[i] !== undefined) arrDecays[i] = p.decays[i];
                  if (p.microtimings && p.microtimings[i] !== undefined) arrMicro[i] = p.microtimings[i];
                }

                return {
                  ...p,
                  steps: targetSteps,
                  activeSteps: arrSteps,
                  lyrics: arrLyrics,
                  notes: arrNotes,
                  volumes: arrVols,
                  decays: arrDecays,
                  microtimings: arrMicro,
                };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepVolumeChange: (trackId, patternId, stepIdx, val) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
                if (Array.isArray(stepIdx)) {
                  stepIdx.forEach(idx => copyVols[idx] = val);
                } else {
                  copyVols[stepIdx] = val;
                }
                return { ...p, volumes: copyVols };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handlePatternBeatResolutionChange: (patternId, beatIndex, newResolution) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              let currentRes = p.beatResolutions;
              if (!currentRes) {
                let inferredBeats = 4;
                if (state.timeSig === '3/4') inferredBeats = 3;
                if (state.timeSig === '2/4' || state.timeSig === '6/8') inferredBeats = 2;
                if (state.timeSig === '12/8') inferredBeats = 4;
                
                let stepsPerBeat = Math.floor(p.steps / inferredBeats);
                if (stepsPerBeat === 0) stepsPerBeat = 4;
                
                currentRes = Array(inferredBeats).fill(stepsPerBeat);
                const total = currentRes.reduce((a, b) => a + b, 0);
                if (total !== p.steps) {
                   currentRes[currentRes.length - 1] += (p.steps - total);
                }
              }

              if (beatIndex >= currentRes.length) return p;
              
              const oldRes = currentRes[beatIndex];
              if (oldRes === newResolution) return p;

              const nextRes = [...currentRes];
              nextRes[beatIndex] = newResolution;
              const targetSteps = p.steps - oldRes + newResolution;

              const startIndex = currentRes.slice(0, beatIndex).reduce((sum, val) => sum + val, 0);

              const spliceArray = <T,>(arr: T[] | undefined, defaultVal: T, oldR: number, newR: number, dontCopy: boolean = false) => {
                if (!arr) return undefined;
                const copy = [...arr];
                const replacement = Array(newR).fill(defaultVal);
                if (!dontCopy) {
                  for (let i = 0; i < Math.min(oldR, newR); i++) {
                    replacement[i] = copy[startIndex + i];
                  }
                }
                copy.splice(startIndex, oldR, ...replacement);
                return copy;
              };

              const pVolumes = p.volumes || Array(p.steps).fill(80);
              const pDecays = p.decays || Array(p.steps).fill(100);
              const pMicro = p.microtimings || Array(p.steps).fill(0);
              const pLyrics = p.lyrics || Array(p.steps).fill('');
              const pNotes = p.notes || Array(p.steps).fill('');

              return {
                ...p,
                steps: targetSteps,
                beatResolutions: nextRes,
                activeSteps: spliceArray(p.activeSteps, 0, oldRes, newResolution) as (string | number)[],
                lyrics: spliceArray(pLyrics, '', oldRes, newResolution),
                notes: spliceArray(pNotes, '', oldRes, newResolution),
                volumes: spliceArray(pVolumes, 80, oldRes, newResolution),
                decays: spliceArray(pDecays, 100, oldRes, newResolution),
                microtimings: spliceArray(pMicro, 0, oldRes, newResolution, newResolution === 3 || newResolution === 6),
              };
            }
            return p;
          })
        };
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  }
});

// ---------------------------------------------------------
// 2. STRUCTURE SLICE
// ---------------------------------------------------------
export interface StructureSlice {
  totalMeasures: number;
  bpm: number;
  timeSig: TimeSignature;
  
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp')[];
  measureSignals: (string | null)[];
  songSections: SongSection[];
  songMarkers: SongMarker[];
  mestreSignals: CloudRhythmSignal[];
  
  setTotalMeasures: (val: number | ((prev: number) => number)) => void;
  setBpm: (bpm: number) => void;
  setTimeSig: (sig: TimeSignature) => void;
  setMeasureSignals: (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => void;
  setMeasureBpms: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureTimeSigs: (updater: TimeSignature[] | ((prev: TimeSignature[]) => TimeSignature[])) => void;
  setMeasureBpmTransitions: (updater: ('immediate' | 'ramp')[] | ((prev: ('immediate' | 'ramp')[]) => ('immediate' | 'ramp')[])) => void;
  setMeasureVols: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureVolTransitions: (updater: ('immediate' | 'ramp')[] | ((prev: ('immediate' | 'ramp')[]) => ('immediate' | 'ramp')[])) => void;
  setSongSections: (updater: SongSection[] | ((prev: SongSection[]) => SongSection[])) => void;
  setSongMarkers: (updater: SongMarker[] | ((prev: SongMarker[]) => SongMarker[])) => void;
  setMestreSignals: (signals: CloudRhythmSignal[]) => void;
  handleTotalMeasuresChange: (val: number) => void;
  handleMeasureTimeSigChange: (measureIdx: number, val: TimeSignature) => void;
  handleMeasureBpmChange: (measureIdx: number, val: number) => void;
  handleMeasureTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
  handleMeasureVolChange: (measureIdx: number, val: number) => void;
  handleMeasureVolTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
  handleUpdateSongSection: (id: string, name: string, start: number, end: number, color?: string, level?: number) => void;
  handleUpdateSectionRepeat: (id: string, count: number) => void;
  handleDeleteSongSection: (id: string) => void;
  handleCreateSongMarker: (name: string, measure: number, color?: string) => void;
  handleUpdateSongMarker: (id: string, name: string, measure: number, color?: string) => void;
  handleDeleteSongMarker: (id: string) => void;
  handleDeleteMeasure: (measureIdx: number) => void;
  handleInsertMeasure: (measureIdx: number) => void;
}

const createStructureSlice: StateCreator<SequencerStore, [], [], StructureSlice> = (set, get) => ({
  totalMeasures: 8,
  bpm: 83,
  timeSig: '4/4',
  measureTimeSigs: Array(8).fill('4/4'),
  setSongSections: (updater) => set(state => ({ songSections: typeof updater === 'function' ? (updater as any)(state.songSections) : updater })),
  setMeasureTimeSigs: (updater) => set(state => ({ 
    measureTimeSigs: typeof updater === 'function' ? (updater as any)(state.measureTimeSigs) : updater,
    tracksVersion: state.tracksVersion + 1
  })),
  measureBpms: Array(8).fill(83),
  measureBpmTransitions: Array(8).fill('immediate'),
  measureVols: Array(8).fill(100),
  measureVolTransitions: Array(8).fill('immediate'),
  measureSignals: Array(8).fill(null),
  songSections: [],
  songMarkers: [],
  mestreSignals: [],
 
  setBpm: (bpm) => set({ bpm }),
  setTimeSig: (sig) => set({ timeSig: sig }),
  setTotalMeasures: (updater) => set(state => ({ 
    totalMeasures: typeof updater === 'function' ? updater(state.totalMeasures) : updater,
    tracksVersion: state.tracksVersion + 1
  })),
  
  setMeasureSignals: (updater) => set((state) => ({
    measureSignals: typeof updater === 'function' ? updater(state.measureSignals) : updater
  })),
  setMeasureBpms: (updater) => set((state) => ({ measureBpms: typeof updater === 'function' ? updater(state.measureBpms) : updater })),
  setMeasureBpmTransitions: (updater) => set((state) => ({ measureBpmTransitions: typeof updater === 'function' ? updater(state.measureBpmTransitions) : updater })),
  setMeasureVols: (updater) => set((state) => ({ measureVols: typeof updater === 'function' ? updater(state.measureVols) : updater })),
  setMeasureVolTransitions: (updater) => set((state) => ({ measureVolTransitions: typeof updater === 'function' ? updater(state.measureVolTransitions) : updater })),
  setSongMarkers: (updater) => set((state) => ({ songMarkers: typeof updater === 'function' ? updater(state.songMarkers) : updater })),
  setMestreSignals: (signals) => set({ mestreSignals: signals }),

  handleTotalMeasuresChange: (val) => {
    get().pushUndoState();
    set((state) => {
      const expandArray = <T>(arr: T[], fillValue: T): T[] => {
        if (arr.length === val) return arr;
        if (arr.length > val) return arr.slice(0, val);
        const next = [...arr];
        while (next.length < val) next.push(fillValue);
        return next;
      };

      return {
        totalMeasures: val,
        measureTimeSigs: expandArray(state.measureTimeSigs, state.timeSig),
        measureBpms: expandArray(state.measureBpms, state.bpm),
        measureBpmTransitions: expandArray(state.measureBpmTransitions, 'immediate'),
        measureVols: expandArray(state.measureVols, 100),
        measureVolTransitions: expandArray(state.measureVolTransitions, 'immediate'),
        measureSignals: expandArray(state.measureSignals, null),
        tracks: state.tracks.map(t => ({
          ...t,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: expandArray(p.measureAssignments || [], false),
            measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, false) : undefined
          }))
        })),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleMeasureTimeSigChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureTimeSigs];
      arr[idx] = val;
      return { 
        measureTimeSigs: arr,
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleMeasureBpmChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureBpms];
      arr[idx] = val;
      return { measureBpms: arr };
    });
  },

  handleMeasureTransitionChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureBpmTransitions];
      arr[idx] = val;
      return { measureBpmTransitions: arr };
    });
  },

  handleMeasureVolChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureVols];
      arr[idx] = val;
      return { measureVols: arr };
    });
  },

  handleMeasureVolTransitionChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureVolTransitions];
      arr[idx] = val;
      return { measureVolTransitions: arr };
    });
  },

  handleCreateSongSection: (name, start, end, color, repeatCount, level) => {
    set((state) => {
      const newSection: SongSection = {
        id: Date.now().toString(),
        name,
        startMeasure: start,
        endMeasure: end,
        color: color || '#27ae60',
        repeatCount: repeatCount || 1,
        level: level || 0,
      };
      const next = [...state.songSections, newSection];
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return { songSections: next };
    });
  },

  handleUpdateSongSection: (id, name, start, end, color, level) => {
    set((state) => {
      const next = state.songSections.map(s => 
        s.id === id ? { ...s, name, startMeasure: start, endMeasure: end, color: color || s.color, level: level || s.level } : s
      );
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return { songSections: next };
    });
  },

  handleUpdateSectionRepeat: (id, count) => {
    set((state) => ({
      songSections: state.songSections.map(s => s.id === id ? { ...s, repeatCount: count } : s)
    }));
  },

  handleDeleteSongSection: (id) => {
    set((state) => ({
      songSections: state.songSections.filter(s => s.id !== id)
    }));
  },

  handleCreateSongMarker: (name, measure, color) => set(state => {
    const newMarker: SongMarker = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      name,
      measure,
      color: color || '#f19066',
    };
    const next = [...state.songMarkers, newMarker];
    next.sort((a, b) => a.measure - b.measure);
    return { songMarkers: next };
  }),

  handleUpdateSongMarker: (id, name, measure, color) => set(state => {
    const next = state.songMarkers.map(m => 
      m.id === id ? { ...m, name, measure, color: color || m.color } : m
    );
    next.sort((a, b) => a.measure - b.measure);
    return { songMarkers: next };
  }),

  handleDeleteSongMarker: (id) => set(state => ({
    songMarkers: state.songMarkers.filter(m => m.id !== id)
  })),

  handleDeleteMeasure: (measureIdx) => {
    get().pushUndoState();
    set((state) => {
      if (state.totalMeasures <= 1) return state;
      return {
        totalMeasures: state.totalMeasures - 1,
        measureTimeSigs: state.measureTimeSigs.filter((_, idx) => idx !== measureIdx),
        measureBpms: state.measureBpms.filter((_, idx) => idx !== measureIdx),
        measureBpmTransitions: state.measureBpmTransitions.filter((_, idx) => idx !== measureIdx),
        measureVols: state.measureVols.filter((_, idx) => idx !== measureIdx),
        measureVolTransitions: state.measureVolTransitions.filter((_, idx) => idx !== measureIdx),
        measureSignals: state.measureSignals.filter((_, idx) => idx !== measureIdx),
        songSections: state.songSections
          .filter(s => !(s.startMeasure === measureIdx && s.endMeasure === measureIdx))
          .map(s => {
            if (s.startMeasure > measureIdx) {
              return { ...s, startMeasure: s.startMeasure - 1, endMeasure: s.endMeasure - 1 };
            } else if (s.endMeasure >= measureIdx) {
              return { ...s, endMeasure: s.endMeasure - 1 };
            }
            return s;
          }),
        songMarkers: state.songMarkers.filter(m => m.measure !== measureIdx).map(m => {
          if (m.measure > measureIdx) {
            return { ...m, measure: m.measure - 1 };
          }
          return m;
        }),
        tracks: state.tracks.map(t => ({
          ...t,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: p.measureAssignments.filter((_, idx) => idx !== measureIdx),
            measureAllowVariations: p.measureAllowVariations ? p.measureAllowVariations.filter((_, idx) => idx !== measureIdx) : undefined
          }))
        })),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleInsertMeasure: (measureIdx) => {
    get().pushUndoState();
    set((state) => {
      const refSig = state.measureTimeSigs[measureIdx] || state.timeSig;
      const refBpm = state.measureBpms[measureIdx] || state.bpm;
      const refVol = state.measureVols[measureIdx] !== undefined ? state.measureVols[measureIdx] : 100;

      const spliceArray = <T>(arr: T[], insertVal: T): T[] => {
        const next = [...arr];
        next.splice(measureIdx, 0, insertVal);
        return next;
      };

      return {
        totalMeasures: state.totalMeasures + 1,
        measureTimeSigs: spliceArray(state.measureTimeSigs, refSig),
        measureBpms: spliceArray(state.measureBpms, refBpm),
        measureBpmTransitions: spliceArray(state.measureBpmTransitions, 'immediate'),
        measureVols: spliceArray(state.measureVols, refVol),
        measureVolTransitions: spliceArray(state.measureVolTransitions, 'immediate'),
        measureSignals: spliceArray(state.measureSignals, null),
        songSections: state.songSections.map(s => {
          if (s.startMeasure >= measureIdx) {
            return { ...s, startMeasure: s.startMeasure + 1, endMeasure: s.endMeasure + 1 };
          } else if (s.endMeasure >= measureIdx) {
            return { ...s, endMeasure: s.endMeasure + 1 };
          }
          return s;
        }),
        songMarkers: state.songMarkers.map(m => {
          if (m.measure >= measureIdx) {
            return { ...m, measure: m.measure + 1 };
          }
          return m;
        }),
        tracks: state.tracks.map(t => ({
          ...t,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: spliceArray(p.measureAssignments, false),
            measureAllowVariations: p.measureAllowVariations ? spliceArray(p.measureAllowVariations, false) : undefined
          }))
        })),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },
});

// ---------------------------------------------------------
// 3. PLAYBACK SLICE
// ---------------------------------------------------------
export interface PlaybackSlice {
  currentMeasure: number;
  currentExpandedMeasureIdx: number;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  isLoopRegionActive: boolean;
  isLooping: boolean;

  handleSetLoopStart: (measure: number | null) => void;
  handleSetLoopEnd: (measure: number | null) => void;
  handleClearLoop: () => void;
  setIsLoopRegionActive: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsLooping: (looping: boolean) => void;
  setLoopStartMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setLoopEndMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setCurrentMeasure: (measure: number | ((prev: number) => number)) => void;
  setCurrentExpandedMeasureIdx: (idx: number | ((prev: number) => number)) => void;
}

const createPlaybackSlice: StateCreator<SequencerStore, [], [], PlaybackSlice> = (set, get) => ({
  currentMeasure: 0,
  currentExpandedMeasureIdx: 0,
  loopStartMeasure: null,
  loopEndMeasure: null,
  isLoopRegionActive: true,
  isLooping: true,

  setCurrentMeasure: (updater) => set(state => ({ currentMeasure: typeof updater === 'function' ? updater(state.currentMeasure) : updater })),
  setCurrentExpandedMeasureIdx: (updater) => set(state => ({ currentExpandedMeasureIdx: typeof updater === 'function' ? updater(state.currentExpandedMeasureIdx) : updater })),
  setLoopStartMeasure: (updater) => set(state => ({ loopStartMeasure: typeof updater === 'function' ? updater(state.loopStartMeasure) : updater })),
  setLoopEndMeasure: (updater) => set(state => ({ loopEndMeasure: typeof updater === 'function' ? updater(state.loopEndMeasure) : updater })),

  handleSetLoopStart: (measureIdx) => {
    if (measureIdx !== null) get().pushUndoState();
    set((state) => {
      const updates: Partial<PlaybackSlice> = {
        loopStartMeasure: measureIdx,
        isLoopRegionActive: measureIdx !== null,
      };
      if (measureIdx !== null && state.loopEndMeasure !== null && measureIdx > state.loopEndMeasure) {
        updates.loopEndMeasure = measureIdx;
      }
      return updates;
    });
  },

  handleSetLoopEnd: (measureIdx) => {
    if (measureIdx !== null) get().pushUndoState();
    set((state) => {
      const updates: Partial<PlaybackSlice> = {
        loopEndMeasure: measureIdx,
        isLoopRegionActive: measureIdx !== null,
      };
      if (measureIdx !== null && state.loopStartMeasure !== null && measureIdx < state.loopStartMeasure) {
        updates.loopStartMeasure = measureIdx;
      }
      return updates;
    });
  },

  handleClearLoop: () => set({ loopStartMeasure: null, loopEndMeasure: null, isLoopRegionActive: false }),
  setIsLoopRegionActive: (updater) => set(state => ({ isLoopRegionActive: typeof updater === 'function' ? (updater as any)(state.isLoopRegionActive) : updater })),
  setIsLooping: (looping) => set({ isLooping: looping }),
});

// ---------------------------------------------------------
// 4. HISTORY SLICE
// ---------------------------------------------------------
export type StructureSnapshot = Pick<StructureSlice, 'measureTimeSigs' | 'measureBpms' | 'measureBpmTransitions' | 'measureVols' | 'measureVolTransitions' | 'songSections' | 'songMarkers'>;

export interface HistorySlice {
  tracksHistory: TrackGroup[][];
  tracksRedoHistory: TrackGroup[][];
  songStructureHistory: StructureSnapshot[];
  songStructureRedoHistory: StructureSnapshot[];

  pushUndoState: (customTracksState?: TrackGroup[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  clearHistory: () => void;
}

const createHistorySlice: StateCreator<SequencerStore, [], [], HistorySlice> = (set, get) => ({
  tracksHistory: [],
  tracksRedoHistory: [],
  songStructureHistory: [],
  songStructureRedoHistory: [],

  pushUndoState: (customTracksState) => {
    const state = get();
    const tracksToSave = customTracksState ? customTracksState : state.tracks;
    
    set((prev) => {
      // Partage structurel : Stockage de la référence immuable directement
      const nextTracksHistory = [...prev.tracksHistory, tracksToSave];
      if (nextTracksHistory.length > 10) nextTracksHistory.shift();

      const snapStructure: StructureSnapshot = {
        measureTimeSigs: prev.measureTimeSigs,
        measureBpms: prev.measureBpms,
        measureBpmTransitions: prev.measureBpmTransitions,
        measureVols: prev.measureVols,
        measureVolTransitions: prev.measureVolTransitions,
        songSections: prev.songSections,
        songMarkers: prev.songMarkers || [],
      };
      
      const nextStructureHistory = [...prev.songStructureHistory, snapStructure];
      if (nextStructureHistory.length > 10) nextStructureHistory.shift();

      return {
        tracksRedoHistory: [],
        songStructureRedoHistory: [],
        tracksHistory: nextTracksHistory,
        songStructureHistory: nextStructureHistory,
      };
    });
  },

  handleUndo: () => {
    const state = get();
    if (state.tracksHistory.length === 0) return;

    set((prev) => {
      const currentTracks = prev.tracks;
      const currentStructure: StructureSnapshot = {
        measureTimeSigs: prev.measureTimeSigs,
        measureBpms: prev.measureBpms,
        measureBpmTransitions: prev.measureBpmTransitions,
        measureVols: prev.measureVols,
        measureVolTransitions: prev.measureVolTransitions,
        songSections: prev.songSections,
        songMarkers: prev.songMarkers || [],
      };

      const nextTracksHistory = [...prev.tracksHistory];
      const previousTracksState = nextTracksHistory.pop();

      const nextStructureHistory = [...prev.songStructureHistory];
      const previousStructureState = nextStructureHistory.pop();

      const updates: Partial<SequencerStore> = {
        tracksRedoHistory: [...prev.tracksRedoHistory, currentTracks],
        songStructureRedoHistory: [...prev.songStructureRedoHistory, currentStructure],
        tracksHistory: nextTracksHistory,
        songStructureHistory: nextStructureHistory,
      };

      if (previousTracksState) updates.tracks = previousTracksState;
      
      if (previousStructureState) {
        updates.measureTimeSigs = previousStructureState.measureTimeSigs;
        updates.measureBpms = previousStructureState.measureBpms;
        updates.measureBpmTransitions = previousStructureState.measureBpmTransitions;
        if (previousStructureState.measureVols) updates.measureVols = previousStructureState.measureVols;
        if (previousStructureState.measureVolTransitions) updates.measureVolTransitions = previousStructureState.measureVolTransitions;
        if (previousStructureState.songSections) updates.songSections = previousStructureState.songSections;
        if (previousStructureState.songMarkers) updates.songMarkers = previousStructureState.songMarkers;
      }

      return updates;
    });
  },

  handleRedo: () => {
    const state = get();
    if (state.tracksRedoHistory.length === 0) return;

    set((prev) => {
      const currentTracks = prev.tracks;
      const currentStructure: StructureSnapshot = {
        measureTimeSigs: prev.measureTimeSigs,
        measureBpms: prev.measureBpms,
        measureBpmTransitions: prev.measureBpmTransitions,
        measureVols: prev.measureVols,
        measureVolTransitions: prev.measureVolTransitions,
        songSections: prev.songSections,
        songMarkers: prev.songMarkers || [],
      };

      const nextTracksRedoHistory = [...prev.tracksRedoHistory];
      const nextTracksState = nextTracksRedoHistory.pop();

      const nextStructureRedoHistory = [...prev.songStructureRedoHistory];
      const nextStructureState = nextStructureRedoHistory.pop();

      const updates: Partial<SequencerStore> = {
        tracksHistory: [...prev.tracksHistory, currentTracks],
        songStructureHistory: [...prev.songStructureHistory, currentStructure],
        tracksRedoHistory: nextTracksRedoHistory,
        songStructureRedoHistory: nextStructureRedoHistory,
      };

      if (nextTracksState) updates.tracks = nextTracksState;

      if (nextStructureState) {
        updates.measureTimeSigs = nextStructureState.measureTimeSigs;
        updates.measureBpms = nextStructureState.measureBpms;
        updates.measureBpmTransitions = nextStructureState.measureBpmTransitions;
        if (nextStructureState.measureVols) updates.measureVols = nextStructureState.measureVols;
        if (nextStructureState.measureVolTransitions) updates.measureVolTransitions = nextStructureState.measureVolTransitions;
        if (nextStructureState.songSections) updates.songSections = nextStructureState.songSections;
        if (nextStructureState.songMarkers) updates.songMarkers = nextStructureState.songMarkers;
      }

      return updates;
    });
  },

  clearHistory: () => set({ tracksHistory: [], tracksRedoHistory: [], songStructureHistory: [], songStructureRedoHistory: [] })
});

// ---------------------------------------------------------
// 5. CLIPBOARD SLICE
// ---------------------------------------------------------
export interface ClipboardSlice {
  copiedPattern: Pattern | null;
  copiedSection: any | null;

  setCopiedPattern: (pattern: Pattern | null) => void;
  setCopiedSection: (section: any | null) => void;
  handleCopyPattern: (pattern: Pattern) => void;
  handleCopySongSection: (section: SongSection) => void;
  handlePasteSongSection: (destStartMeasure: number) => void;
}

const createClipboardSlice: StateCreator<SequencerStore, [], [], ClipboardSlice> = (set, get) => ({
  copiedPattern: null,
  copiedSection: null,

  setCopiedPattern: (pattern) => set({ copiedPattern: pattern }),
  setCopiedSection: (section) => set({ copiedSection: section }),

  handleCopyPattern: (pattern) => {
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    const clone = JSON.parse(JSON.stringify(pattern));
    set({ copiedPattern: clone });
  },

  handleCopySongSection: (section) => {
    const state = get();
    const length = section.endMeasure - section.startMeasure + 1;
    const assignments: { [trackId: number]: (number | null)[] } = {};

    state.tracks.forEach(t => {
      const arr: (number | null)[] = [];
      for (let m = section.startMeasure; m <= section.endMeasure; m++) {
        const assignedPattern = t.patterns.find(p => p.measureAssignments[m]);
        arr.push(assignedPattern ? assignedPattern.id : null);
      }
      assignments[t.id] = arr;
    });

    const childSections = state.songSections.filter(s => 
      s.id !== section.id && 
      s.startMeasure >= section.startMeasure && 
      s.endMeasure <= section.endMeasure
    ).map(s => ({
      ...s,
      relativeStart: s.startMeasure - section.startMeasure,
      relativeEnd: s.endMeasure - section.startMeasure
    }));

    const data = {
      length,
      name: section.name,
      color: section.color || '#27ae60',
      repeatCount: section.repeatCount || 1,
      assignments,
      childSections
    };
    set({ copiedSection: data });
  },

  handlePasteSongSection: (destStartMeasure) => {
    const state = get();
    if (!state.copiedSection) return;
    
    state.pushUndoState();
    const copied = state.copiedSection;
    const len = copied.length;
    const end = destStartMeasure + len - 1;

    set((prev) => {
      const updates: Partial<SequencerStore> = {};
      
      if (end >= prev.totalMeasures) {
        updates.totalMeasures = end + 1;
      }

      updates.tracks = prev.tracks.map(t => {
        const copiedArr = copied.assignments[t.id];
        if (!copiedArr) return t;

        const nextPatterns = t.patterns.map(p => {
          const assign = [...p.measureAssignments];
          while (assign.length <= end) assign.push(false);
          
          for (let i = 0; i < len; i++) {
            const mIdx = destStartMeasure + i;
            assign[mIdx] = p.id === copiedArr[i];
          }
          return { ...p, measureAssignments: assign };
        });
        return { ...t, patterns: nextPatterns };
      });
      
      if (copied.childSections) {
        let newSongSections = prev.songSections ? [...prev.songSections] : [];
        copied.childSections.forEach((child: any) => {
          newSongSections.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: child.name,
            startMeasure: destStartMeasure + child.relativeStart,
            endMeasure: destStartMeasure + child.relativeEnd,
            color: child.color,
            repeatCount: child.repeatCount,
            level: child.level
          });
        });
        updates.songSections = newSongSections;
      }

      return updates;
    });
    
    // Create the section object in the store
    const stateAfterPasting = get();
    stateAfterPasting.handleCreateSongSection(copied.name, destStartMeasure, end, copied.color, copied.repeatCount, copied.level);
  }
});

export interface EcoConfig {
  disableFx: boolean;
  disableEq: boolean;
  disableAnimations: boolean;
}

export interface ProjectSettingsSlice {
  letras: string;
  metadata: PresetMetadata;
  isLeftHanded: boolean;
  lang: Language;
  vocalCalibrationLatencyMs: number;
  isEcoMode: boolean;
  ecoConfig: EcoConfig;
  editingTrackId: number | null;
  vocalTransposeSteps: number;
  isTracksCollapsed: boolean;

  setLetras: (letras: string) => void;
  setMetadata: (metadata: PresetMetadata) => void;
  setIsLeftHanded: (val: boolean) => void;
  setLang: (lang: Language) => void;
  setVocalCalibrationLatencyMs: (val: number) => void;
  handleExtractLyrics: () => void;
  toggleEcoMode: () => void;
  toggleEcoOption: (key: keyof EcoConfig) => void;
  setEditingTrackId: (id: number | null) => void;
  setVocalTransposeSteps: (steps: number) => void;
  incrementVocalTransposeSteps: () => void;
  decrementVocalTransposeSteps: () => void;
  toggleTracksCollapsed: () => void;
}

const detectEcoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('o-girador-eco-mode');
  if (saved !== null) {
    return saved === 'true';
  }
  const cores = navigator.hardwareConcurrency;
  const isLowEndCPU = cores !== undefined && cores <= 4;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  return isLowEndCPU || isMobile;
};

const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => ({
  letras: '',
  metadata: { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] },
  isLeftHanded: false, 
  lang: 'pt',
  vocalCalibrationLatencyMs: parseInt(localStorage.getItem('oGirador_vocal_calibration_latency') || '0', 10),
  isEcoMode: detectEcoMode(),
  ecoConfig: {
    disableFx: detectEcoMode(),
    disableEq: detectEcoMode(),
    disableAnimations: detectEcoMode()
  },
  editingTrackId: null,
  vocalTransposeSteps: 0,
  isTracksCollapsed: true,

  setLetras: (letras) => set({ letras }),
  setMetadata: (metadata) => set({ metadata }),
  setIsLeftHanded: (val) => set({ isLeftHanded: val }),
  setLang: (lang) => set({ lang }),
  setVocalCalibrationLatencyMs: (val) => {
    localStorage.setItem('oGirador_vocal_calibration_latency', String(val));
    set({ vocalCalibrationLatencyMs: val });
  },
  toggleEcoMode: () => set((state) => {
    const next = !state.isEcoMode;
    localStorage.setItem('o-girador-eco-mode', String(next));
    return { 
      isEcoMode: next,
      ecoConfig: {
        disableFx: next,
        disableEq: next,
        disableAnimations: next
      }
    };
  }),
  toggleTracksCollapsed: () => set((state) => ({ isTracksCollapsed: !state.isTracksCollapsed })),
  toggleEcoOption: (key) => set((state) => {
    const nextConfig = {
      ...state.ecoConfig,
      [key]: !state.ecoConfig[key]
    };
    const allTrue = nextConfig.disableFx && nextConfig.disableEq && nextConfig.disableAnimations;
    const allFalse = !nextConfig.disableFx && !nextConfig.disableEq && !nextConfig.disableAnimations;
    
    let nextEcoMode = state.isEcoMode;
    if (allTrue) nextEcoMode = true;
    if (allFalse) nextEcoMode = false;
    
    localStorage.setItem('o-girador-eco-mode', String(nextEcoMode));
    
    return {
      ecoConfig: nextConfig,
      isEcoMode: nextEcoMode
    };
  }),
  setEditingTrackId: (id) => set((state) => {
    if (id === null) return { editingTrackId: null };
    const track = state.tracks.find(t => t.id === id);
    if (track && track.linkedToTrackId && !track.isLinkFolder) {
      const parentBus = state.tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
      if (parentBus) {
        return { editingTrackId: parentBus.id };
      }
    }
    return { editingTrackId: id };
  }),
  setVocalTransposeSteps: (steps) => set({ vocalTransposeSteps: Math.max(-12, Math.min(12, steps)) }),
  incrementVocalTransposeSteps: () => set((state) => ({ vocalTransposeSteps: Math.min(12, state.vocalTransposeSteps + 1) })),
  decrementVocalTransposeSteps: () => set((state) => ({ vocalTransposeSteps: Math.max(-12, state.vocalTransposeSteps - 1) })),

  
  handleExtractLyrics: () => {
    const state = get();
    const voiceTracks = state.tracks.filter((t) => instrumentsConfig[t.instrumentIdx]?.type === 'voice');
    const htmlArr: string[] = [];

    voiceTracks.forEach((t) => {
      t.patterns.forEach(p => {
        let trackStr = '';
        for (let i = 0; i < p.steps; i++) {
          if (p.activeSteps[i] !== 0 && p.lyrics && p.lyrics[i]) {
            const rawLyric = p.lyrics[i];
            const hasSpace = rawLyric.endsWith(' ');
            const syl = rawLyric.replace(/-$/, '').trim();
            if (syl) {
              trackStr += syl + (hasSpace ? ' ' : '');
            }
          }
        }
        if (trackStr) {
          htmlArr.push(trackStr.trim());
        }
      });
    });

    set({ letras: htmlArr.join('\n\n') });
  }
});

// ---------------------------------------------------------
// STORE PRINCIPAL EXPORTÉ
// ---------------------------------------------------------
export type SequencerStore = TrackSlice & StructureSlice & PlaybackSlice & HistorySlice & ClipboardSlice & ProjectSettingsSlice;

export const useSequencerStore = create<SequencerStore>((...a) => ({
  ...createTrackSlice(...a),
  ...createStructureSlice(...a),
  ...createPlaybackSlice(...a),
  ...createHistorySlice(...a),
  ...createClipboardSlice(...a),
  ...createProjectSettingsSlice(...a),
}));

export const getEffectiveMuteState = (tracks: TrackGroup[], trackId: number): boolean => {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return true;

  const hasAnySolo = tracks.some(t => t.isSolo);

  // Checks recursively if any parent (via busId or linkedToTrackId) is soloed
  const isAnyParentSolo = (currentTrack: TrackGroup): boolean => {
    let current: TrackGroup | undefined = currentTrack;
    const visited = new Set<number>();
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      
      const parentId = current.busId || current.linkedToTrackId;
      if (!parentId) break;
      
      const parent = tracks.find(t => String(t.id) === String(parentId));
      if (parent) {
        if (parent.isSolo) return true;
        current = parent;
      } else {
        break;
      }
    }
    return false;
  };

  // Checks recursively if any child descendant is soloed
  const isAnyDescendantSolo = (currentTrack: TrackGroup): boolean => {
    const visited = new Set<number>();
    const check = (node: TrackGroup): boolean => {
      if (visited.has(node.id)) return false;
      visited.add(node.id);
      
      const children = tracks.filter(t => 
        (t.busId && String(t.busId) === String(node.id)) || 
        (t.linkedToTrackId && String(t.linkedToTrackId) === String(node.id))
      );
      
      for (const child of children) {
        if (child.isSolo) return true;
        if (check(child)) return true;
      }
      return false;
    };
    return check(currentTrack);
  };

  // Checks recursively if any parent is muted
  const isAnyParentMuted = (currentTrack: TrackGroup): boolean => {
    let current: TrackGroup | undefined = currentTrack;
    const visited = new Set<number>();
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      
      const parentId = current.busId || current.linkedToTrackId;
      if (!parentId) break;
      
      const parent = tracks.find(t => String(t.id) === String(parentId));
      if (parent) {
        if (parent.isMute) return true;
        current = parent;
      } else {
        break;
      }
    }
    return false;
  };

  // 1. Recursive Solo check
  let isAllowedToPlayBySolo = true;
  if (hasAnySolo) {
    const isSelfSolo = track.isSolo === true;
    isAllowedToPlayBySolo = isSelfSolo || isAnyParentSolo(track) || isAnyDescendantSolo(track);
  }

  // 1.5. Dynamic CPU Overload Muting (Hysteresis-based throttling)
  // If CPU overload is active, mute redundant instruments while leaving at least one of each type playing.
  const isCPUSurcharged = usePerformanceStore.getState().isCPUSurcharged;
  if (isCPUSurcharged && !track.isBusFolder) {
    const instId = instrumentsConfig[track.instrumentIdx]?.id;
    if (instId) {
      const sameInstTracks = tracks.filter(t => 
        !t.isBusFolder && 
        instrumentsConfig[t.instrumentIdx]?.id === instId
      );
      if (sameInstTracks.length > 1) {
        sameInstTracks.sort((a, b) => a.id - b.id);
        if (sameInstTracks[0].id !== track.id) {
          return true; // Auto-mute redundant track for CPU protection
        }
      }
    }
  }

  // 2. Recursive Mute check
  const isSelfMuted = track.isMute === true;
  const isParentMuted = isAnyParentMuted(track);

  return !isAllowedToPlayBySolo || isSelfMuted || isParentMuted;
};
