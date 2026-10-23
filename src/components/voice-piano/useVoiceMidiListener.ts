
import { useState, useEffect, useRef } from 'react';

export function useVoiceMidiListener() {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const activeNotesRef = useRef<Set<string>>(new Set());
  const midiHighlightTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const handleMidiKey = (e: CustomEvent<{ note: string; active?: boolean }>) => {
      const note = e.detail?.note;
      if (!note) return;
      const mappedNote = note.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');

      if (e.detail?.active === false) {
        const existing = midiHighlightTimersRef.current.get(mappedNote);
        if (existing) clearTimeout(existing);
        midiHighlightTimersRef.current.delete(mappedNote);
        setActiveNotes((prev) => { const next = new Set(prev); next.delete(mappedNote); return next; });
        return;
      }

      setActiveNotes((prev) => { const next = new Set(prev); next.add(mappedNote); return next; });
      const existing = midiHighlightTimersRef.current.get(mappedNote);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setActiveNotes((prev) => { const next = new Set(prev); next.delete(mappedNote); return next; });
        midiHighlightTimersRef.current.delete(mappedNote);
      }, 300);
      midiHighlightTimersRef.current.set(mappedNote, timer);
    };

    window.addEventListener('o-girador-voice-key-active' as any, handleMidiKey as any);
    return () => {
      window.removeEventListener('o-girador-voice-key-active' as any, handleMidiKey as any);
      midiHighlightTimersRef.current.forEach((t) => clearTimeout(t));
      midiHighlightTimersRef.current.clear();
    };
  }, []);

  return { activeNotes, setActiveNotes, activeNotesRef };
}
