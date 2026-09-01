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
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [editingHalf, setEditingHalf] = useState<0 | 1>(0);

  // Reset local states when active step changes
  useEffect(() => {
    setIsExpanded(false);
    setLoadingStroke(null);
    setIsSplitMode(Array.isArray(currentVal));
    setEditingHalf(0);
  }, [activeStepKey, currentVal]);

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

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closeEditor();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleMouseDown);
    };
  }, [activeStepKey, closeEditor]);

  if (!activeStepKey || !anchorRect || trackId === null || patternId === null || measureIdx === null || stepIdx === null) {
    return null;
  }

  // Calcul du positionnement de la popup (juste sous la cellule, centré ou ramené légèrement vers le centre)
  const popupWidth = 140;
  const top = anchorRect.bottom + window.scrollY + 6;
  const idealX = (anchorRect.left + window.scrollX) * 0.7 + (window.innerWidth / 2 - popupWidth / 2) * 0.3;
  const left = Math.max(10, Math.min(window.innerWidth - popupWidth - 10, idealX));

  const activeStrokesForTrack = track ? getActiveStrokesForTrack(track, tracks) : [];

  const forcedStrokes = useSequencerSettingsStore(state => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore(state => state.setStrokeForcedState);

  // Filter strokes shown by default
  const choicesToShow = allowedStrokes.filter(stroke => {
    if (isExpanded) return true;
    const forced = forcedStrokes[`${trackId}:${stroke}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.some(s => s.toLowerCase() === stroke.toLowerCase());
    
    // Keep currently selected step value(s) visible in clean mode
    if (Array.isArray(currentVal)) {
      if (String(currentVal[0]) === String(stroke) || String(currentVal[1]) === String(stroke)) return true;
    } else {
      if (String(currentVal) === String(stroke)) return true;
    }
    return isActive;
  });

  const handleSelectStroke = async (stroke: string | number) => {
    if (stroke === 0 || stroke === '0') {
      if (isSplitMode) {
        const newVal = [...(Array.isArray(currentVal) ? currentVal : [currentVal, currentVal])];
        newVal[editingHalf] = '0';
        if (newVal[0] === '0' && newVal[1] === '0') {
          sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
          closeEditor();
        } else {
          sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, newVal);
        }
      } else {
        sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
        closeEditor();
      }
      return;
    }

    const strokeStr = String(stroke);
    const isLoaded = inst && audioEngine ? audioEngine.isStrokeLoaded(inst.id, strokeStr) : true;

    const forced = forcedStrokes[`${trackId}:${strokeStr}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.some(s => s.toLowerCase() === strokeStr.toLowerCase());

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
      setStrokeForcedState(`${trackId}:${strokeStr}`, true);
    }

    if (isSplitMode) {
      const newVal = Array.isArray(currentVal) ? [...currentVal] : [currentVal || strokeStr, strokeStr];
      newVal[editingHalf] = strokeStr;
      sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, newVal);
      if (editingHalf === 0) {
        setEditingHalf(1);
      } else {
        closeEditor();
      }
    } else {
      sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, strokeStr);
      if (!isActive) {
        setIsExpanded(false);
      } else {
        closeEditor();
      }
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
      <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-black/60">
          Golpes / Coups
        </div>
        <button 
          onClick={() => {
            if (isSplitMode) {
              setIsSplitMode(false);
              sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, Array.isArray(currentVal) ? currentVal[0] : currentVal);
            } else {
              setIsSplitMode(true);
              const defaultStroke = allowedStrokes[0];
              sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, [currentVal || defaultStroke, defaultStroke]);
            }
          }}
          className={`text-[8px] font-bold border border-black px-1.5 py-0.5 transition-colors cursor-pointer ${isSplitMode ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-transparent text-black hover:bg-black/10'}`}
          title={sequencer.lang === 'pt' ? 'Dividir em semicolcheias' : 'Diviser en triples croches'}
        >
          RAS (1/32)
        </button>
      </div>

      {isSplitMode && (
        <div className="flex gap-1 mb-1">
          {[0, 1].map((halfIdx) => {
            const val = Array.isArray(currentVal) ? currentVal[halfIdx] : (halfIdx === 0 ? currentVal : allowedStrokes[0]);
            
            let bgColor = 'transparent';
            let textColor = '#000';
            
            if (inst && val !== 0 && val !== '0') {
              const visualStroke = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
              bgColor = inst.colors[visualStroke as string] || '#111';
              textColor = inst.colors.text || '#fff';
              if (isDarkText(inst.id, String(visualStroke))) {
                textColor = '#1a1a1a';
              }
            } else if (val === 0 || val === '0') {
              bgColor = '#8b2a1a';
              textColor = '#f4ecd8';
            }
            
            return (
              <button 
                key={halfIdx}
                className={`flex-1 h-7 border font-black text-xs flex items-center justify-center cursor-pointer transition-all ${editingHalf === halfIdx ? 'border-2 border-black scale-105 shadow-sm z-10' : 'border-black/30 opacity-70 hover:opacity-100'}`}
                onClick={() => setEditingHalf(halfIdx as 0 | 1)}
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                {val === 0 || val === '0' ? '-' : (inst ? getVisualStrokeSymbol(val, isLeftHanded, inst.id) : val)}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-1">
        {choicesToShow.map((stroke) => {
          let isSelected = false;
          if (isSplitMode) {
            const currentHalfVal = Array.isArray(currentVal) ? currentVal[editingHalf] : currentVal;
            isSelected = String(currentHalfVal) === String(stroke);
          } else {
            isSelected = String(currentVal) === String(stroke);
          }
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
            (isSplitMode ? (Array.isArray(currentVal) && (currentVal[editingHalf] === 0 || currentVal[editingHalf] === '0')) : (currentVal === 0 || currentVal === '0' || !currentVal))
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
