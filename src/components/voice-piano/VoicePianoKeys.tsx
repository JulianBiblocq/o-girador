/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WHITE_KEYS } from './voicePianoTypes';

interface VoicePianoKeysProps {
  activeNotes: Set<string>;
  onNoteDown: (note: string) => void;
  onNoteUp: (note: string) => void;
}

export const VoicePianoKeys: React.FC<VoicePianoKeysProps> = React.memo(({
  activeNotes,
  onNoteDown,
  onNoteUp,
}) => {
  return (
    <div className="relative flex-1 w-full min-w-0 h-[88px] sm:h-[96px] flex rounded-b-md overflow-hidden bg-[#1a1a1a] p-0.5 border-2 border-[#1a1a1a] shadow-inner select-none">
      {/* Touches blanches */}
      <div className="flex w-full h-full">
        {WHITE_KEYS.map((keyDef) => {
          const isNoteActive = activeNotes.has(keyDef.note);
          return (
            <button
              key={keyDef.note}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onNoteDown(keyDef.note); }}
              onPointerUp={() => onNoteUp(keyDef.note)}
              onPointerLeave={() => onNoteUp(keyDef.note)}
              onPointerCancel={() => onNoteUp(keyDef.note)}
              className={`relative flex-1 h-full border-r border-[#1a1a1a] last:border-r-0 rounded-b-[3px] flex flex-col justify-end items-center pb-1 transition-colors duration-75 cursor-pointer touch-none ${
                isNoteActive ? 'bg-[#e07a5f] text-white shadow-inner' : 'bg-[#fcf8ef] hover:bg-[#f5ebd7] text-[#1a1a1a]/70 active:bg-[#e07a5f] active:text-white'
              }`}
              title={keyDef.note}
            >
              {keyDef.isC ? (
                <span className="text-[9px] sm:text-[10px] font-black font-mono tracking-tighter opacity-90 pb-0.5">
                  {keyDef.note}
                </span>
              ) : (
                <span className="text-[7px] sm:text-[8px] font-mono opacity-30 pb-0.5 hidden sm:inline">
                  {keyDef.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Touches noires superposées */}
      {WHITE_KEYS.map((keyDef, idx) => {
        if (!keyDef.hasSharp || !keyDef.sharpNote) return null;
        const sharpNote = keyDef.sharpNote;
        const isSharpActive = activeNotes.has(sharpNote);
        const leftPercent = ((idx + 1) / 22) * 100;

        return (
          <button
            key={sharpNote}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onNoteDown(sharpNote); }}
            onPointerUp={() => onNoteUp(sharpNote)}
            onPointerLeave={() => onNoteUp(sharpNote)}
            onPointerCancel={() => onNoteUp(sharpNote)}
            style={{ left: `${leftPercent}%`, width: 'calc(100% / 22 * 0.65)', transform: 'translateX(-50%)' }}
            className={`absolute top-0 h-[58%] z-20 rounded-b-[2px] border border-[#2d2d2d] cursor-pointer touch-none transition-colors duration-75 flex items-end justify-center pb-1 ${
              isSharpActive ? 'bg-[#c25e38] text-white shadow-inner' : 'bg-[#1a1a1a] hover:bg-[#2c2c2c] active:bg-[#c25e38] shadow-md'
            }`}
            title={sharpNote}
          >
            <span className="text-[6px] font-mono text-white/40 hidden sm:inline leading-none">#</span>
          </button>
        );
      })}
    </div>
  );
});

VoicePianoKeys.displayName = 'VoicePianoKeys';
