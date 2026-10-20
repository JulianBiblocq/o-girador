/**
 * O Girador - Melodic Note Selector Popover Component
 * 
 * Provides an interactive mini piano keyboard and octave selector
 * to input notes cleanly without manual typing.
 */

import React from 'react';
import { audioEngine } from '../hooks/useAudioSync';
import { MiniPianoKeyboard } from './controls/MiniPianoKeyboard';

interface MelodicNoteSelectorProps {
  currentValue: string; // e.g. "C4", "A#3", or ""
  onSelect: (note: string) => void;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const MelodicNoteSelector: React.FC<MelodicNoteSelectorProps> = ({
  currentValue,
  onSelect,
  onClose,
  lang,
}) => {
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
    const targetNote = activeNote || 'C';
    if (audioEngine) {
      audioEngine.triggerVoicePitch(`${targetNote}${octave}`, 0.8);
      setTimeout(() => {
        audioEngine?.releaseVoicePitch(`${targetNote}${octave}`);
      }, 150);
    }
    if (activeNote) {
      onSelect(`${activeNote}${octave}`);
    } else {
      onSelect(`C${octave}`);
    }
  };

  return (
    <div className="absolute z-50 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] p-3 flex flex-col gap-2.5 w-60 select-none font-sans">
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

      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase opacity-65">
          {lang === 'fr' ? 'Clavier' : 'Teclado'}
        </span>
        <MiniPianoKeyboard
          activeNote={activeNote}
          activeOctave={activeOctave}
          onNoteClick={handleNoteClick}
        />
      </div>

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
          OK
        </button>
      </div>
    </div>
  );
};
