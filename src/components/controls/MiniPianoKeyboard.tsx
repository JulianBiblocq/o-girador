import React from 'react';
import { audioEngine } from '../../hooks/useAudioSync';

interface MiniPianoKeyboardProps {
  activeNote: string;
  activeOctave: string;
  onNoteClick: (note: string) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MiniPianoKeyboard: React.FC<MiniPianoKeyboardProps> = ({
  activeNote,
  activeOctave,
  onNoteClick,
}) => {
  const isBlackKey = (note: string) => note.includes('#');

  const triggerNote = (note: string) => {
    if (audioEngine) audioEngine.triggerVoicePitch(`${note}${activeOctave}`, 0.8);
  };

  const releaseNote = (note: string) => {
    if (audioEngine) audioEngine.releaseVoicePitch(`${note}${activeOctave}`);
  };

  return (
    <div className="relative flex bg-[#1a1a1a] p-1 border border-[#1a1a1a]/30 h-20 w-full rounded">
      {NOTES.map((note) => {
        const isBlack = isBlackKey(note);
        const isActive = activeNote === note;

        if (isBlack) {
          const whiteIndex = NOTES.filter((n, idx) => idx < NOTES.indexOf(note) && !isBlackKey(n)).length;
          const leftOffset = whiteIndex * 31 - 10;

          return (
            <button
              key={note}
              onMouseDown={(e) => { e.preventDefault(); triggerNote(note); }}
              onMouseUp={(e) => { e.preventDefault(); releaseNote(note); }}
              onMouseLeave={() => releaseNote(note)}
              onTouchStart={(e) => { e.preventDefault(); triggerNote(note); }}
              onTouchEnd={(e) => { e.preventDefault(); releaseNote(note); }}
              onTouchCancel={(e) => { e.preventDefault(); releaseNote(note); }}
              onClick={() => onNoteClick(note)}
              style={{ left: `${leftOffset}px` }}
              className={`absolute top-1 z-10 w-5 h-12 border border-[#1a1a1a] cursor-pointer transition-colors ${
                isActive ? 'bg-red-700 text-white' : 'bg-black text-[#666] hover:bg-zinc-800'
              }`}
              title={note}
            >
              <span className="absolute bottom-1 left-0 right-0 text-[7px] text-center font-bold">
                {note}
              </span>
            </button>
          );
        }

        return (
          <button
            key={note}
            onMouseDown={(e) => { e.preventDefault(); triggerNote(note); }}
            onMouseUp={(e) => { e.preventDefault(); releaseNote(note); }}
            onMouseLeave={() => releaseNote(note)}
            onTouchStart={(e) => { e.preventDefault(); triggerNote(note); }}
            onTouchEnd={(e) => { e.preventDefault(); releaseNote(note); }}
            onTouchCancel={(e) => { e.preventDefault(); releaseNote(note); }}
            onClick={() => onNoteClick(note)}
            className={`w-8 h-18 border-r last:border-r-0 border-[#1a1a1a]/30 cursor-pointer flex items-end justify-center pb-1 transition-colors ${
              isActive ? 'bg-red-700 text-white border-red-800' : 'bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span className="text-[8px] font-bold">{note}</span>
          </button>
        );
      })}
    </div>
  );
};
