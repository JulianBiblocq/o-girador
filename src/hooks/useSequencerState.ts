/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TrackGroup, TimeSignature, SongSection, Pattern, PresetMetadata, Language } from '../types';
import { instrumentsConfig, getVisualStrokeSymbol, getMaxTicks } from '../data';
import { audioEngine } from './useAudioSync';

export function useSequencerState() {
  const [tracks, setTracks] = useState<TrackGroup[]>([]);
  const [bpm, setBpm] = useState<number>(83);
  const [totalMeasures, setTotalMeasures] = useState<number>(8);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');

  const [measureTimeSigs, setMeasureTimeSigs] = useState<TimeSignature[]>(() => Array(8).fill('4/4'));
  const [measureBpms, setMeasureBpms] = useState<number[]>(() => Array(8).fill(83));
  const [measureBpmTransitions, setMeasureBpmTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const [measureVols, setMeasureVols] = useState<number[]>(() => Array(8).fill(100));
  const [measureVolTransitions, setMeasureVolTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [measureSignals, setMeasureSignals] = useState<(string | null)[]>(() => Array(8).fill(null));

  const [loopStartMeasure, setLoopStartMeasure] = useState<number | null>(null);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number | null>(null);
  const [isLoopRegionActive, setIsLoopRegionActive] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Letras, metadata, settings
  const [letras, setLetras] = useState<string>('');
  const [metadata, setMetadata] = useState<PresetMetadata>({ toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] });
  const activeVariationsRef = useRef<Record<number, (string | number)[]>>({});
  const [isLeftHanded, setIsLeftHanded] = useState<boolean>(() => localStorage.getItem('o_girador_left_handed') === 'true');
  const [lang, setLang] = useState<Language>('pt');
  const [copiedPattern, setCopiedPattern] = useState<Pattern | null>(null);
  const [copiedSection, setCopiedSection] = useState<any>(null);

  const [activeAoVivoTrackId, setActiveAoVivoTrackId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('o_girador_left_handed', String(isLeftHanded));
  }, [isLeftHanded]);

  // History states
  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const [tracksRedoHistory, setTracksRedoHistory] = useState<TrackGroup[][]>([]);
  
  const [songStructureHistory, setSongStructureHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);
  const [songStructureRedoHistory, setSongStructureRedoHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);

  // Refs for audio scheduler and safe access
  const tracksRef = useRef<TrackGroup[]>([]);
  const totalMeasuresRef = useRef<number>(8);
  const measureTimeSigsRef = useRef<TimeSignature[]>([]);
  const measureBpmsRef = useRef<number[]>([]);
  const measureBpmTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const measureVolsRef = useRef<number[]>([]);
  const measureVolTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const songSectionsRef = useRef<SongSection[]>([]);
  const measureSignalsRef = useRef<(string | null)[]>([]);

  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);
  const isLoopRegionActiveRef = useRef<boolean>(true);
  const isLoopingRef = useRef<boolean>(true);

  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const tracksRedoHistoryRef = useRef<TrackGroup[][]>([]);
  const songStructureHistoryRef = useRef<any[]>([]);
  const songStructureRedoHistoryRef = useRef<any[]>([]);

  // Keep refs in sync
  useEffect(() => {
    tracksRef.current = tracks;
    totalMeasuresRef.current = totalMeasures;
    measureTimeSigsRef.current = measureTimeSigs;
    measureBpmsRef.current = measureBpms;
    measureBpmTransitionsRef.current = measureBpmTransitions;
    measureVolsRef.current = measureVols;
    measureVolTransitionsRef.current = measureVolTransitions;
    songSectionsRef.current = songSections;
    measureSignalsRef.current = measureSignals;
    loopStartRef.current = loopStartMeasure;
    loopEndRef.current = loopEndMeasure;
    isLoopRegionActiveRef.current = isLoopRegionActive;
    isLoopingRef.current = isLooping;
    tracksHistoryRef.current = tracksHistory;
    tracksRedoHistoryRef.current = tracksRedoHistory;
    songStructureHistoryRef.current = songStructureHistory;
    songStructureRedoHistoryRef.current = songStructureRedoHistory;
  }, [
    tracks,
    totalMeasures,
    measureTimeSigs,
    measureBpms,
    measureBpmTransitions,
    measureVols,
    measureVolTransitions,
    songSections,
    measureSignals,
    loopStartMeasure,
    loopEndMeasure,
    isLoopRegionActive,
    isLooping,
    activeVariationsRef,
    tracksHistory,
    tracksRedoHistory,
    songStructureHistory,
    songStructureRedoHistory
  ]);

  // Adjust measure arrays length when totalMeasures changes
  useEffect(() => {
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(timeSig);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpms(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(bpm);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVols(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(100);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureSignals(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(null);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });
  }, [totalMeasures, timeSig, bpm]);

  // Enforce Apito is always the last track in the list
  useEffect(() => {
    const apitoIdx = tracks.findIndex((t) => instrumentsConfig[t.instrumentIdx]?.id === 'apito');
    if (apitoIdx > -1 && apitoIdx !== tracks.length - 1) {
      const newTracks = [...tracks];
      const apitoTrack = newTracks.splice(apitoIdx, 1)[0];
      newTracks.push(apitoTrack);
      setTracks(newTracks);
    }
  }, [tracks]);


  const pushUndoState = (customTracksState?: TrackGroup[]) => {
    setTracksRedoHistory([]);
    setSongStructureRedoHistory([]);

    const stateToSave = customTracksState ? customTracksState : tracksRef.current;
    setTracksHistory(prev => {
      const cloned = JSON.parse(JSON.stringify(stateToSave));
      const next = [...prev, cloned];
      if (next.length > 10) return next.slice(-10);
      return next;
    });

    setSongStructureHistory(prev => {
      const cloned = {
        measureTimeSigs: [...measureTimeSigsRef.current],
        measureBpms: [...measureBpmsRef.current],
        measureBpmTransitions: [...measureBpmTransitionsRef.current],
        measureVols: [...measureVolsRef.current],
        measureVolTransitions: [...measureVolTransitionsRef.current],
        songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
      };
      const next = [...prev, cloned];
      if (next.length > 10) return next.slice(-10);
      return next;
    });
  };

  const handleUndo = () => {
    if (tracksHistoryRef.current.length === 0) return;

    const currentTracksCloned = JSON.parse(JSON.stringify(tracksRef.current));
    setTracksRedoHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureRedoHistory(prev => [...prev, currentStructureCloned]);

    setTracksHistory(prev => {
      const nextHistory = [...prev];
      const previousState = nextHistory.pop();
      if (previousState) {
        setTracks(previousState);
      }
      return nextHistory;
    });

    if (songStructureHistoryRef.current.length > 0) {
      setSongStructureHistory(prev => {
        const nextHistory = [...prev];
        const previousState = nextHistory.pop();
        if (previousState) {
          setMeasureTimeSigs(previousState.measureTimeSigs);
          setMeasureBpms(previousState.measureBpms);
          setMeasureBpmTransitions(previousState.measureBpmTransitions);
          if (previousState.measureVols) setMeasureVols(previousState.measureVols);
          if (previousState.measureVolTransitions) setMeasureVolTransitions(previousState.measureVolTransitions);
          if (previousState.songSections) setSongSections(previousState.songSections);
        }
        return nextHistory;
      });
    }
  };

  const handleRedo = () => {
    if (tracksRedoHistoryRef.current.length === 0) return;

    const currentTracksCloned = JSON.parse(JSON.stringify(tracksRef.current));
    setTracksHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureHistory(prev => [...prev, currentStructureCloned]);

    setTracksRedoHistory(prev => {
      const nextHistory = [...prev];
      const nextState = nextHistory.pop();
      if (nextState) {
        setTracks(nextState);
      }
      return nextHistory;
    });

    if (songStructureRedoHistoryRef.current.length > 0) {
      setSongStructureRedoHistory(prev => {
        const nextHistory = [...prev];
        const nextState = nextHistory.pop();
        if (nextState) {
          setMeasureTimeSigs(nextState.measureTimeSigs);
          setMeasureBpms(nextState.measureBpms);
          setMeasureBpmTransitions(nextState.measureBpmTransitions);
          if (nextState.measureVols) setMeasureVols(nextState.measureVols);
          if (nextState.measureVolTransitions) setMeasureVolTransitions(nextState.measureVolTransitions);
          if (nextState.songSections) setSongSections(nextState.songSections);
        }
        return nextHistory;
      });
    }
  };

  const clearHistory = () => {
    setTracksHistory([]);
    setTracksRedoHistory([]);
    setSongStructureHistory([]);
    setSongStructureRedoHistory([]);
  };

  // Dynamic layout radial positioning offsets
  const updateRadii = (list: TrackGroup[]) => {
    const visibleList = list.filter(t => {
      const inst = instrumentsConfig[t.instrumentIdx];
      return !t.isHidden && inst?.id !== 'apito';
    });
    if (visibleList.length === 0) return;
    const minRadius = 180;
    const maxRadius = 495;

    if (visibleList.length === 1) {
      visibleList[0].radius = (minRadius + maxRadius) / 2;
    } else {
      const gap = (maxRadius - minRadius) / (visibleList.length - 1);
      visibleList.forEach((t, idx) => {
        t.radius = minRadius + idx * gap;
      });
    }
  };

  const handleTrackMoveUp = (id: number) => {
    pushUndoState();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx > 0) {
      const copy = [...tracks];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      updateRadii(copy);
      setTracks(copy);
    }
  };

  const handleTrackMoveDown = (id: number) => {
    pushUndoState();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx > -1 && idx < tracks.length - 1) {
      const copy = [...tracks];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      updateRadii(copy);
      setTracks(copy);
    }
  };

  const handleTrackInstrumentIdxChange = (id: number, targetInstIdx: number) => {
    pushUndoState();
    const updated = tracks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          instrumentIdx: targetInstIdx,
        };
      }
      return t;
    });
    setTracks(updated);
  };

  const handleTrackMuteToggle = (id: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isMute: !t.isMute } : t)));
  };

  const handleTrackSoloToggle = (id: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isSolo: !t.isSolo } : t)));
  };

  const handleTrackHideToggle = (id: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, isHidden: !t.isHidden } : t)));
  };

  const handleTrackDelete = (id: number) => {
    pushUndoState();
    setTracks(prev => {
      const remaining = prev.filter((t) => t.id !== id);
      updateRadii(remaining);
      return remaining;
    });
  };

  const handleTrackVolumeChange = (id: number, val: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, volumeVal: val } : t)));
  };

  const handleTrackReverbChange = (id: number, val: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, reverbVal: val } : t)));
  };

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyVols[idx] = val;
                });
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
    }));
  };

  const handleTrackStepDecayChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyDecays[idx] = val;
                });
              } else {
                copyDecays[stepIdx] = val;
              }
              return { ...p, decays: copyDecays };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackStepMicrotimingChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
              if (Array.isArray(stepIdx)) {
                stepIdx.forEach(idx => {
                  copyMicros[idx] = val;
                });
              } else {
                copyMicros[stepIdx] = val;
              }
              return { ...p, microtimings: copyMicros };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleVariationStepVolumeChange = (trackId: number, patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId && p.variations) {
              return {
                ...p,
                variations: p.variations.map(v => {
                  if (v.id === variationId) {
                    const copyVols = [...(v.volumes || Array(p.steps).fill(80))];
                    if (Array.isArray(stepIdx)) {
                      stepIdx.forEach(idx => copyVols[idx] = val);
                    } else {
                      copyVols[stepIdx] = val;
                    }
                    return { ...v, volumes: copyVols };
                  }
                  return v;
                })
              };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleVariationStepDecayChange = (trackId: number, patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId && p.variations) {
              return {
                ...p,
                variations: p.variations.map(v => {
                  if (v.id === variationId) {
                    const copyDecays = [...(v.decays || Array(p.steps).fill(100))];
                    if (Array.isArray(stepIdx)) {
                      stepIdx.forEach(idx => copyDecays[idx] = val);
                    } else {
                      copyDecays[stepIdx] = val;
                    }
                    return { ...v, decays: copyDecays };
                  }
                  return v;
                })
              };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleVariationStepMicrotimingChange = (trackId: number, patternId: number, variationId: string, stepIdx: number | number[], val: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId && p.variations) {
              return {
                ...p,
                variations: p.variations.map(v => {
                  if (v.id === variationId) {
                    const copyMicros = [...(v.microtimings || Array(p.steps).fill(0))];
                    if (Array.isArray(stepIdx)) {
                      stepIdx.forEach(idx => copyMicros[idx] = val);
                    } else {
                      copyMicros[stepIdx] = val;
                    }
                    return { ...v, microtimings: copyMicros };
                  }
                  return v;
                })
              };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleResetTrackMicrotimings = (trackId: number, patternId: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              return { ...p, microtimings: Array(p.steps).fill(0) };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  const handleTrackPanChange = (id: number, val: number) => {
    setTracks(prev => prev.map((t) => (t.id === id ? { ...t, panVal: val } : t)));
  };

  const handleTrackStepsChange = (trackId: number, patternId: number, targetSteps: number) => {
    pushUndoState();
    setTracks(prev =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextPatterns = t.patterns.map(p => {
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
          });
          return { ...t, patterns: nextPatterns };
        }
        return t;
      })
    );
  };

  const handleTimelinePatternAssign = (trackId: number, patternId: number | null, measureIdx: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          const assign = [...p.measureAssignments];
          assign[measureIdx] = p.id === patternId;
          return { ...p, measureAssignments: assign };
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleTimelinePatternVariationToggle = (trackId: number, patternId: number, measureIdx: number, val: boolean) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const currentAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : Array(totalMeasures).fill(false);
            currentAllow[measureIdx] = val;
            return { ...p, measureAllowVariations: currentAllow };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleMeasureTimeSigChange = (measureIdx: number, val: TimeSignature) => {
    pushUndoState();
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureBpmChange = (measureIdx: number, val: number) => {
    pushUndoState();
    setMeasureBpms(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp') => {
    pushUndoState();
    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureVolChange = (measureIdx: number, val: number) => {
    pushUndoState();
    setMeasureVols(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleMeasureVolTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp') => {
    pushUndoState();
    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      arr[measureIdx] = val;
      return arr;
    });
  };

  const handleTotalMeasuresChange = (val: number) => {
    pushUndoState();
    setTotalMeasures(val);
  };

  const handleDeleteMeasure = (measureIdx: number) => {
    pushUndoState();
    if (totalMeasures <= 1) return;
    setTotalMeasures(prev => prev - 1);
    setMeasureTimeSigs(prev => prev.filter((_, idx) => idx !== measureIdx));
    setMeasureBpms(prev => prev.filter((_, idx) => idx !== measureIdx));
    setMeasureBpmTransitions(prev => prev.filter((_, idx) => idx !== measureIdx));
    setMeasureVols(prev => prev.filter((_, idx) => idx !== measureIdx));
    setMeasureVolTransitions(prev => prev.filter((_, idx) => idx !== measureIdx));
    setMeasureSignals(prev => prev.filter((_, idx) => idx !== measureIdx));
    setTracks(prev => prev.map(t => ({
      ...t,
      patterns: t.patterns.map(p => ({
        ...p,
        measureAssignments: p.measureAssignments.filter((_, idx) => idx !== measureIdx)
      }))
    })));
  };

  const handleInsertMeasure = (measureIdx: number) => {
    pushUndoState();
    setTotalMeasures(prev => prev + 1);
    const refSig = measureTimeSigs[measureIdx] || timeSig;
    const refBpm = measureBpms[measureIdx] || bpm;
    const refVol = measureVols[measureIdx] !== undefined ? measureVols[measureIdx] : 100;

    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, refSig);
      return arr;
    });
    setMeasureBpms(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, refBpm);
      return arr;
    });
    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, 'immediate');
      return arr;
    });
    setMeasureVols(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, refVol);
      return arr;
    });
    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, 'immediate');
      return arr;
    });
    setMeasureSignals(prev => {
      const arr = [...prev];
      arr.splice(measureIdx + 1, 0, null);
      return arr;
    });
    setTracks(prev => prev.map(t => ({
      ...t,
      patterns: t.patterns.map(p => {
        const arr = [...p.measureAssignments];
        arr.splice(measureIdx + 1, 0, false);
        return { ...p, measureAssignments: arr };
      })
    })));
  };

  const handleSetLoopStart = (measureIdx: number) => {
    pushUndoState();
    setLoopStartMeasure(measureIdx);
    setIsLoopRegionActive(true);
    if (loopEndMeasure !== null && measureIdx > loopEndMeasure) {
      setLoopEndMeasure(measureIdx);
    }
  };

  const handleSetLoopEnd = (measureIdx: number) => {
    pushUndoState();
    setLoopEndMeasure(measureIdx);
    setIsLoopRegionActive(true);
    if (loopStartMeasure !== null && measureIdx < loopStartMeasure) {
      setLoopStartMeasure(measureIdx);
    }
  };

  const handleClearLoop = () => {
    setLoopStartMeasure(null);
    setLoopEndMeasure(null);
    setIsLoopRegionActive(false);
  };

  const handleCopyPattern = (pattern: Pattern) => {
    const clone = JSON.parse(JSON.stringify(pattern));
    setCopiedPattern(clone);
  };

  const handlePastePattern = (trackId: number) => {
    if (!copiedPattern) return;
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const firstP = t.patterns[0];
        const pasted: Pattern = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: `${copiedPattern.name} (Cópia)`,
          steps: firstP.steps,
          activeSteps: [...copiedPattern.activeSteps],
          lyrics: [...copiedPattern.lyrics],
          notes: [...copiedPattern.notes],
          measureAssignments: Array(totalMeasures).fill(false),
          volumes: copiedPattern.volumes ? [...copiedPattern.volumes] : Array(firstP.steps).fill(80),
          decays: copiedPattern.decays ? [...copiedPattern.decays] : Array(firstP.steps).fill(100),
          microtimings: copiedPattern.microtimings ? [...copiedPattern.microtimings] : Array(firstP.steps).fill(0),
        };
        while (pasted.activeSteps.length < firstP.steps) pasted.activeSteps.push(0);
        while (pasted.lyrics.length < firstP.steps) pasted.lyrics.push('');
        while (pasted.notes.length < firstP.steps) pasted.notes.push('');
        if (pasted.volumes) while (pasted.volumes.length < firstP.steps) pasted.volumes.push(80);
        if (pasted.decays) while (pasted.decays.length < firstP.steps) pasted.decays.push(100);
        if (pasted.microtimings) while (pasted.microtimings.length < firstP.steps) pasted.microtimings.push(0);

        pasted.activeSteps.length = firstP.steps;
        pasted.lyrics.length = firstP.steps;
        pasted.notes.length = firstP.steps;
        if (pasted.volumes) pasted.volumes.length = firstP.steps;
        if (pasted.decays) pasted.decays.length = firstP.steps;
        if (pasted.microtimings) pasted.microtimings.length = firstP.steps;

        return {
          ...t,
          patterns: [...t.patterns, pasted],
          selectedPatternId: pasted.id
        };
      }
      return t;
    }));
  };

  const handleLoadLibraryPattern = (trackId: number, targetPatternId: number, libPattern: any) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === targetPatternId) {
            const nextActiveSteps = [...libPattern.steps];
            while (nextActiveSteps.length < p.steps) nextActiveSteps.push(0);
            nextActiveSteps.length = p.steps;
            
            let nextVolumes = undefined;
            if (libPattern.volumes) {
              nextVolumes = [...libPattern.volumes];
              while (nextVolumes.length < p.steps) nextVolumes.push(80);
              nextVolumes.length = p.steps;
            }
            let nextDecays = undefined;
            if (libPattern.decays) {
              nextDecays = [...libPattern.decays];
              while (nextDecays.length < p.steps) nextDecays.push(100);
              nextDecays.length = p.steps;
            }
            let nextMicrotimings = undefined;
            if (libPattern.microtimings) {
              nextMicrotimings = [...libPattern.microtimings];
              while (nextMicrotimings.length < p.steps) nextMicrotimings.push(0);
              nextMicrotimings.length = p.steps;
            }

            return {
              ...p,
              activeSteps: nextActiveSteps,
              variations: JSON.parse(JSON.stringify(libPattern.variations || [])),
              ...(nextVolumes && { volumes: nextVolumes }),
              ...(nextDecays && { decays: nextDecays }),
              ...(nextMicrotimings && { microtimings: nextMicrotimings })
            };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleCreateSongSection = (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => {
    const newSection: SongSection = {
      id: Date.now().toString(),
      name,
      startMeasure: start,
      endMeasure: end,
      color: color || '#27ae60',
      repeatCount: repeatCount || 1,
      level: level || 0,
    };
    
    setSongSections(prev => {
      const next = [...prev, newSection];
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return next;
    });
  };

  const handleUpdateSongSection = (id: string, name: string, start: number, end: number, color?: string, level?: number) => {
    setSongSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name, startMeasure: start, endMeasure: end, color, level: level || 0 } : s);
      next.sort((a, b) => a.startMeasure - b.startMeasure);
      return next;
    });
  };

  const handleUpdateSectionRepeat = (id: string, count: number) => {
    setSongSections(prev => prev.map(s => s.id === id ? { ...s, repeatCount: count } : s));
  };

  const handleDeleteSongSection = (id: string) => {
    setSongSections(prev => prev.filter(s => s.id !== id));
  };

  const handleCopySongSection = (section: SongSection) => {
    const length = section.endMeasure - section.startMeasure + 1;
    const assignments: { [trackId: number]: (number | null)[] } = {};

    tracks.forEach(t => {
      const arr: (number | null)[] = [];
      for (let m = section.startMeasure; m <= section.endMeasure; m++) {
        const assignedPattern = t.patterns.find(p => p.measureAssignments[m]);
        arr.push(assignedPattern ? assignedPattern.id : null);
      }
      assignments[t.id] = arr;
    });

    const data = {
      length,
      name: section.name,
      color: section.color || '#27ae60',
      repeatCount: section.repeatCount || 1,
      assignments,
    };
    setCopiedSection(data);
  };

  const handlePasteSongSection = (destStartMeasure: number) => {
    if (!copiedSection) return;
    pushUndoState();

    const len = copiedSection.length;
    const end = destStartMeasure + len - 1;

    if (end >= totalMeasures) {
      setTotalMeasures(end + 1);
    }

    setTracks(prev => prev.map(t => {
      const copiedArr = copiedSection.assignments[t.id];
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
    }));

    handleCreateSongSection(copiedSection.name, destStartMeasure, end, copiedSection.color, copiedSection.repeatCount, copiedSection.level);
  };

  const handleStepValueSelectAndToggle = (
    trackId: number,
    patternId: number,
    stepIdx: number,
    newState: string | number,
    optLyric?: string,
    optNote?: string
  ) => {
    pushUndoState();
    setTracks(tracks.map((t) => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const arrSteps = [...p.activeSteps];
            arrSteps[stepIdx] = newState;
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];

            if (optLyric !== undefined) arrLyrics[stepIdx] = optLyric;
            if (optNote !== undefined) arrNotes[stepIdx] = optNote;

            return {
              ...p,
              activeSteps: arrSteps,
              lyrics: arrLyrics,
              notes: arrNotes,
            };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceTypeToggle = (trackId: number, patternId: number, stepIdx: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            if (copySteps[stepIdx] === 0) return p;
            copySteps[stepIdx] = copySteps[stepIdx] === 'P' ? 'C' : 'P';
            return { ...p, activeSteps: copySteps };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceSylChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const activePattern = tracks.find(t => t.id === trackId)?.patterns.find(p => p.id === patternId);
    const prevVal = activePattern?.lyrics?.[stepIdx] || '';
    if (prevVal === '' && val !== '') {
      pushUndoState();
    }
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
            arrLyrics[stepIdx] = val;
            if (val.trim() !== '') {
              if (copySteps[stepIdx] === 0) {
                copySteps[stepIdx] = 'C';
                if (!arrNotes[stepIdx]) arrNotes[stepIdx] = 'C4';
              }
            } else {
              copySteps[stepIdx] = 0;
            }
            return { ...p, activeSteps: copySteps, lyrics: arrLyrics, notes: arrNotes };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceNoteChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const activePattern = tracks.find(t => t.id === trackId)?.patterns.find(p => p.id === patternId);
    const prevVal = activePattern?.notes?.[stepIdx] || '';
    if (prevVal === '' && val !== '') {
      pushUndoState();
    }
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
            arrNotes[stepIdx] = val;
            return { ...p, notes: arrNotes };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVoiceNoteBlur = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    pushUndoState();
    const trimmed = val.trim();
    if (trimmed.length === 1 || (trimmed.length === 2 && (trimmed.includes('#') || trimmed.includes('b')))) {
      if (/^[a-gA-G][#b]?$/.test(trimmed)) {
        const completedNote = trimmed.toUpperCase() + '4';
        setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
            const nextPatterns = t.patterns.map(p => {
              if (p.id === patternId) {
                const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
                arrNotes[stepIdx] = completedNote;
                return { ...p, notes: arrNotes };
              }
              return p;
            });
            return { ...t, patterns: nextPatterns };
          }
          return t;
        }));
      }
    }
  };

  const handleExtractLyrics = () => {
    const voiceTracks = tracks.filter((t) => instrumentsConfig[t.instrumentIdx].type === 'voice');
    const htmlArr: string[] = [];

    voiceTracks.forEach((t) => {
      t.patterns.forEach(p => {
        let trackStr = '';
        for (let i = 0; i < p.steps; i++) {
          if (p.activeSteps[i] !== 0 && p.lyrics[i]) {
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

    setLetras(htmlArr.join('\n\n'));
  };

  const handleTrackStepValueChange = (
    trackId: number,
    patternId: number,
    stepIdx: number | number[],
    val: string | string[],
    lyrics?: string[],
    notes?: string[]
  ) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const inst = instrumentsConfig[t.instrumentIdx];

        const parseVal = (v: string): string | number => {
          if (!v) return 0;
          const cleanChar = v.slice(-1);
          let parsed: string | number = 0;
          if (v === '0') {
            parsed = 0;
          } else if (inst.colors[v] !== undefined && v !== 'text') {
            parsed = v;
          } else if (cleanChar && cleanChar.trim() !== '') {
            if (inst.type === 'gongue') {
              if (['G', 'g', 'A', 'a'].includes(cleanChar)) parsed = cleanChar;
              else if (['x', 'X'].includes(cleanChar)) parsed = 'X';
              else if (['b', 'B', 't'].includes(cleanChar)) parsed = 'B';
            } else if (inst.id === 'mineiro') {
              if (['P', 'p', 'T', 't'].includes(cleanChar)) parsed = cleanChar;
              else if (['l', 'L'].includes(cleanChar)) parsed = 'L';
              else if (['b', 'B'].includes(cleanChar)) parsed = 'B';
            } else if (inst.id === 'caixa') {
              const lowerChar = cleanChar.toLowerCase();
              if (cleanChar === 'r') parsed = 'r';
              else if (cleanChar === 'R') parsed = 'R';
              else if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'f') parsed = 'F';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
              const lowerChar = cleanChar.toLowerCase();
              if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'i') parsed = 'I';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E', 'q', 'Q'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'tarol') {
              const lowerChar = cleanChar.toLowerCase();
              if (cleanChar === 'r') parsed = 'r';
              else if (cleanChar === 'R') parsed = 'R';
              else if (lowerChar === 'x') parsed = 'X';
              else if (lowerChar === 'f') parsed = 'F';
              else if (lowerChar === 'c') parsed = 'C';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E', 'q', 'Q'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'agbe') {
              const lowerChar = cleanChar.toLowerCase();
              if (lowerChar === 's') parsed = 'S';
              else if (lowerChar === 'v') parsed = 'V';
              else if (['b', 't'].includes(lowerChar)) parsed = 'B';
              else if (['d', 'D', 'e', 'E'].includes(cleanChar)) {
                parsed = cleanChar;
              }
            } else if (inst.id === 'apito') {
              if (['W', 'w'].includes(cleanChar)) parsed = cleanChar;
            } else {
              if (['D', 'E', 'd', 'e'].includes(cleanChar)) parsed = cleanChar;
            }
          }
          return getVisualStrokeSymbol(parsed, isLeftHanded, inst.id);
        };

        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const copySteps = [...p.activeSteps];
            const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            const arrNotes = [...(p.notes || Array(p.steps).fill(''))];

            if (Array.isArray(stepIdx)) {
              stepIdx.forEach((idx, i) => {
                const currentVal = Array.isArray(val) ? val[i] : val;
                copySteps[idx] = parseVal(currentVal);
                if (lyrics && lyrics[i] !== undefined) {
                  arrLyrics[idx] = lyrics[i];
                }
                if (notes && notes[i] !== undefined) {
                  arrNotes[idx] = notes[i];
                }
              });
            } else {
              const currentVal = Array.isArray(val) ? val[0] : val;
              copySteps[stepIdx] = parseVal(currentVal);
              if (lyrics && lyrics[0] !== undefined) {
                arrLyrics[stepIdx] = lyrics[0];
              }
              if (notes && notes[0] !== undefined) {
                arrNotes[stepIdx] = notes[0];
              }
            }
            return {
              ...p,
              activeSteps: copySteps,
              lyrics: arrLyrics,
              notes: arrNotes
            };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleTrackStepKeyDown = (
    trackId: number,
    patternId: number,
    stepIdx: number,
    key: string,
    currentWord: string,
    targetInputEl: HTMLInputElement
  ) => {
    const cardGrid = targetInputEl.closest('.step-boxes');
    if (!cardGrid) return;
    const inputs = Array.from(cardGrid.querySelectorAll('input'));
    const indexInGrid = inputs.indexOf(targetInputEl);

    if (key === 'Backspace' && currentWord === '' && indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
    } else if ((key === 'ArrowRight' || key === 'Tab' || key === 'Enter') && indexInGrid < inputs.length - 1) {
      const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
      nextEl.focus();
      nextEl.select();
    } else if (key === 'ArrowLeft' && indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
    } else if (
      ['d', 'D', 'p', 'P', 't', 'T', 'g', 'G', 'a', 'A', 'r', 'R', 'e', 'E', 'x', 'X', 'f', 'F', 'i', 'I', 's', 'S', 'c', 'C', 'w', 'W'].includes(key) &&
      indexInGrid < inputs.length - 1
    ) {
      setTimeout(() => {
        const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
        nextEl.focus();
        nextEl.select();
      }, 10);
    }
  };

  const handlePatternNameChange = (trackId: number, patternId: number, name: string) => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id === patternId) {
              return { ...p, name: name.trim() };
            }
            return p;
          }),
        };
      });
    });
  };

  const handleReorderPatterns = (trackId: number, patternId: number, direction: 'up' | 'down') => {
    pushUndoState();
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        if (t.id !== trackId) return t;
        const index = t.patterns.findIndex((p) => p.id === patternId);
        if (index === -1) return t;
        const newPatterns = [...t.patterns];
        if (direction === 'up' && index > 0) {
          const temp = newPatterns[index];
          newPatterns[index] = newPatterns[index - 1];
          newPatterns[index - 1] = temp;
        } else if (direction === 'down' && index < newPatterns.length - 1) {
          const temp = newPatterns[index];
          newPatterns[index] = newPatterns[index + 1];
          newPatterns[index + 1] = temp;
        }
        return {
          ...t,
          patterns: newPatterns
        };
      });
    });
  };

  const handleClear = () => {
    pushUndoState();
    setTracks([]);
    setLetras('');
    setMeasureSignals([]);
    setMetadata({ toada: '', nacao: '', compositor: '', ritmo: '', youtubeUrl: '', partitionImage: undefined, rhythmSignals: [] });
  };

  const handleAddPatternVariation = (trackId: number, patternId: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const currentVariations = p.variations || [];
            const newVar = {
              id: Date.now().toString(),
              name: `Var ${currentVariations.length + 1}`,
              steps: [...p.activeSteps],
              probability: 30
            };
            return { ...p, variations: [...currentVariations, newVar] };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleUpdatePatternVariationProbability = (trackId: number, patternId: number, variationId: string, probability: number) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId && p.variations) {
            const nextVariations = p.variations.map(v => 
              v.id === variationId ? { ...v, probability: Math.max(0, Math.min(100, probability)) } : v
            );
            return { ...p, variations: nextVariations };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleTogglePatternVariationFirstTimeOnly = (trackId: number, patternId: number, variationId: string, val: boolean) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId && p.variations) {
            const nextVariations = p.variations.map(v => 
              v.id === variationId ? { ...v, playFirstTimeOnly: val } : v
            );
            return { ...p, variations: nextVariations };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleVariationStepValueChange = (trackId: number, patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId && p.variations) {
            const nextVariations = p.variations.map(v => {
              if (v.id === variationId) {
                const nextSteps = [...v.steps];
                if (Array.isArray(stepIdx)) {
                  stepIdx.forEach((idx, i) => {
                    nextSteps[idx] = Array.isArray(val) ? val[i] : val;
                  });
                } else {
                  nextSteps[stepIdx] = val as string;
                }
                return { ...v, steps: nextSteps };
              }
              return v;
            });
            return { ...p, variations: nextVariations };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleDeletePatternVariation = (trackId: number, patternId: number, variationId: string) => {
    pushUndoState();
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId && p.variations) {
            const nextVariations = p.variations.filter(v => v.id !== variationId);
            return { ...p, variations: nextVariations };
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    }));
  };

  const handleAddTrackInstrument = (instIdx: number, currentMeasure: number = 0) => {
    pushUndoState();
    audioEngine.loadInstrumentSamples(instIdx).catch(console.error);
    const inst = instrumentsConfig[instIdx];
    const newTrack: TrackGroup = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      instrumentIdx: instIdx,
      patterns: [
        {
          id: Date.now() + Math.floor(Math.random() * 1000) + 1,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: Array(16).fill(0),
          lyrics: Array(16).fill(''),
          notes: Array(16).fill(''),
          measureAssignments: Array(totalMeasures).fill(false),
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
        },
      ],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100,
      selectedPatternId: 0,
      reverbVal: 0,
      panVal: 0,
    };
    newTrack.selectedPatternId = newTrack.patterns[0].id;
    newTrack.patterns[0].measureAssignments[currentMeasure] = true;

    setTracks(prev => {
      const next = [...prev, newTrack];
      updateRadii(next);
      return next;
    });
  };

  const handleGlobalBpmChange = (val: number | ((prev: number) => number)) => {
    setBpm((prevBpm) => {
      const nextBpm = typeof val === 'function' ? val(prevBpm) : val;
      const diff = nextBpm - prevBpm;
      if (diff !== 0) {
        setMeasureBpms(prev => prev.map(m => Math.max(40, Math.min(240, m + diff))));
      }
      return nextBpm;
    });
  };

  return {
    // States & Setters
    tracks, setTracks, tracksRef,
    bpm, 
    setBpm: handleGlobalBpmChange as React.Dispatch<React.SetStateAction<number>>,
    setBpmRaw: setBpm as React.Dispatch<React.SetStateAction<number>>,
    totalMeasures, setTotalMeasures, totalMeasuresRef,
    timeSig, setTimeSig,
    measureTimeSigs, setMeasureTimeSigs, measureTimeSigsRef,
    measureBpms, setMeasureBpms, measureBpmsRef,
    measureBpmTransitions, setMeasureBpmTransitions, measureBpmTransitionsRef,
    measureVols, setMeasureVols, measureVolsRef,
    measureVolTransitions, setMeasureVolTransitions, measureVolTransitionsRef,
    songSections, setSongSections, songSectionsRef,
    measureSignals, setMeasureSignals, measureSignalsRef,
    loopStartMeasure, setLoopStartMeasure, loopStartRef,
    loopEndMeasure, setLoopEndMeasure, loopEndRef,
    isLoopRegionActive, setIsLoopRegionActive, isLoopRegionActiveRef,
    isLooping, setIsLooping, isLoopingRef,
    letras, setLetras,
    metadata, setMetadata,
    isLeftHanded, setIsLeftHanded,
    lang, setLang,
    activeAoVivoTrackId, setActiveAoVivoTrackId,
    // History
    tracksHistory,
    tracksRedoHistory,
    pushUndoState,
    handleUndo,
    handleRedo,
    clearHistory,
    // Handlers
    handleTrackMoveUp,
    handleTrackMoveDown,
    handleTrackInstrumentIdxChange,
    handleTrackMuteToggle,
    handleTrackSoloToggle,
    handleTrackHideToggle,
    handleTrackDelete,
    handleTrackVolumeChange,
    handleTrackReverbChange,
    handleTrackStepVolumeChange,
    handleTrackStepDecayChange,
    handleTrackStepMicrotimingChange,
    handleVariationStepVolumeChange,
    handleVariationStepDecayChange,
    handleVariationStepMicrotimingChange,
    handleResetTrackMicrotimings,
    handleTrackPanChange,
    handleTrackStepsChange,
    handleTimelinePatternAssign,
    handleTimelinePatternVariationToggle,
    handleMeasureTimeSigChange,
    handleMeasureBpmChange,
    handleMeasureTransitionChange,
    handleMeasureVolChange,
    handleMeasureVolTransitionChange,
    handleTotalMeasuresChange,
    handleDeleteMeasure,
    handleInsertMeasure,
    handleSetLoopStart,
    handleSetLoopEnd,
    handleClearLoop,
    copiedPattern,
    handleCopyPattern,
    handlePastePattern,
    handleLoadLibraryPattern,
    handleCreateSongSection,
    handleUpdateSongSection,
    handleUpdateSectionRepeat,
    handleDeleteSongSection,
    handleCopySongSection,
    handlePasteSongSection,
    copiedSection,
    handleStepValueSelectAndToggle,
    handleVoiceTypeToggle,
    handleVoiceSylChange,
    handleVoiceNoteChange,
    handleVoiceNoteBlur,
    handleExtractLyrics,
    handleTrackStepValueChange,
    handleTrackStepKeyDown,
    handlePatternNameChange,
    handleReorderPatterns,
    handleClear,
    handleAddPatternVariation,
    handleUpdatePatternVariationProbability,
    handleTogglePatternVariationFirstTimeOnly,
    handleVariationStepValueChange,
    handleDeletePatternVariation,
    handleAddTrackInstrument,
    activeVariationsRef
  };
}
