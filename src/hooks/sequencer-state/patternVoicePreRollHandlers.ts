import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface VoicePreRollContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createPatternVoicePreRollHandlers(ctx: VoicePreRollContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleVoicePreRollSylChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const tracks = useSequencerStore.getState().tracks;
    const activePattern = tracks.find((t: TrackGroup) => t.id === trackId)?.patterns.find((p: Pattern) => p.id === patternId);
    if ((activePattern?.preRollLyrics?.[stepIdx] || '') === '' && val !== '') pushUndoState();

    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const copySteps = p.preRollActiveSteps ? [...p.preRollActiveSteps] : Array(16).fill(0);
          const arrLyrics = p.preRollLyrics ? [...p.preRollLyrics] : Array(16).fill('');
          const arrNotes = p.preRollNotes ? [...p.preRollNotes] : Array(16).fill('');
          const arrDecays = p.preRollDecays ? [...p.preRollDecays] : Array(16).fill(10);
          const arrVolumes = p.preRollVolumes ? [...p.preRollVolumes] : Array(16).fill(80);
          arrLyrics[stepIdx] = val;
          if (val !== '') {
            if (copySteps[stepIdx] === 0 || copySteps[stepIdx] === '0') {
              const instId = instrumentsConfig[t.instrumentIdx]?.id;
              copySteps[stepIdx] = instId === 'puxador' ? 'P' : 'C';
              if (!arrNotes[stepIdx]) arrNotes[stepIdx] = 'C4';
            }
            if (arrDecays[stepIdx] === 100 || !arrDecays[stepIdx]) arrDecays[stepIdx] = 10;
          } else {
            if (!arrNotes[stepIdx] || arrNotes[stepIdx].trim() === '') copySteps[stepIdx] = 0;
          }
          return { ...p, preRollActiveSteps: copySteps, preRollLyrics: arrLyrics, preRollNotes: arrNotes, preRollDecays: arrDecays, preRollVolumes: arrVolumes };
        })
      };
    }));
  };

  const handleVoicePreRollNoteChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const tracks = useSequencerStore.getState().tracks;
    const activePattern = tracks.find((t: TrackGroup) => t.id === trackId || String(t.id) === String(trackId))?.patterns.find((p: Pattern) => p.id === patternId || String(p.id) === String(patternId));
    if ((activePattern?.preRollNotes?.[stepIdx] || '') === '' && val !== '') pushUndoState();

    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId && String(t.id) !== String(trackId)) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId && String(p.id) !== String(patternId)) return p;
          const arrNotes = p.preRollNotes ? [...p.preRollNotes] : Array(16).fill('');
          const copySteps = p.preRollActiveSteps ? [...p.preRollActiveSteps] : Array(16).fill(0);
          arrNotes[stepIdx] = val;
          if (!val || val.trim() === '' || val === '0') {
            arrNotes[stepIdx] = '';
            if (!p.preRollLyrics?.[stepIdx] || p.preRollLyrics[stepIdx].trim() === '') copySteps[stepIdx] = 0;
          } else {
            const instId = instrumentsConfig[t.instrumentIdx]?.id;
            const vocalRole = (instId === 'coro' || String(t.id) === 'coro') ? 'C' : 'P';
            if (!copySteps[stepIdx] || copySteps[stepIdx] === 0 || copySteps[stepIdx] === '0' || copySteps[stepIdx] === (vocalRole === 'P' ? 'C' : 'P')) {
              copySteps[stepIdx] = vocalRole;
            }
          }
          return { ...p, preRollNotes: arrNotes, preRollActiveSteps: copySteps };
        })
      };
    }));
  };

  const handleVoicePreRollNoteBlur = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    pushUndoState();
    const trimmed = val.trim();
    if (trimmed.length === 1 || (trimmed.length === 2 && (trimmed.includes('#') || trimmed.includes('b')))) {
      if (/^[a-gA-G][#b]?$/.test(trimmed)) {
        const completedNote = trimmed.toUpperCase() + '4';
        setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
          if (t.id !== trackId && String(t.id) !== String(trackId)) return t;
          return {
            ...t,
            patterns: t.patterns.map((p: Pattern) => {
              if (p.id !== patternId && String(p.id) !== String(patternId)) return p;
              const arrNotes = p.preRollNotes ? [...p.preRollNotes] : Array(16).fill('');
              const copySteps = p.preRollActiveSteps ? [...p.preRollActiveSteps] : Array(16).fill(0);
              arrNotes[stepIdx] = completedNote;
              if (!copySteps[stepIdx] || copySteps[stepIdx] === 0 || copySteps[stepIdx] === '0') {
                const instId = instrumentsConfig[t.instrumentIdx]?.id;
                copySteps[stepIdx] = (instId === 'coro' || String(t.id) === 'coro') ? 'C' : 'P';
              }
              return { ...p, preRollNotes: arrNotes, preRollActiveSteps: copySteps };
            })
          };
        }));
      }
    }
  };

  return { handleVoicePreRollSylChange, handleVoicePreRollNoteChange, handleVoicePreRollNoteBlur };
}
