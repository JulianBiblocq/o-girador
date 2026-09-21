/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pattern, TrackGroup } from '../types';
import { useSequencerStore, isToadaBus, isToadaChild } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { instrumentsConfig, ASSETS_BASE_URL, getVisualStrokeSymbol, isDarkText } from '../data';
import { getBusColor, getTopParentBusId, getBusNoteColor, getContrastColor, getTrackDisplayName } from '../utils/colorHelpers';
import { XiloChisel } from './XiloIcons';

export interface DawTrackRowProps {
  track: TrackGroup;
  trackIdx: number;
  tracks: TrackGroup[];
  currentMeasure: number;
  defaultBeats: number;
  lang: string;
  isLeftHanded: boolean;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
}

export const DawTrackRow: React.FC<DawTrackRowProps> = ({
  track,
  trackIdx,
  tracks,
  currentMeasure,
  defaultBeats,
  lang,
  isLeftHanded,
  sequencer,
  handleStepClick,
  registerStepRef,
  trackResolutionsRef,
}) => {
  const isLinkedSlave = !!(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const isToadaChildTrack = isToadaChild(track, tracks);
  const isChild = isLinkedSlave || isToadaChildTrack;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `track-${track.id}`, disabled: isChild });

  const topBusId = React.useMemo(() => {
    return getTopParentBusId(track, tracks) 
      || (track.linkedToTrackId ? String(track.linkedToTrackId) : (track.isLinkMaster ? String(track.id) : null));
  }, [track, tracks]);

  const busColor = React.useMemo(() => {
    if (!topBusId) return null;
    return getBusColor(topBusId, tracks, instrumentsConfig);
  }, [topBusId, tracks]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.75 : 1,
    borderLeft: busColor ? `5px solid ${busColor}` : '2px solid #1a1a1a',
  };

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

  const parentBus = isLinkedSlave
    ? tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
    : null;

  let activePattern: Pattern | null = null;
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
    : (isChild ? `↳ ${getTrackDisplayName(track, tracks)}` : getTrackDisplayName(track, tracks));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center w-full h-auto min-h-[116px] xl:h-[76px] xl:min-h-[76px] justify-start shrink-0 text-[#1a1a1a] border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 py-1 relative overflow-hidden z-[1]"
    >
      {/* A. Left Side: Integrated Instrument Mixer Controls (w-[360px] fixed width) */}
      <div 
        className={`flex items-center justify-between gap-2 w-[360px] min-w-[360px] h-[76px] min-h-[76px] shrink-0 border-r border-[#1a1a1a]/20 pr-3 relative z-[2] ${
          isChild ? 'pl-8' : 'pl-3'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Sortable drag grip handle: only active on master or standalone tracks */}
          {!isChild ? (
            <div
              {...listeners}
              {...attributes}
              className="mr-2 transition-colors p-1 touch-none flex-shrink-0 text-[#1a1a1a]/60 hover:text-[#1a1a1a] cursor-grab active:cursor-grabbing"
              title={lang === 'fr' ? 'Glisser pour réordonner la piste' : 'Arrastar para reordenar a faixa'}
            >
              <GripVertical size={16} />
            </div>
          ) : (
            <div className="w-6 mr-2 flex-shrink-0" />
          )}

          {/* Instrument Button (Now opens Editor) */}
          <div className="relative flex items-center">
            <button
              onClick={() => {
                if (track.isBusFolder && !isToada && !track.isLinkFolder) {
                  useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
                  return;
                }
                const targetTrack = isToada
                  ? (activeChildTrack || tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || track)
                  : track;
                useSequencerStore.getState().setEditingTrackId(targetTrack.id);
              }}
              className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[10px] cursor-pointer transition-colors w-[180px] sm:w-[190px]"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
              title={lang === 'pt' ? 'Editar instrumento' : 'Éditer l\'instrument'}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-cactus font-bold text-center leading-normal flex-1 truncate">
                {trackIdx + 1}. {displayName}
              </span>
              {(!track.isBusFolder || isToada || track.isLinkFolder) && (
                <span className="flex-shrink-0 opacity-70"><XiloChisel size={11} /></span>
              )}
            </button>
          </div>

          {/* Bouton de suppression sécurisé de la piste (icône corbeille) */}
          <button
            onClick={async () => {
              const trackName = displayName || inst?.name || (lang === 'fr' ? 'cette piste' : 'esta faixa');
              const isBus = track.isBusFolder;
              const childTracks = tracks.filter(t => String(t.busId) === String(track.id));
              let confirmMsg: string;
              if (isBus && childTracks.length > 0) {
                confirmMsg = lang === 'fr'
                  ? `Attention : le bus "${trackName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?`
                  : `Atenção: o bus "${trackName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`;
              } else {
                confirmMsg = lang === 'fr'
                  ? `Supprimer définitivement la piste "${trackName}" et tous ses motifs ?`
                  : `Excluir definitivamente a faixa "${trackName}" e todos os seus padrões?`;
              }
              if (await sequencer.confirmAsync(confirmMsg)) {
                useSequencerStore.getState().handleTrackDelete(track.id);
              }
            }}
            className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
            title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}
          >
            <Trash2 size={13} />
          </button>

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

      </div>

      {/* B. Right Side: Dynamic Step Buttons grouped by beats */}
      {(() => {
        const patternForSteps = isGhostStep ? masterActivePattern : activePattern;
        const stepsCount = patternForSteps?.steps ?? 16;
        const beatRes = patternForSteps?.beatResolutions || Array(defaultBeats).fill(4);

        // Keep trackResolutionsRef updated synchronously during render (Zero Layout Thrashing)
        trackResolutionsRef.current[String(track.id)] = {
          beats: defaultBeats,
          resArray: beatRes,
          totalSteps: stepsCount,
        };

        // Compute step index groups per beat
        const beatGroups: number[][] = [];
        let accumulated = 0;
        for (let b = 0; b < defaultBeats; b++) {
          const res = beatRes[b] ?? 4;
          const group: number[] = [];
          for (let i = 0; i < res; i++) {
            if (accumulated + i < stepsCount) {
              group.push(accumulated + i);
            }
          }
          beatGroups.push(group);
          accumulated += res;
        }

        return (
          <div className="flex items-center flex-grow pl-4 h-full">
            <div className="flex w-full h-full items-center gap-1.5 select-none">
              {beatGroups.map((group, beatIdx) => {
                const isEvenBeat = beatIdx % 2 === 0;
                const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
                const isTriplet = group.length === 3;
                const isSextuplet = group.length === 6;

                return (
                  <div
                    key={beatIdx}
                    className={`flex flex-1 h-full items-center py-1 px-1 rounded ${
                      isTriplet ? 'justify-between gap-1' : isSextuplet ? 'gap-0.5' : 'gap-1'
                    }`}
                    style={{ 
                      backgroundColor: emptyStepBg,
                      ...(group.length === 0 && {
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 4px, transparent 4px, transparent 20px)',
                        backgroundSize: '100% 100%'
                      })
                    }}
                  >
                    {group.map((stepIdx, indexInGroup) => {
                      const val = isGhostStep
                        ? (masterActivePattern?.activeSteps?.[stepIdx] ?? 0)
                        : (activePattern?.activeSteps?.[stepIdx] ?? 0);
                      const isActiveCell = val !== 0 && val !== '';
                      const isVoice = inst.type === 'voice' || inst.id === 'toada';

                      const visualVal = getVisualStrokeSymbol(Array.isArray(val) ? val[0] : val, isLeftHanded, inst.id);
                      
                      const syl = isGhostStep
                        ? (masterActivePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''))
                        : (activePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''));
                      
                      let displayVal = isVoice ? syl : (visualVal === 0 ? '' : (Array.isArray(val) ? val.map(v => getVisualStrokeSymbol(v, isLeftHanded, inst.id)).join('') : String(visualVal)));

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

                      let masterBg = emptyStepBg;
                      let masterTxt = txtColor;
                      let masterSym = displayVal;

                      if (isActiveCell) {
                        if (isVoice) {
                          const voiceInst = instrumentsConfig.find(c => c.id === (val === 'P' ? 'puxador' : 'coro')) || inst;
                          masterBg = voiceInst.color || '#f4ecd8';
                          masterTxt = '#1a1a1a';
                        } else {
                          const primaryVal = String(visualVal);
                          masterBg = inst.colors?.[primaryVal] || inst.color || '#111';
                          masterTxt = inst.colors?.text || '#f4ecd8';
                          if (isDarkText(inst.id, primaryVal)) {
                            masterTxt = '#1a1a1a';
                          }
                        }
                      }

                      // ── RESOLVE TRACK LINKING AND VARIATIONS (RODA STYLE) ──
                      const children = tracks.filter(t => String(t.linkedToTrackId) === String(track.id) && !t.isBusFolder);
                      const isLinkedGroup = children.length > 0;

                      if (isLinkedGroup) {
                        const childActiveEvents: Array<{
                          bgColor: string;
                          txtColor: string;
                          displayVal: string;
                          visualVal: string | number;
                        }> = [];

                        children.forEach(c => {
                          const overrideVal = c.patternOverrides?.[currentMeasure];
                          let cPattern: Pattern | null | undefined = null;
                          if (overrideVal === null) {
                            cPattern = null;
                          } else if (overrideVal !== undefined) {
                            cPattern = track.patterns?.find((p: any) => p.id === overrideVal);
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
                                const primaryCVisual = Array.isArray(cVisualVal) ? cVisualVal[0] : cVisualVal;
                                const cBgColor = cInst.colors?.[primaryCVisual as string] || cInst.color || '#111';
                                let cTxtColor = cInst.colors?.text || '#f4ecd8';
                                if (isDarkText(cInst.id, primaryCVisual as string)) {
                                  cTxtColor = '#1a1a1a';
                                }
                                childActiveEvents.push({
                                  bgColor: cBgColor,
                                  txtColor: cTxtColor,
                                  displayVal: String(primaryCVisual),
                                  visualVal: primaryCVisual,
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
                          isUnisson = childActiveEvents.every(evt => evt.visualVal === masterVisualVal);
                        }

                        if (isUnisson) {
                          isSplit = false;
                          bgColor = getBusNoteColor(String(track.id), String(masterVisualVal), tracks, instrumentsConfig);
                          txtColor = getContrastColor(bgColor);
                          borderStyle = '2px solid #1a1a1a';
                          displayVal = String(masterVisualVal);
                        } else {
                          const groupHasEvent = hasMasterEvent || activeChildrenCount > 0;
                          if (groupHasEvent) {
                            isSplit = true;
                            borderStyle = '2px solid #1a1a1a';

                            if (hasMasterEvent) {
                              leftBg = masterBg;
                              leftTxt = masterTxt;
                              leftSym = masterSym;
                            } else {
                              leftBg = emptyStepBg;
                              leftTxt = 'transparent';
                              leftSym = '';
                            }

                            if (activeChildrenCount > 0) {
                              rightBg = childActiveEvents[0].bgColor;
                              rightTxt = childActiveEvents[0].txtColor;
                              rightSym = childActiveEvents[0].displayVal;
                            } else {
                              rightBg = emptyStepBg;
                              rightTxt = 'transparent';
                              rightSym = '';
                            }
                          } else {
                            isSplit = false;
                            bgColor = emptyStepBg;
                            txtColor = 'rgba(26, 26, 26, 0.4)';
                            borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                          }
                        }
                      } else {
                        // Normal, unlinked track
                        if (Array.isArray(val) && val.length === 2) {
                          isSplit = true;
                          borderStyle = '2px solid #1a1a1a';
                          bgColor = emptyStepBg;

                          const leftVal = getVisualStrokeSymbol(val[0], isLeftHanded, inst.id);
                          leftBg = inst.colors?.[String(leftVal)] || inst.color || '#111';
                          leftTxt = isDarkText(inst.id, String(leftVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8');
                          leftSym = leftVal === 0 ? '' : String(leftVal);
                          if (leftVal === 0 || leftVal === '') { leftBg = emptyStepBg; leftTxt = 'transparent'; }

                          const rightVal = getVisualStrokeSymbol(val[1], isLeftHanded, inst.id);
                          rightBg = inst.colors?.[String(rightVal)] || inst.color || '#111';
                          rightTxt = isDarkText(inst.id, String(rightVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8');
                          rightSym = rightVal === 0 ? '' : String(rightVal);
                          if (rightVal === 0 || rightVal === '') { rightBg = emptyStepBg; rightTxt = 'transparent'; }
                        } else {
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
                      }

                      if (isSplit) {
                        return (
                          <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
                            <button
                              ref={(el) => registerStepRef(track.id, stepIdx, el)}
                              data-step-index={stepIdx}
                              onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                              className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-10 md:h-11 overflow-hidden outline-none ${
                                isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
                              }`}
                              style={{
                                border: (isTriplet || isSextuplet) ? 'none' : borderStyle,
                                borderRadius: (isTriplet || isSextuplet) ? '0' : '2px',
                                boxShadow: (!isTriplet && !isSextuplet) ? '1px 1px 0px rgba(0,0,0,1)' : undefined,
                                filter: (isTriplet || isSextuplet) ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
                                clipPath: isSextuplet
                                  ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                  : isTriplet
                                    ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                                    : undefined,
                                opacity: isGhostStep ? 0.35 : 1,
                              }}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-center"
                                style={{ backgroundColor: leftBg, color: leftTxt }}
                              >
                                <span className={isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}>
                                  {leftSym}
                                </span>
                              </div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center border-l border-[#1a1a1a]"
                                style={{ backgroundColor: rightBg, color: rightTxt }}
                              >
                                <span className={isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}>
                                  {rightSym}
                                </span>
                              </div>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
                          <button
                            ref={(el) => registerStepRef(track.id, stepIdx, el)}
                            data-step-index={stepIdx}
                            onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                            className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-10 md:h-11 overflow-hidden outline-none ${
                              isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
                            }`}
                            style={{
                              backgroundColor: (isTriplet || isSextuplet)
                                ? (isActiveCell ? bgColor : 'rgba(26, 26, 26, 0.12)')
                                : (isActiveCell ? bgColor : 'transparent'),
                              color: txtColor,
                              border: (isTriplet || isSextuplet) ? 'none' : borderStyle,
                              borderRadius: (isTriplet || isSextuplet) ? '0' : '2px',
                              boxShadow: (!isTriplet && !isSextuplet && isActiveCell) ? '1px 1px 0px rgba(0,0,0,1)' : undefined,
                              filter: (isTriplet || isSextuplet) ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
                              clipPath: isSextuplet 
                                ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                              opacity: isGhostStep ? 0.35 : 1,
                            }}
                          >
                            <span className={isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}>
                              {displayVal}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
