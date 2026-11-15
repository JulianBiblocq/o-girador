import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { cleanVoiceSyllableForDisplay } from '../../utils/musicTheory';

export interface PatternVoiceStepContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
  setLetras: (v: string) => void;
}

export function createPatternVoiceStepHandlers(ctx: PatternVoiceStepContext) {
  const { pushUndoState, setTracks, setLetras } = ctx;

  const handleVoiceTypeToggle = (_trackId?: number, _patternId?: number, _stepIdx?: number) => {};

  const handleVoiceSylChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const tracks = useSequencerStore.getState().tracks;
    const activePattern = tracks.find((t: TrackGroup) => t.id === trackId)?.patterns.find((p: Pattern) => p.id === patternId);
    if ((activePattern?.lyrics?.[stepIdx] || '') === '' && val !== '') pushUndoState();

    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const copySteps = [...p.activeSteps];
          const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
          const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
          const arrDecays = p.decays ? [...p.decays] : Array(p.steps).fill(10);
          const trimmed = val.trim();
          if (trimmed === '0' || trimmed === '𝄽') {
            copySteps[stepIdx] = 0;
            arrLyrics[stepIdx] = '';
            arrNotes[stepIdx] = '';
          } else if (val !== '') {
            arrLyrics[stepIdx] = val;
            if (copySteps[stepIdx] === 0 || copySteps[stepIdx] === '0') {
              const instId = instrumentsConfig[t.instrumentIdx]?.id;
              copySteps[stepIdx] = instId === 'puxador' ? 'P' : 'C';
              if (!arrNotes[stepIdx]) arrNotes[stepIdx] = 'C4';
            }
            if (arrDecays[stepIdx] === 100 || !arrDecays[stepIdx]) arrDecays[stepIdx] = 10;
          } else {
            arrLyrics[stepIdx] = '';
            if (!arrNotes[stepIdx] || arrNotes[stepIdx].trim() === '') copySteps[stepIdx] = 0;
          }
          return { ...p, activeSteps: copySteps, lyrics: arrLyrics, notes: arrNotes, decays: arrDecays };
        })
      };
    }));
  };

  const handleVoiceNoteChange = (trackId: number, patternId: number, stepIdx: number, val: string) => {
    const tracks = useSequencerStore.getState().tracks;
    const activePattern = tracks.find((t: TrackGroup) => t.id === trackId || String(t.id) === String(trackId))?.patterns.find((p: Pattern) => p.id === patternId || String(p.id) === String(patternId));
    if ((activePattern?.notes?.[stepIdx] || '') === '' && val !== '') pushUndoState();

    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId && String(t.id) !== String(trackId)) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId && String(p.id) !== String(patternId)) return p;
          const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
          const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
          const copySteps = [...p.activeSteps];
          const trimmed = (val || '').trim();
          if (!trimmed || trimmed === '0' || trimmed === '𝄽') {
            arrNotes[stepIdx] = '';
            if (trimmed === '0' || trimmed === '𝄽') arrLyrics[stepIdx] = '';
            copySteps[stepIdx] = 0;
          } else {
            arrNotes[stepIdx] = val;
            const instId = instrumentsConfig[t.instrumentIdx]?.id;
            const vocalRole = (instId === 'coro' || String(t.id) === 'coro') ? 'C' : 'P';
            if (!copySteps[stepIdx] || copySteps[stepIdx] === 0 || copySteps[stepIdx] === '0' || copySteps[stepIdx] === (vocalRole === 'P' ? 'C' : 'P')) {
              copySteps[stepIdx] = vocalRole;
            }
          }
          return { ...p, activeSteps: copySteps, notes: arrNotes, lyrics: arrLyrics };
        })
      };
    }));
  };

  const handleVoiceNoteBlur = (trackId: number, patternId: number, stepIdx: number, val: string) => {
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
              const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
              arrNotes[stepIdx] = completedNote;
              return { ...p, notes: arrNotes };
            })
          };
        }));
      }
    }
  };

  const handleExtractLyrics = () => {
    const tracks = useSequencerStore.getState().tracks;
    const voiceTracks = tracks.filter((t: TrackGroup) => instrumentsConfig[t.instrumentIdx]?.type === 'voice');
    const htmlArr: string[] = [];
    voiceTracks.forEach((t: TrackGroup) => {
      t.patterns.forEach((p: Pattern) => {
        let trackStr = '';
        for (let i = 0; i < p.steps; i++) {
          if (p.activeSteps[i] !== 0 && p.activeSteps[i] !== '0' && p.lyrics?.[i]) {
            const rawLyric = p.lyrics[i];
            const hasSpace = rawLyric.endsWith(' ');
            const syl = cleanVoiceSyllableForDisplay(rawLyric);
            if (syl) trackStr += syl + (hasSpace ? ' ' : '');
            else if (hasSpace && trackStr && !trackStr.endsWith(' ')) trackStr += ' ';
          }
        }
        if (trackStr.trim()) htmlArr.push(trackStr.trim());
      });
    });
    setLetras(htmlArr.join('\n\n'));
  };

  return {
    handleVoiceTypeToggle,
    handleVoiceSylChange,
    handleVoiceNoteChange,
    handleVoiceNoteBlur,
    handleExtractLyrics,
  };
}
