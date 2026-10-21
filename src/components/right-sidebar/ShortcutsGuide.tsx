/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../../types';
import { instrumentsConfig, isDarkText } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as Tone from 'tone';
import { ShortcutsKeyboardTab } from './shortcuts/ShortcutsKeyboardTab';
import { ShortcutsStrokesPercussion } from './shortcuts/ShortcutsStrokesPercussion';
import { ShortcutsStrokesOther } from './shortcuts/ShortcutsStrokesOther';
import { ShortcutsGeneralInfo } from './shortcuts/ShortcutsGeneralInfo';

export interface ShortcutsGuideProps {
  lang: Language;
  t: (key: string) => string;
  activeStrokesByInstrument?: Record<string, string[]>;
}

export const ShortcutsGuide: React.FC<ShortcutsGuideProps> = ({ lang, t, activeStrokesByInstrument }) => {
  const [activeTab, setActiveTab] = useState<'strokes' | 'shortcuts'>('strokes');

  const isStrokeActiveForInstruments = (instIds: string[], strokeSymbols: string[]) => {
    if (!activeStrokesByInstrument) return true;
    return instIds.some(id => {
      const activeStrokes = activeStrokesByInstrument[id] || [];
      return strokeSymbols.some(sym => activeStrokes.includes(sym) || activeStrokes.includes(sym.toUpperCase()) || activeStrokes.includes(sym.toLowerCase()));
    });
  };

  const shouldShowSection = (instIds: string[]) => {
    if (!activeStrokesByInstrument) return true;
    return instIds.some(id => (activeStrokesByInstrument[id] || []).length > 0);
  };

  const playPreview = (instrumentIds: string[], strokeSymbol: string) => {
    try {
      if (!audioEngine) return;
      const tracks = useSequencerStore.getState().tracks;
      const matchingTrack = tracks.find(tr => {
        const inst = instrumentsConfig[tr.instrumentIdx];
        return inst && instrumentIds.includes(inst.id);
      });
      const targetId = matchingTrack ? matchingTrack.id : instrumentIds[0];
      audioEngine.playNote(targetId, strokeSymbol, Tone.now(), 1.0, 1.0);
    } catch (err) {
      console.error("Preview play failed:", err);
    }
  };

  const renderBadge = (instIds: string[], strokes: string[], display: string) => {
    const mainInst = instIds[0];
    const mainStroke = strokes[0];
    const inst = instrumentsConfig.find(i => i.id === mainInst);
    const bg = inst ? (inst.colors[mainStroke] || '#111') : '#111';
    const color = isDarkText(mainInst, mainStroke) ? '#1a1a1a' : '#f4ecd8';

    return (
      <span
        onClick={() => playPreview(instIds, mainStroke)}
        className="inline-flex items-center justify-center min-w-[44px] px-1 h-[18px] text-[9px] font-bold border-[1.5px] border-[#1a1a1a] cursor-pointer active:scale-95 transition-transform duration-100 select-none hover:opacity-90"
        style={{ backgroundColor: bg, color }}
      >
        {display}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-y-2 pr-1 flex-grow overflow-hidden min-h-0">
      <div className="flex items-center gap-1.5 p-1 bg-[#ece4d0] cordel-border-sm shrink-0 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('strokes')}
          className={`flex-1 py-1.5 px-2 rounded-xs font-cactus font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${activeTab === 'strokes' ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]' : 'bg-transparent text-[#1a1a1a] hover:bg-[#1a1a1a]/10'}`}
        >
          {t('legendTabStrokes')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shortcuts')}
          className={`flex-1 py-1.5 px-2 rounded-xs font-cactus font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${activeTab === 'shortcuts' ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]' : 'bg-transparent text-[#1a1a1a] hover:bg-[#1a1a1a]/10'}`}
        >
          {t('legendTabShortcuts')}
        </button>
      </div>

      {activeTab === 'shortcuts' ? (
        <ShortcutsKeyboardTab lang={lang} t={t} />
      ) : (
        <div className="flex flex-col gap-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
          <ShortcutsStrokesPercussion t={t} lang={lang} renderBadge={renderBadge} shouldShowSection={shouldShowSection} isStrokeActiveForInstruments={isStrokeActiveForInstruments} />
          <ShortcutsStrokesOther t={t} lang={lang} renderBadge={renderBadge} shouldShowSection={shouldShowSection} isStrokeActiveForInstruments={isStrokeActiveForInstruments} />
          <ShortcutsGeneralInfo t={t} lang={lang} />
        </div>
      )}
    </div>
  );
};

export default ShortcutsGuide;
