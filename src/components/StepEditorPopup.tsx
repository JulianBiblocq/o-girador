/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTimelineEditStore } from '../stores/useTimelineEditStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { getActiveStrokesForTrack, audioEngine } from '../hooks/useAudioSync';
import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../data';

export const StepEditorPopup: React.FC = () => {
  const popupRef = useRef<HTMLDivElement>(null);
  const sequencer = useSequencer();
  
  const {
    activeStepKey,
    anchorRect,
    allowedStrokes,
    currentVal,
    trackId,
    patternId,
    measureIdx,
    stepIdx,
    closeEditor
  } = useTimelineEditStore();

  const tracks = useSequencerStore(state => state.tracks);
  const track = tracks.find(t => t.id === trackId);
  const inst = track ? instrumentsConfig[track.instrumentIdx] : null;
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded) || false;

  // Local UI states for expansion and lazy loading
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [loadingStroke, setLoadingStroke] = useState<string | null>(null);

  const forcedStrokes = useSequencerSettingsStore(state => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore(state => state.setStrokeForcedState);

  // Reset local states when active step changes
  useEffect(() => {
    setIsExpanded(false);
    setLoadingStroke(null);
  }, [activeStepKey]);

  // Support du clavier pour Escape, Silence et raccourcis de coups
  useEffect(() => {
    if (!activeStepKey || trackId === null || patternId === null || stepIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const key = e.key;

      if (key === 'Escape') {
        closeEditor();
        return;
      }

      if (key === '0' || key === 'Backspace' || key === 'Delete' || key === '-') {
        e.preventDefault();
        sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
        closeEditor();
        return;
      }

      const targetStroke = allowedStrokes.find(
        (s) => String(s).toLowerCase() === key.toLowerCase()
      );

      if (targetStroke) {
        e.preventDefault();
        handleSelectStroke(targetStroke);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStepKey, trackId, patternId, stepIdx, allowedStrokes, sequencer, closeEditor]);

  // Fermeture lors d'un clic à l'extérieur
  useEffect(() => {
    if (!activeStepKey) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closeEditor();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [activeStepKey, closeEditor]);

  if (!activeStepKey || !anchorRect || trackId === null || patternId === null || measureIdx === null || stepIdx === null) {
    return null;
  }

  // Calcul du positionnement de la popup (juste sous la cellule, centré ou calé à gauche)
  const top = anchorRect.bottom + window.scrollY + 6;
  const left = Math.max(10, Math.min(window.innerWidth - 180, anchorRect.left + window.scrollX));

  const activeStrokesForTrack = track ? getActiveStrokesForTrack(track, tracks) : [];

  // Filter strokes shown by default
  const choicesToShow = allowedStrokes.filter(stroke => {
    if (isExpanded) return true;
    const forced = forcedStrokes[`${trackId}:${stroke}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.includes(stroke);
    // Keep currently selected step value visible in clean mode
    return isActive || String(currentVal) === String(stroke);
  });

  const handleSelectStroke = async (stroke: string | number) => {
    if (stroke === 0 || stroke === '0') {
      sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
      closeEditor();
      return;
    }

    const strokeStr = String(stroke);
    const isLoaded = inst && audioEngine ? audioEngine.isStrokeLoaded(inst.id, strokeStr) : true;

    // Check if the stroke is currently active for the project
    const forced = forcedStrokes[`${trackId}:${strokeStr}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.includes(strokeStr);

    if (!isLoaded && inst && audioEngine) {
      setLoadingStroke(strokeStr);
      try {
        await audioEngine.loadStrokeSamples(inst.id, strokeStr);
        setStrokeForcedState(`${trackId}:${strokeStr}`, true);
      } catch (err) {
        console.error("Failed to load stroke sample:", err);
      } finally {
        setLoadingStroke(null);
      }
    } else if (!isActive) {
      // Force activation if already loaded but not currently active for the project
      setStrokeForcedState(`${trackId}:${strokeStr}`, true);
    }

    sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, strokeStr);
    
    if (!isActive) {
      // Auto-collapse (return to clean view) if the stroke was inactive
      setIsExpanded(false);
    } else {
      // Fully close the popup if selecting an already active stroke
      closeEditor();
    }
  };

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      className="fixed z-[999999] border-black border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] p-2 flex flex-col gap-1.5 w-[140px] font-cactus"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="text-[9px] font-bold text-center border-b border-black pb-1 uppercase tracking-wider text-black/60">
        Golpes / Coups
      </div>
      
      <div className="grid grid-cols-3 gap-1">
        {choicesToShow.map((stroke) => {
          const isSelected = String(currentVal) === String(stroke);
          const isLoaded = inst && audioEngine ? audioEngine.isStrokeLoaded(inst.id, String(stroke)) : true;
          const isStrokeLoading = loadingStroke === String(stroke);
          
          let bgColor = 'transparent';
          let textColor = '#000';
          
          if (inst) {
            const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
            bgColor = inst.colors[visualStroke as string] || '#111';
            textColor = inst.colors.text || '#fff';
            if (isDarkText(inst.id, String(visualStroke))) {
              textColor = '#1a1a1a';
            }
          }

          return (
            <button
              key={stroke}
              onClick={() => handleSelectStroke(stroke)}
              className={`h-8 font-black text-xs border flex items-center justify-center cursor-pointer transition-all ${
                isSelected 
                  ? 'border-2 border-black scale-105 shadow-[1px_1px_2px_rgba(0,0,0,0.3)]' 
                  : 'border-black/50 opacity-80 hover:opacity-100'
              } ${!isLoaded ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''}`}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              {isStrokeLoading ? (
                <span className="animate-spin text-[10px]">⏳</span>
              ) : (
                inst ? getVisualStrokeSymbol(stroke, isLeftHanded, inst.id) : stroke
              )}
            </button>
          );
        })}

        {/* Xilogravura / Woodcut styled Expand Button */}
        {allowedStrokes.length > choicesToShow.length && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="col-span-3 h-8 font-cactus font-black text-xs border-2 border-black bg-[#f4ecd8] text-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#f4ecd8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center select-none"
          >
            + {sequencer.lang === 'fr' ? 'Déplier' : 'Desdobrar'}
          </button>
        )}
        
        {/* Option pour vider le pas */}
        <button
          onClick={() => handleSelectStroke(0)}
          className={`col-span-3 h-8 font-black text-[10px] border border-black uppercase flex items-center justify-center cursor-pointer transition-colors ${
            currentVal === 0 || currentVal === '0' || !currentVal
              ? 'bg-[#8b2a1a] text-[#f4ecd8]' 
              : 'bg-transparent text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]'
          }`}
          title="Silenciar / Vider"
        >
          Silence (0)
        </button>
      </div>
    </div>,
    document.body
  );
};
