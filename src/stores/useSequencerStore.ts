import { create, StateCreator } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { TrackGroup, TimeSignature, SongSection, Pattern, PresetMetadata, Language } from '../types';

// Nous aurons besoin d'instrumentsConfig pour extraire les paroles
import { instrumentsConfig } from '../data';

// ---------------------------------------------------------
// 1. TRACK SLICE
// ---------------------------------------------------------
export interface TrackSlice {
  tracks: TrackGroup[];
  activeAoVivoTrackId: number | null;
  
  // Actions (Squelette pour l'instant)
  setTracks: (tracks: TrackGroup[] | ((prev: TrackGroup[]) => TrackGroup[])) => void;
  setActiveAoVivoTrackId: (id: number | null) => void;
  handleReorderTracksDnd: (oldIndex: number, newIndex: number) => void;
  handleTrackInstrumentIdxChange: (id: number, targetInstIdx: number) => void;
  handleTrackMuteToggle: (id: number) => void;
  handleTrackSoloToggle: (id: number) => void;
  handleTrackHideToggle: (id: number) => void;
  handleTrackDelete: (id: number) => void;
  handleTrackVolumeChange: (id: number, val: number) => void;
  handleTrackReverbChange: (id: number, val: number) => void;
  handleTrackPanChange: (id: number, val: number) => void;
  handleTimelinePatternAssign: (trackId: number, patternId: number | null, measureIdx: number) => void;
  handleTimelinePatternVariationToggle: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  handleTrackStepsChange: (trackId: number, patternId: number, targetSteps: number) => void;
  handleTrackStepVolumeChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number) => void;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
}

const applyRadii = (list: TrackGroup[]): TrackGroup[] => {
  const visibleList = list.filter((t) => !t.isHidden && instrumentsConfig[t.instrumentIdx]?.id !== 'apito');
  const gap = visibleList.length > 1 ? (495 - 180) / (visibleList.length - 1) : 0;
  
  return list.map(t => {
    if (t.isHidden || instrumentsConfig[t.instrumentIdx]?.id === 'apito') return t;
    const visibleIdx = visibleList.findIndex(vt => vt.id === t.id);
    if (visibleIdx === -1) return t;
    const newRadius = visibleList.length === 1 ? (180 + 495) / 2 : 180 + visibleIdx * gap;
    if (t.radius !== newRadius) {
      return { ...t, radius: newRadius };
    }
    return t;
  });
};

const createTrackSlice: StateCreator<SequencerStore, [], [], TrackSlice> = (set, get) => ({
  tracks: [],
  activeAoVivoTrackId: null,
  setTracks: (updater) => set(state => ({ tracks: typeof updater === 'function' ? (updater as any)(state.tracks) : updater })),
  setActiveAoVivoTrackId: (id) => set({ activeAoVivoTrackId: id }),
  
  handleReorderTracksDnd: (oldIndex, newIndex) => {
    if (oldIndex === newIndex) return;
    get().pushUndoState();
    set((state) => {
      const newTracks = arrayMove(state.tracks, oldIndex, newIndex) as TrackGroup[];
      return { tracks: applyRadii(newTracks) };
    });
  },

  handleTrackInstrumentIdxChange: (id, targetInstIdx) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, instrumentIdx: targetInstIdx } : t)
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
      const remaining = state.tracks.filter((t) => t.id !== id);
      return { tracks: applyRadii(remaining) };
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
      tracks: state.tracks.map((t) => t.id === id ? { ...t, panVal: val } : t)
    }));
  },

  handleTimelinePatternAssign: (trackId, patternId, measureIdx) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
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
      })
    }));
  },

  handleTimelinePatternVariationToggle: (trackId, patternId, measureIdx, val) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
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
      })
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
      })
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
      })
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
      })
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
  
  setTotalMeasures: (val: number | ((prev: number) => number)) => void;
  setBpm: (bpm: number) => void;
  setTimeSig: (sig: TimeSignature) => void;
  setMeasureSignals: (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => void;
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
  setMeasureTimeSigs: (updater) => set(state => ({ measureTimeSigs: typeof updater === 'function' ? (updater as any)(state.measureTimeSigs) : updater })),
  measureBpms: Array(8).fill(83),
  measureBpmTransitions: Array(8).fill('immediate'),
  measureVols: Array(8).fill(100),
  measureVolTransitions: Array(8).fill('immediate'),
  measureSignals: Array(8).fill(null),
  songSections: [],
  songMarkers: [],

  setBpm: (bpm) => set({ bpm }),
  setTimeSig: (sig) => set({ timeSig: sig }),
  setTotalMeasures: (updater) => set(state => ({ totalMeasures: typeof updater === 'function' ? updater(state.totalMeasures) : updater })),
  
  setMeasureSignals: (updater) => set((state) => ({
    measureSignals: typeof updater === 'function' ? updater(state.measureSignals) : updater
  })),

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
        }))
      };
    });
  },

  handleMeasureTimeSigChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureTimeSigs];
      arr[idx] = val;
      return { measureTimeSigs: arr };
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
        }))
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
        }))
      };
    });
  }
});

