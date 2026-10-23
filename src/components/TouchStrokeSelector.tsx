
import React, { useRef, useState, useEffect } from 'react';
import { instrumentsConfig, getVisualStrokeSymbol } from '../data';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { getActiveStrokesForTrack } from '../hooks/useAudioSync';
import { useWindow } from '../contexts/WindowContext';
import { TouchSelectorState, TouchStrokeSelectorProps } from './touch-stroke/touchStrokeTypes';
import { getStrokeDescription } from './touch-stroke/getStrokeDescription';
import { useTouchStrokeGestures } from './touch-stroke/useTouchStrokeGestures';
import { TouchStrokeChoices } from './touch-stroke/TouchStrokeChoices';

export type { TouchSelectorState, TouchStrokeSelectorProps };

export const TouchStrokeSelector: React.FC<TouchStrokeSelectorProps> = React.memo(({
  selector, hoveredStroke, setHoveredStroke, onClose,
}) => {
  const { lang, isLeftHanded = false } = useSequencer();
  const currentWindow = useWindow();
  const [isSticky, setIsSticky] = useState<boolean>(selector.isStickyDefault || false);
  const stickyTimeRef = useRef<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const tracks = useSequencerStore(state => state.tracks);
  const forcedStrokes = useSequencerSettingsStore(state => state.forcedStrokes) || {};
  const track = tracks.find(t => t.id === selector.trackId);
  const activeStrokes = track ? getActiveStrokesForTrack(track, tracks) : [];

  useEffect(() => {
    if (isSticky) stickyTimeRef.current = Date.now();
  }, [isSticky]);

  const inst = instrumentsConfig.find(i => i.id === selector.instId);
  if (!inst) return null;

  const strokeDefs = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);
  const allChoices = ['0', ...strokeDefs.map(s => s.symbol)];
  const choicesToShow = allChoices.filter(stroke => {
    if (isExpanded || stroke === '0') return true;
    const forced = forcedStrokes[`${selector.trackId}:${stroke}`];
    const isActive = forced !== undefined ? forced : activeStrokes.some(s => s.toLowerCase() === stroke.toLowerCase());
    return isActive || String(selector.currentVal) === String(stroke);
  });

  useTouchStrokeGestures({
    selector, inst, lang, isLeftHanded, hoveredStroke, setHoveredStroke,
    isSticky, setIsSticky, stickyTimeRef, currentWindow, onClose,
  });

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
  const bubbleWidth = Math.min(270, screenWidth - 24);
  const idealX = (selector.x * 0.6) + (screenWidth * 0.4);
  const leftPos = Math.max(bubbleWidth / 2 + 12, Math.min(screenWidth - bubbleWidth / 2 - 12, idealX));
  const maxArrowOffset = bubbleWidth / 2 - 20;
  const arrowOffset = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, selector.x - leftPos));
  const isTooHigh = selector.y - 165 < 0;

  return (
    <div
      className="fixed z-50 flex flex-col items-center pointer-events-none"
      style={{
        left: `${leftPos}px`,
        top: `${selector.y}px`,
        transform: isTooHigh ? 'translate(-50%, 0) translateY(15px)' : 'translate(-50%, -100%) translateY(-15px)',
      }}
    >
      {isTooHigh && (
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[#1a1a1a]" style={{ marginBottom: '-2px', transform: `translateX(${arrowOffset}px)` }} />
      )}
      <div id="touch-stroke-selector-bubble" className="flex flex-col gap-1.5 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] pointer-events-auto select-none rounded-none items-center" style={{ width: `${bubbleWidth}px` }}>
        <span className="text-[10px] font-bold border-b border-[#1a1a1a]/25 pb-1 mb-1 text-center text-[#1a1a1a] uppercase tracking-wider font-cactus w-full">
          {hoveredStroke ? getStrokeDescription(selector.instId, inst.type, String(getVisualStrokeSymbol(hoveredStroke, isLeftHanded, inst.id)), lang) : (lang === 'fr' ? 'Glissez ou touchez un coup' : 'Arraste ou toque num golpe')}
        </span>
        <TouchStrokeChoices
          selector={selector} inst={inst} isLeftHanded={isLeftHanded} choicesToShow={choicesToShow}
          allChoices={allChoices} activeStrokes={activeStrokes} hoveredStroke={hoveredStroke}
          setHoveredStroke={setHoveredStroke} isExpanded={isExpanded} setIsExpanded={setIsExpanded}
          lang={lang} onClose={onClose}
        />
      </div>
      {!isTooHigh && (
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1a1a1a]" style={{ marginTop: '-2px', transform: `translateX(${arrowOffset}px)` }} />
      )}
    </div>
  );
});

TouchStrokeSelector.displayName = 'TouchStrokeSelector';
