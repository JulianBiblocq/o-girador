/**
 * O Girador - Melodic Note Selector Popover Component
 * 
 * Provides an interactive mini piano keyboard and octave selector
 * to input notes cleanly without manual typing.
 */

import React from 'react';

interface MelodicNoteSelectorProps {
  currentValue: string; // e.g. "C4", "A#3", or ""
  onSelect: (note: string) => void;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MelodicNoteSelector: React.FC<MelodicNoteSelectorProps> = ({
  currentValue,
  onSelect,
  onClose,
  lang,
}) => {
  // Parse note and octave
  let activeNote = '';
  let activeOctave = '4';

  if (currentValue) {
    const match = currentValue.match(/^([A-G]#?)([0-9])$/i);
    if (match) {
      activeNote = match[1].toUpperCase();
      activeOctave = match[2];
    }
  }

  const handleNoteClick = (note: string) => {
    onSelect(`${note}${activeOctave}`);
  };

  const handleOctaveClick = (octave: string) => {
    if (activeNote) {
      onSelect(`${activeNote}${octave}`);
    } else {
      onSelect(`C${octave}`); // default to C if no note selected yet
    }
  };

  const isBlackKey = (note: string) => note.includes('#');

  return (
    <div className="absolute z-[999] bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] p-3 flex flex-col gap-2.5 w-60 select-none font-sans">
      <div className="flex justify-between items-center border-b border-[#1a1a1a]/20 pb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          🎹 {lang === 'fr' ? 'Sélecteur de Note' : 'Seletor de Nota'}
        </span>
        <button
          onClick={onClose}
          className="text-xs font-bold hover:opacity-75 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Mini Piano Roll Keyboard */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase opacity-65">
          {lang === 'fr' ? 'Clavier' : 'Teclado'}
        </span>
        <div className="relative flex bg-[#1a1a1a] p-1 border border-[#1a1a1a]/30 h-20 w-full rounded">
          {NOTES.map((note) => {
            const isBlack = isBlackKey(note);
            const isActive = activeNote === note;
            
            if (isBlack) {
              // Black key rendering
              // Find offset index for positioning black keys between white keys
              const whiteIndex = NOTES.filter((n, idx) => idx < NOTES.indexOf(note) && !isBlackKey(n)).length;
              const leftOffset = whiteIndex * 31 - 10;
              
              return (
                <button
                  key={note}
                  onClick={() => handleNoteClick(note)}
                  style={{ left: `${leftOffset}px` }}
                  className={`absolute top-1 z-10 w-5 h-12 border border-[#1a1a1a] cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-red-700 text-white' 
                      : 'bg-black text-[#666] hover:bg-zinc-800'
                  }`}
                  title={note}
                >
                  <span className="absolute bottom-1 left-0 right-0 text-[7px] text-center font-bold">
                    {note}
                  </span>
                </button>
              );
            } else {
              // White key rendering
              return (
                <button
                  key={note}
                  onClick={() => handleNoteClick(note)}
                  className={`w-8 h-18 border-r last:border-r-0 border-[#1a1a1a]/30 cursor-pointer flex items-end justify-center pb-1 transition-colors ${
                    isActive 
                      ? 'bg-red-700 text-white border-red-800' 
                      : 'bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <span className="text-[8px] font-bold">
                    {note}
                  </span>
                </button>
              );
            }
          })}
        </div>
      </div>

      {/* Octave Selection */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase opacity-65">
          {lang === 'fr' ? 'Octave' : 'Oitava'}
        </span>
        <div className="flex gap-1">
          {['3', '4', '5'].map((oct) => (
            <button
              key={oct}
              onClick={() => handleOctaveClick(oct)}
              className={`flex-1 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
                activeOctave === oct
                  ? 'bg-[#1a1a1a] text-[#fdfaf2]'
                  : 'bg-[#fdfaf2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
              }`}
            >
              {oct}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 border-t border-[#1a1a1a]/20 pt-2 mt-0.5">
        <button
          onClick={() => onSelect('')}
          className="flex-1 py-1 text-[10px] font-bold cordel-border-sm bg-[#8b2a1a] text-white hover:opacity-90 cursor-pointer text-center"
        >
          🔇 {lang === 'fr' ? 'Silence' : 'Silêncio'}
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1 text-[10px] font-bold cordel-border-sm bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 cursor-pointer text-center"
        >
          {lang === 'fr' ? 'OK' : 'OK'}
        </button>
      </div>
    </div>
  );
};