// ---------------------------------------------------------
// 3. PLAYBACK SLICE
// ---------------------------------------------------------
export interface PlaybackSlice {
  currentMeasure: number;
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
}

const createPlaybackSlice: StateCreator<SequencerStore, [], [], PlaybackSlice> = (set, get) => ({
  currentMeasure: 0,
  loopStartMeasure: null,
  loopEndMeasure: null,
  isLoopRegionActive: true,
  isLooping: true,

  setCurrentMeasure: (updater) => set(state => ({ currentMeasure: typeof updater === 'function' ? updater(state.currentMeasure) : updater })),
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
      const clonedTracks = JSON.parse(JSON.stringify(tracksToSave));
      const nextTracksHistory = [...prev.tracksHistory, clonedTracks];
      if (nextTracksHistory.length > 10) nextTracksHistory.shift();

      const clonedStructure: StructureSnapshot = {
        measureTimeSigs: [...prev.measureTimeSigs],
        measureBpms: [...prev.measureBpms],
        measureBpmTransitions: [...prev.measureBpmTransitions],
        measureVols: [...prev.measureVols],
        measureVolTransitions: [...prev.measureVolTransitions],
        songSections: JSON.parse(JSON.stringify(prev.songSections)),
        songMarkers: prev.songMarkers ? JSON.parse(JSON.stringify(prev.songMarkers)) : [],
      };
      
      const nextStructureHistory = [...prev.songStructureHistory, clonedStructure];
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
      const currentTracksCloned = JSON.parse(JSON.stringify(prev.tracks));
      const currentStructureCloned: StructureSnapshot = {
        measureTimeSigs: [...prev.measureTimeSigs],
        measureBpms: [...prev.measureBpms],
        measureBpmTransitions: [...prev.measureBpmTransitions],
        measureVols: [...prev.measureVols],
        measureVolTransitions: [...prev.measureVolTransitions],
        songSections: JSON.parse(JSON.stringify(prev.songSections)),
        songMarkers: prev.songMarkers ? JSON.parse(JSON.stringify(prev.songMarkers)) : [],
      };

      const nextTracksHistory = [...prev.tracksHistory];
      const previousTracksState = nextTracksHistory.pop();

      const nextStructureHistory = [...prev.songStructureHistory];
      const previousStructureState = nextStructureHistory.pop();

      const updates: Partial<SequencerStore> = {
        tracksRedoHistory: [...prev.tracksRedoHistory, currentTracksCloned],
        songStructureRedoHistory: [...prev.songStructureRedoHistory, currentStructureCloned],
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
      const currentTracksCloned = JSON.parse(JSON.stringify(prev.tracks));
      const currentStructureCloned: StructureSnapshot = {
        measureTimeSigs: [...prev.measureTimeSigs],
        measureBpms: [...prev.measureBpms],
        measureBpmTransitions: [...prev.measureBpmTransitions],
        measureVols: [...prev.measureVols],
        measureVolTransitions: [...prev.measureVolTransitions],
        songSections: JSON.parse(JSON.stringify(prev.songSections)),
        songMarkers: prev.songMarkers ? JSON.parse(JSON.stringify(prev.songMarkers)) : [],
      };

      const nextTracksRedoHistory = [...prev.tracksRedoHistory];
      const nextTracksState = nextTracksRedoHistory.pop();

      const nextStructureRedoHistory = [...prev.songStructureRedoHistory];
      const nextStructureState = nextStructureRedoHistory.pop();

      const updates: Partial<SequencerStore> = {
        tracksHistory: [...prev.tracksHistory, currentTracksCloned],
        songStructureHistory: [...prev.songStructureHistory, currentStructureCloned],
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

// ---------------------------------------------------------
// 6. PROJECT SETTINGS SLICE
// ---------------------------------------------------------
export interface ProjectSettingsSlice {
  letras: string;
  metadata: PresetMetadata;
  isLeftHanded: boolean;
  lang: Language;

  setLetras: (letras: string) => void;
  setMetadata: (metadata: PresetMetadata) => void;
  setIsLeftHanded: (val: boolean) => void;
  setLang: (lang: Language) => void;
  handleExtractLyrics: () => void;
}

const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => ({
  letras: '',
  metadata: { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] },
  isLeftHanded: false, 
  lang: 'pt',

  setLetras: (letras) => set({ letras }),
  setMetadata: (metadata) => set({ metadata }),
  setIsLeftHanded: (val) => set({ isLeftHanded: val }),
  setLang: (lang) => set({ lang }),
  
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
