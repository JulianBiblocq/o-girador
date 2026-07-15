/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useSequencerStore, isLinearDAWVisibleTrack, isToadaBus, isToadaChild } from '../stores/useSequencerStore';
import { useTimelineEditStore } from '../stores/useTimelineEditStore';
import { StepEditorPopup } from './StepEditorPopup';
import { useAudioStore } from '../stores/useAudioStore';
import { instrumentsConfig, ASSETS_BASE_URL, getVisualStrokeSymbol, NEWTON_NOTE_COLORS, isDarkText } from '../data';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { getBusNoteColor, getContrastColor } from '../utils/colorHelpers';
import { XiloChisel } from './XiloIcons';
import { CompassoSelector } from './CompassoSelector';
import { useSequencer } from '../contexts/SequencerContext';

interface DawLinearSequencerProps {
  isActive: boolean;
  mestreSignals: any[];
  onStepTouchStart?: any;
}

export const DawLinearSequencer: React.FC<DawLinearSequencerProps> = ({
  isActive,
  onStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const tracks = useSequencerStore(state => state.tracks);

  // For instrument selection dropdown
  const [dropdownOpenTrackId, setDropdownOpenTrackId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpenTrackId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter visible tracks to show on the DAW grid (matching left Mixer panel list)
  const visibleTracks = useMemo(() => {
    const list: any[] = [];
    tracks.forEach(t => {
      if (isLinearDAWVisibleTrack(t, tracks)) {
        list.push(t);
        if (isToadaBus(t) && !t.isSequencerFolded) {
          const puxTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
          const coroTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
          if (puxTrack) list.push(puxTrack);
          if (coroTrack) list.push(coroTrack);
        }
        if (t.isLinkMaster) {
          const parentBus = tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
          if (parentBus && !parentBus.isSequencerFolded) {
            const slaves = tracks.filter(child => 
              String(child.linkedToTrackId) === String(parentBus.id) && 
              !child.isLinkFolder && 
              !child.isLinkMaster
            );
            list.push(...slaves);
          }
        }
      }
    });
    return list;
  }, [tracks]);

  // Keep track of DOM elements for playhead updates (Zero Render Thrashing)
  // Double indexation ref structure: cellRefs.current[trackId][stepIdx] = HTMLElement
  const cellRefs = useRef<Record<string, Record<number, HTMLElement>>>({});
  const lastActiveStepRef = useRef<number>(-1);

  // Compute stable visible track IDs string for hook dependency
  const visibleTrackIds = useMemo(() => {
    return visibleTracks.map(t => t.id).join('-');
  }, [visibleTracks]);

  // Register cell DOM elements with cleanup of orphaned refs
  const registerStepRef = (trackId: number, stepIdx: number, el: HTMLButtonElement | null) => {
    if (el) {
      if (!cellRefs.current[trackId]) {
        cellRefs.current[trackId] = {};
      }
      cellRefs.current[trackId][stepIdx] = el;
    } else {
      if (cellRefs.current[trackId]) {
        delete cellRefs.current[trackId][stepIdx];
        if (Object.keys(cellRefs.current[trackId]).length === 0) {
          delete cellRefs.current[trackId];
        }
      }
    }
  };

  // High-performance playhead ticks listener bypassing React render cycle
  useEffect(() => {
    if (!isActive) {
      if (lastActiveStepRef.current !== -1) {
        const lastIdx = lastActiveStepRef.current;
        Object.keys(cellRefs.current).forEach((tId) => {
          const steps = cellRefs.current[tId];
          if (steps[lastIdx]) {
            const el = steps[lastIdx];
            el.classList.remove('playhead-active');
            el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
          }
        });
        lastActiveStepRef.current = -1;
      }
      return;
    }

    const handleTick = (detail: { step: number; ratio?: number }) => {
      const ratio = detail.ratio ?? 0;
      const targetStep = Math.floor(ratio * 16);
      const lastStep = lastActiveStepRef.current;

      if (targetStep === lastStep) return;

      Object.keys(cellRefs.current).forEach((tId) => {
        const steps = cellRefs.current[tId];

        // 1. Remove playhead indicators from the previous active step
        if (lastStep !== -1 && steps[lastStep]) {
          const prevEl = steps[lastStep];
          prevEl.classList.remove('playhead-active');
          prevEl.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }

        // 2. Add playhead indicators to the new active step (subtle clay red organic glow)
        if (steps[targetStep]) {
          const newEl = steps[targetStep];
          newEl.classList.add('playhead-active');
          newEl.classList.add('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }
      });

      lastActiveStepRef.current = targetStep;
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (lastActiveStepRef.current !== -1) {
        const lastIdx = lastActiveStepRef.current;
        Object.keys(cellRefs.current).forEach((tId) => {
          const steps = cellRefs.current[tId];
          if (steps[lastIdx]) {
            const el = steps[lastIdx];
            el.classList.remove('playhead-active');
            el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
          }
        });
      }
    };
  }, [isActive, visibleTrackIds]);

  // Handle clicking step cells to open TouchStrokeSelector or StepEditorPopup
  const handleStepClick = (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => {
    e.stopPropagation();
    
    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        activePattern.id,
        stepIdx,
        inst.id,
        currentVal,
        (newVal) => {
          sequencer.handleTrackStepValueChange(trackId, activePattern.id, stepIdx, newVal);
        },
        trackId
      );
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const allowedStrokes = Object.keys(inst.colors || {}).filter(k => k !== 'text');
      
      useTimelineEditStore.getState().openEditor({
        activeStepKey: `${trackId}_${currentMeasure - 1}_${stepIdx}`,
        anchorRect: rect,
        allowedStrokes,
        currentVal,
        trackId,
        patternId: activePattern.id,
        measureIdx: currentMeasure - 1,
        stepIdx
      });
    }
  };

  // Helper names formatting
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };

  return (
    <div
      className="flex-grow flex flex-col justify-start bg-gradient-to-b from-[#1c1815] to-[#120e0c] select-none w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar"
      style={{
        display: isActive ? 'flex' : 'none',
      }}
    >
      {/* Scrollable Container enforcing combined inline tracks scroll */}
      <div className="min-w-[1240px] p-5 flex flex-col justify-start h-full">
        
        <div className="flex items-center w-full h-auto pb-2.5 shrink-0 border-b border-[#333] mb-4 select-none justify-start">
          {/* Left Spacer matching Left Instrument Mixer section width (360px) */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex items-center gap-3">
            <button
              onClick={() => useSequencerStore.getState().toggleTracksCollapsed()}
              className="bg-transparent border border-[#444] px-3 py-2 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors flex-shrink-0 flex items-center justify-center"
              title={lang === 'fr' ? 'Replier le séquenceur' : 'Recolher sequenciador'}
            >
              ▲
            </button>
            <CompassoSelector className="flex-grow max-w-[240px]" />
          </div>

          {/* Right Ruler steps timeline headers aligned to beats */}
          <div className="flex items-center justify-between flex-grow gap-2 md:gap-3 select-none pl-4">
            <div className="grid grid-cols-8 xl:grid-cols-[repeat(16,_minmax(0,_1fr))] gap-y-1 md:gap-y-2 gap-x-0 w-full items-center text-[#1a1a1a] font-cactus font-bold text-[10px] md:text-xs">
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const isBeatStart = stepIdx % 4 === 0;
                const isBeatEnd = (stepIdx + 1) % 4 === 0;
                const beatNum = Math.floor(stepIdx / 4) + 1;
                const isTimeSeparator = (stepIdx + 1) % 4 === 0 && stepIdx < 15;
                const beatIndex = Math.floor(stepIdx / 4);
                const isEvenBeat = beatIndex % 2 === 0;
                const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
                const cellBorderRadius = isBeatStart 
                  ? '4px 0 0 4px' 
                  : (isBeatEnd ? '0 4px 4px 0' : '0px');
                return (
                  <div
                    key={stepIdx}
                    className="text-center py-1"
                    style={{
                      backgroundColor: emptyStepBg,
                      marginRight: isTimeSeparator ? '6px' : undefined,
                      borderRadius: cellBorderRadius,
                    }}
                  >
                    {isBeatStart ? `T${beatNum}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Scrollable DAW Tracks list */}
        <div className="flex flex-col gap-3 flex-grow">
          {visibleTracks.map((track, trackIdx) => {
            const isToada = isToadaBus(track);

            // Find active vocal track children
            const activeChildTrack = (() => {
              if (!isToada) return null;
              const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
              const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
              const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
              if (globalSelectedId) {
                if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
                if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
              }
              const coroPtn = coro?.patterns.find(p => p.measureAssignments[currentMeasure]);
              if (coroPtn) return coro;
              const puxPtn = pux?.patterns.find(p => p.measureAssignments[currentMeasure]);
              if (puxPtn) return pux;
              return coro || pux || null;
            })();

            const effectiveTrack = isToada ? (activeChildTrack || track) : track;
            const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

            if (!inst) return null;

            const override = track.patternOverrides?.[currentMeasure];
            const hasExplicitVariation = override !== undefined && override !== null;

            const isLinkedSlave = track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster;
            const parentBus = isLinkedSlave
              ? tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
              : null;

            let activePattern = null;
            if (isLinkedSlave && parentBus) {
              if (override === null) {
                activePattern = null;
              } else if (override !== undefined) {
                activePattern = parentBus.patterns.find(p => p.id === override) || null;
              } else {
                activePattern = parentBus.patterns.find(p => p.measureAssignments?.[currentMeasure]) || parentBus.patterns[0] || null;
              }
            } else {
              if (override === null) {
                activePattern = null;
              } else if (override !== undefined) {
                activePattern = effectiveTrack.patterns?.find(p => p.id === override) || null;
              } else {
                activePattern = effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
              }
            }

            const isToadaChildTrack = isToadaChild(track, tracks);
            const isChild = isLinkedSlave || isToadaChildTrack;

            // Ghost track detection
            const isGhostStep = isLinkedSlave && !hasExplicitVariation;

            const masterTrack = isGhostStep 
              ? tracks.find(t => String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster)
              : null;
            const masterActivePattern = masterTrack
              ? (masterTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || masterTrack.patterns?.[0])
              : null;

            const displayName = isToada
              ? 'Toada'
              : (inst ? (track.isLinkMaster ? `🔗 ${getPluralName(inst.name)}` : (isChild ? `↳ ${track.customName || inst.name}` : (track.customName || inst.name))) : 'Instrument');

            return (
              <div
                key={track.id}
                className="flex items-center w-full h-auto min-h-[116px] xl:h-[76px] xl:min-h-[76px] justify-start shrink-0 text-[#1a1a1a] overflow-hidden border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 py-1"
              >
                {/* A. Left Side: Integrated Instrument Mixer Controls (w-[360px] fixed width) */}
                <div 
                  className={`flex items-center justify-between gap-2 w-[360px] min-w-[360px] h-[76px] min-h-[76px] shrink-0 border-r border-[#1a1a1a]/20 pr-3 relative z-[2] ${
                    isChild ? 'pl-8' : 'pl-3'
                  }`}
                  ref={dropdownOpenTrackId === track.id ? dropdownRef : undefined}
                >
                  <div className="flex items-center gap-2">
                    {/* Sortable drag grip (pure aesthetic in DAW view but maintains Mixer visual layout) */}
                    <div className="mr-2 transition-colors p-1 touch-none flex-shrink-0 text-[#1a1a1a]/40">
                      <GripVertical size={16} />
                    </div>

                    {/* Instrument Selector Button */}
                    <div className="relative flex items-center">
                      <button
                        onClick={() => setDropdownOpenTrackId(dropdownOpenTrackId === track.id ? null : track.id)}
                        className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[11px] cursor-pointer transition-colors w-[110px] sm:w-[120px]"
                        style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
                      >
                        <img
                          src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                          alt={inst.name}
                          className="w-4 h-4 object-contain flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="font-cactus font-bold text-center leading-[1.1] flex-1 truncate">
                          {trackIdx + 1}. {displayName.split(' ')[0]}
                          {displayName.indexOf(' ') !== -1 && <><br/>{displayName.substring(displayName.indexOf(' ') + 1)}</>}
                        </span>
                        <span className="text-[8px] flex-shrink-0">▼</span>
                      </button>

                      {/* Instrument Selector Dropdown popup */}
                      {dropdownOpenTrackId === track.id && (
                        <div className="absolute top-9 left-0 bg-[#f4ecd8] text-[#1a1a1a] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                          {instrumentsConfig.map((opt, oIdx) => (
                            <div
                              key={opt.id}
                              onClick={() => {
                                useSequencerStore.getState().handleTrackInstrumentIdxChange(track.id, oIdx);
                                setDropdownOpenTrackId(null);
                              }}
                              className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-black/10 hover:bg-black hover:text-[#f4ecd8]"
                            >
                              <img
                                src={`${ASSETS_BASE_URL}${opt.iconImg}`}
                                alt={opt.name}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span>{opt.name}</span>
                            </div>
                          ))}
                          <div
                            onClick={() => {
                              useSequencerStore.getState().handleTrackDelete(track.id);
                              setDropdownOpenTrackId(null);
                            }}
                            className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
                          >
                            <span className="w-5 text-center">✕</span>
                            <span>{lang === 'fr' ? 'Supprimer la piste' : 'Excluir pista'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Editor Icon */}
                    {(!track.isBusFolder || isToada || track.isLinkFolder) && (
                      <button
                        onClick={() => {
                          const targetTrack = isToada
                            ? (activeChildTrack || tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || track)
                            : track;
                          useSequencerStore.getState().setEditingTrackId(targetTrack.id);
                        }}
                        className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]"
                        title={lang === 'pt' ? 'Editor detalhado' : 'Éditeur détaillé'}
                      >
                        <XiloChisel size={13} />
                      </button>
                    )}

                    {(track.isLinkMaster || isToada) && (
                      <button
                        onClick={() => {
                          if (isToada) {
                            useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
                          } else if (track.isLinkMaster && track.linkedToTrackId) {
                            const parentBus = tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
                            if (parentBus) {
                              useSequencerStore.getState().handleToggleSequencerFoldBus(String(parentBus.id));
                            }
                          }
                        }}
                        className="ml-1 p-0.5 hover:bg-black/10 rounded cursor-pointer text-[10px] font-bold shrink-0 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-black"
                        title={(() => {
                          const isCollapsed = isToada
                            ? track.isSequencerFolded
                            : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
                          return isCollapsed ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar');
                        })()}
                      >
                        {(() => {
                          const isCollapsed = isToada
                            ? track.isSequencerFolded
                            : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
                          return isCollapsed ? '▶' : '▼';
                        })()}
                      </button>
                    )}
                  </div>

                  {/* Right Side Buttons: Mute and Solo only */}
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackMuteToggle(track.id); }} 
                      className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
                        (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
                      }`}
                    >M</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackSoloToggle(track.id); }} 
                      className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
                        track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
                      }`}
                    >S</button>
                  </div>
                </div>

                {/* B. Right Side: 16 Step Buttons aligned in a regular fluid grid, stretched to border */}
                <div className="flex items-center flex-grow pl-4">
                  <div className="grid grid-cols-8 xl:grid-cols-[repeat(16,_minmax(0,_1fr))] gap-y-1 md:gap-y-2 gap-x-0 w-full items-center select-none">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const val = isGhostStep
                        ? (masterActivePattern?.activeSteps?.[stepIdx] ?? 0)
                        : (activePattern?.activeSteps?.[stepIdx] ?? 0);
                      const isActiveCell = val !== 0 && val !== '';
                      const isVoice = inst.type === 'voice' || inst.id === 'toada';

                      const note = isVoice 
                        ? (isGhostStep 
                            ? (masterActivePattern?.notes?.[stepIdx] || '')
                            : (activePattern?.notes?.[stepIdx] || ''))
                        : '';
                      const noteLetter = note ? note.charAt(0).toUpperCase() : '';

                      const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
                      
                      // Resolve lyrics or text symbol for voice track, percussions get letters
                      const syl = isGhostStep
                        ? (masterActivePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''))
                        : (activePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''));
                      let displayVal = isVoice ? syl : (visualVal === 0 ? '' : String(visualVal));

                      // Zebra timing: alternate background color every 4 steps
                      const beatIndex = Math.floor(stepIdx / 4);
                      const isEvenBeat = beatIndex % 2 === 0;
                      const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';

                      let bgColor = emptyStepBg;
                      let txtColor = 'rgba(26, 26, 26, 0.4)';
                      let borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                      let isSplit = false;

                      let leftBg = emptyStepBg;
                      let leftTxt = 'transparent';
                      let leftSym = '';

                      let rightBg = emptyStepBg;
                      let rightTxt = 'transparent';
                      let rightSym = '';

                      // Resolve default master styles
                      let masterBg = emptyStepBg;
                      let masterTxt = txtColor;
                      let masterSym = displayVal;

                      if (isActiveCell) {
                        if (isVoice) {
                          const voiceInst = instrumentsConfig.find(c => c.id === (val === 'P' ? 'puxador' : 'coro')) || inst;
                          masterBg = voiceInst.color || '#f4ecd8';
                          masterTxt = '#1a1a1a';
                        } else {
                          masterBg = inst.colors?.[visualVal as string] || '#111';
                          masterTxt = inst.colors?.text || '#f4ecd8';
                          if (isDarkText(inst.id, visualVal as string)) {
                            masterTxt = '#1a1a1a';
                          }
                        }
                      }

                      // ── RESOLVE TRACK LINKING AND VARIATIONS (RODA STYLE) ──
                      const children = tracks.filter(t => String(t.linkedToTrackId) === String(track.id) && !t.isBusFolder);
                      const isLinkedGroup = children.length > 0;

                      if (isLinkedGroup) {
                        // Collect active events from child tracks
                        const childActiveEvents: Array<{
                          bgColor: string;
                          txtColor: string;
                          displayVal: string;
                          visualVal: string | number;
                        }> = [];

                        children.forEach(c => {
                          const override = c.patternOverrides?.[currentMeasure];
                          let cPattern = null;
                          if (override === null) {
                            cPattern = null;
                          } else if (override !== undefined) {
                            cPattern = track.patterns?.find((p: any) => p.id === override);
                          } else if (activePattern) {
                            cPattern = c.patterns?.find((p: any) => p.id === activePattern.id);
                            if (!cPattern) {
                              const idx = effectiveTrack.patterns?.indexOf(activePattern) ?? -1;
                              if (idx !== -1 && c.patterns) {
                                cPattern = c.patterns[idx];
                              }
                            }
                          }

                          const cVal = cPattern?.activeSteps?.[stepIdx] ?? 0;
                          if (cVal !== 0 && cVal !== '') {
                            const cInst = instrumentsConfig[c.instrumentIdx];
                            if (cInst) {
                              const cVisualVal = getVisualStrokeSymbol(cVal, isLeftHanded, cInst.id);
                              if (cVisualVal !== 0) {
                                const cBgColor = cInst.colors?.[cVisualVal as string] || cInst.color || '#111';
                                let cTxtColor = cInst.colors?.text || '#f4ecd8';
                                if (isDarkText(cInst.id, cVisualVal as string)) {
                                  cTxtColor = '#1a1a1a';
                                }
                                childActiveEvents.push({
                                  bgColor: cBgColor,
                                  txtColor: cTxtColor,
                                  displayVal: String(cVisualVal),
                                  visualVal: cVisualVal,
                                });
                              }
                            }
                          }
                        });

                        const masterVisualVal = isActiveCell ? visualVal : 0;
                        const hasMasterEvent = masterVisualVal !== 0;
                        const activeChildrenCount = childActiveEvents.length;

                        let isUnisson = false;
                        if (hasMasterEvent && activeChildrenCount > 0) {
                          // Unison = all ACTIVE children play the same stroke as master
                          isUnisson = childActiveEvents.every(evt => evt.visualVal === masterVisualVal);
                        }

                        if (isUnisson) {
                          // Cas A : Perfect Unison -> Uni normal step using the average group color
                          isSplit = false;
                          bgColor = getBusNoteColor(String(track.id), String(masterVisualVal), tracks, instrumentsConfig);
                          txtColor = getContrastColor(bgColor);
                          borderStyle = '2px solid #1a1a1a';
                          displayVal = String(masterVisualVal);
                        } else {
                          // Divergence (at least one instrument in the group is playing something different/silence)
                          const groupHasEvent = hasMasterEvent || activeChildrenCount > 0;
                          if (groupHasEvent) {
                            isSplit = true;
                            borderStyle = '2px solid #1a1a1a';

                            // Left-Top half (Master)
                            if (hasMasterEvent) {
                              leftBg = masterBg;
                              leftTxt = masterTxt;
                              leftSym = masterSym;
                            } else {
                              leftBg = emptyStepBg;
                              leftTxt = 'transparent';
                              leftSym = '';
                            }

                            // Right-Bottom half (Variation / Slave)
                            if (activeChildrenCount > 0) {
                              rightBg = childActiveEvents[0].bgColor;
                              rightTxt = childActiveEvents[0].txtColor;
                              rightSym = childActiveEvents[0].displayVal;
                            } else {
                              // Slave is silent while master plays (Cas B variation silence)
                              rightBg = emptyStepBg;
                              rightTxt = 'transparent';
                              rightSym = '';
                            }
                          } else {
                            // All silent
                            isSplit = false;
                            bgColor = emptyStepBg;
                            txtColor = 'rgba(26, 26, 26, 0.4)';
                            borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                          }
                        }
                      } else {
                        // Normal, unlinked track
                        isSplit = false;
                        if (isActiveCell) {
                          bgColor = masterBg;
                          txtColor = masterTxt;
                          borderStyle = '2px solid #1a1a1a';
                        } else {
                          bgColor = emptyStepBg;
                          txtColor = 'rgba(26, 26, 26, 0.4)';
                          borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                        }
                      }

                      // Micro separator margin after every 4 steps (beat demarcation)
                      const isTimeSeparator = (stepIdx + 1) % 4 === 0 && stepIdx < 15;

                      const cellContent = (() => {
                        if (isSplit) {
                          return (
                            <button
                              ref={(el) => registerStepRef(track.id, stepIdx, el)}
                              data-step-index={stepIdx}
                              onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                              className="sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out w-11 h-11 md:w-12 md:h-12 flex-shrink-0 aspect-square overflow-hidden outline-none"
                              style={{
                                border: borderStyle,
                                borderRadius: '2px',
                                boxShadow: '1px 1px 0px rgba(0,0,0,1)',
                                background: `linear-gradient(135deg, ${leftBg} 48%, #000 48%, #000 52%, ${rightBg} 52%)`,
                              }}
                            >
                              {/* Left-Top text (base strike) */}
                              <span
                                className="absolute top-0.5 left-1.5 text-sm font-bold z-10"
                                style={{ color: leftTxt }}
                              >
                                {leftSym}
                              </span>

                              {/* Right-Bottom text (variation strike) */}
                              <span
                                className="absolute bottom-0.5 right-1.5 text-sm font-bold z-10"
                                style={{ color: rightTxt }}
                              >
                                {rightSym}
                              </span>
                            </button>
                          );
                        }

                        // Normal undivided step button
                        return (
                          <button
                            ref={(el) => registerStepRef(track.id, stepIdx, el)}
                            data-step-index={stepIdx}
                            data-step-type={isVoice ? 'voice' : 'sampler'}
                            onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                            className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out w-11 h-11 md:w-12 md:h-12 flex-shrink-0 aspect-square outline-none ${
                              isActiveCell ? 'is-active scale-100' : 'hover:bg-black/5'
                            } ${
                              isVoice 
                                ? 'text-[10px] md:text-xs font-sans normal-case leading-tight text-center break-words overflow-hidden px-1' 
                                : 'text-lg font-bold'
                            }`}
                            style={{
                              backgroundColor: isActiveCell ? bgColor : 'transparent',
                              color: txtColor,
                              border: borderStyle,
                              borderRadius: '2px',
                              boxShadow: isActiveCell ? '1px 1px 0px rgba(0,0,0,1)' : undefined,
                              opacity: isGhostStep ? 0.35 : 1,
                            }}
                          >
                            {displayVal}
                          </button>
                        );
                      })();

                      const isBeatStart = stepIdx % 4 === 0;
                      const isBeatEnd = (stepIdx + 1) % 4 === 0;
                      const cellBorderRadius = isBeatStart 
                        ? '4px 0 0 4px' 
                        : (isBeatEnd ? '0 4px 4px 0' : '0px');

                      return (
                        <div
                          key={stepIdx}
                          className="flex items-center justify-center h-full w-full py-1"
                          style={{
                            backgroundColor: emptyStepBg,
                            marginRight: isTimeSeparator ? '6px' : undefined,
                            borderRadius: cellBorderRadius,
                          }}
                        >
                          {cellContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <StepEditorPopup />
    </div>
  );
};
