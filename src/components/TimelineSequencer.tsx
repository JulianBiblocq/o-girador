/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { TrackGroup, Language, TimeSignature, SongSection, PresetMetadata, RhythmSignal } from '../types';
import { ASSETS_BASE_URL, instrumentsConfig, getMaxTicks, getMarkers } from '../data';

interface TimelineSequencerProps {
  lang: Language;
  tracks: TrackGroup[];
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
  isMobile: boolean;
  onMuteToggle: (trackId: number) => void;
  onSoloToggle: (trackId: number) => void;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null, measureIdx: number) => void;
  onNavigate: (measureIdx: number, stepIdx: number, steps: number) => void;
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp')[];
  onMeasureTimeSigChange: (measureIdx: number, val: TimeSignature) => void;
  onMeasureBpmChange: (measureIdx: number, val: number) => void;
  onMeasureTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
  onMeasureVolChange: (measureIdx: number, val: number) => void;
  onMeasureVolTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
  onTotalMeasuresChange: (val: number) => void;
  songSections: SongSection[];
  copiedSection: { length: number; name: string; color: string } | null;
  onCreateSection: (name: string, start: number, end: number, color?: string) => void;
  onUpdateSection: (id: string, name: string, start: number, end: number, color?: string) => void;
  onDeleteSection: (id: string) => void;
  onCopySection: (section: SongSection) => void;
  onPasteSection: (destStartMeasure: number) => void;
  metadata?: PresetMetadata;
  letras: string;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  onSetLoopStart: (measureIdx: number) => void;
  onSetLoopEnd: (measureIdx: number) => void;
  onClearLoop: () => void;
  measureWidth: number;
  onMeasureWidthChange: (width: number) => void;
  onDeleteMeasure?: (measureIdx: number) => void;
  onInsertMeasure?: (measureIdx: number) => void;
  measureSignals?: (string | null)[];
  onMeasureSignalChange?: (measureIdx: number, signalId: string | null) => void;
  rhythmSignals?: RhythmSignal[];
}

const HEADER_W = 180;

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

export const TimelineSequencer: React.FC<TimelineSequencerProps> = ({
  lang,
  tracks,
  isPlaying,
  currentStepIndex,
  currentMeasure,
  maxTicks,
  totalMeasures,
  isMobile,
  onMuteToggle,
  onSoloToggle,
  onPatternAssignForMeasure,
  onNavigate,
  measureTimeSigs,
  measureBpms,
  measureBpmTransitions,
  measureVols,
  measureVolTransitions,
  onMeasureTimeSigChange,
  onMeasureBpmChange,
  onMeasureTransitionChange,
  onMeasureVolChange,
  onMeasureVolTransitionChange,
  onTotalMeasuresChange,
  songSections,
  copiedSection,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onCopySection,
  onPasteSection,
  metadata,
  letras,
  loopStartMeasure,
  loopEndMeasure,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  measureWidth,
  onMeasureWidthChange,
  onDeleteMeasure,
  onInsertMeasure,
  measureSignals = [],
  onMeasureSignalChange,
  rhythmSignals = [],
}) => {
  const MEASURE_W = measureWidth;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Song Section modals state
  const [sectionModalOpen, setSectionModalOpen] = React.useState<boolean>(false);
  const [editingSection, setEditingSection] = React.useState<SongSection | null>(null);
  const [sectionFormName, setSectionFormName] = React.useState<string>('');
  const [sectionFormStart, setSectionFormStart] = React.useState<number>(1);
  const [sectionFormEnd, setSectionFormEnd] = React.useState<number>(4);
  const [sectionFormColor, setSectionFormColor] = React.useState<string>('#f19066');
  const [hoveredPasteMeasure, setHoveredPasteMeasure] = React.useState<number | null>(null);
  const [signalDropdownOpen, setSignalDropdownOpen] = React.useState<number | null>(null);

  // Tablature state
  const [tablatureModalOpen, setTablatureModalOpen] = React.useState<boolean>(false);
  const [selectedTracksForTab, setSelectedTracksForTab] = React.useState<number[]>([]);
  const [includeVocalsInTab, setIncludeVocalsInTab] = React.useState<boolean>(true);

  // Sync selected tracks for tablature
  React.useEffect(() => {
    if (tracks.length > 0 && selectedTracksForTab.length === 0) {
      setSelectedTracksForTab(tracks.map(t => t.id));
    }
  }, [tracks]);

  const generateTablatureData = () => {
    const systemsCount = Math.ceil(totalMeasures / 4);
    const systems = [];

    for (let s = 0; s < systemsCount; s++) {
      const startM = s * 4;
      const endM = Math.min(startM + 3, totalMeasures - 1);
      
      const systemTracks = tracks
        .filter(t => selectedTracksForTab.includes(t.id))
        .map(t => {
          const inst = instrumentsConfig[t.instrumentIdx];
          const measuresData: string[] = [];

          for (let m = startM; m <= endM; m++) {
            const activePtn = t.patterns.find(p => p.measureAssignments[m]);
            const stepsCount = activePtn ? activePtn.steps : 16;
            
            let measureStr = '';
            for (let stepIdx = 0; stepIdx < stepsCount; stepIdx++) {
              if (activePtn) {
                const val = activePtn.activeSteps[stepIdx];
                if (val === 0 || val === '0' || !val) {
                  measureStr += '-';
                } else {
                  if (inst.type === 'gongue') {
                    if (val === 'GRV') measureStr += 'G';
                    else if (val === 'grv') measureStr += 'g';
                    else if (val === 'AIG') measureStr += 'A';
                    else if (val === 'aig') measureStr += 'a';
                    else measureStr += String(val);
                  } else if (inst.type === 'voice') {
                    const syl = activePtn.lyrics?.[stepIdx];
                    if (syl && syl.trim() !== '') {
                      measureStr += syl.trim();
                    } else {
                      measureStr += String(val);
                    }
                  } else {
                    measureStr += String(val);
                  }
                }
              } else {
                measureStr += '-';
              }
              if (stepIdx < stepsCount - 1) {
                measureStr += '.';
              }
            }
            measuresData.push(measureStr);
          }

          return {
            trackId: t.id,
            instName: inst.name,
            iconImg: inst.iconImg,
            measures: measuresData,
            instType: inst.type
          };
        });

      systems.push({
        systemIdx: s,
        startM: startM + 1,
        endM: endM + 1,
        tracksData: systemTracks
      });
    }

    return systems;
  };

  const renderTablaturePreview = () => {
    const data = generateTablatureData();
    const songName = metadata?.toada || (lang === 'fr' ? 'Rythme Maracatu' : 'Ritmo de Maracatu');
    const author = metadata?.compositor || 'Traditionnel';
    const nacao = metadata?.nacao || '';
    const ritmo = metadata?.ritmo || '';

    return (
      <div id="print-tablature-area" className="bg-white text-black p-5 font-mono text-[11px] leading-tight flex flex-col gap-5 w-full h-full overflow-y-auto print:max-h-none print:overflow-visible shadow-inner">
        {/* Partition Header */}
        <div className="flex flex-col items-center text-center border-b-[2px] border-black pb-3">
          <h1 className="font-sans font-bold text-2xl uppercase tracking-wider text-black">{songName}</h1>
          <p className="text-sm font-sans mt-1 text-black">
            {ritmo && <span className="font-bold">{ritmo}</span>}
            {nacao && <span> — Nação {nacao}</span>}
          </p>
          <p className="text-[10px] font-sans opacity-70 mt-1 text-black">
            {lang === 'fr' ? 'Composé par' : 'Composto por'} : {author}
          </p>
        </div>

        {/* Systems */}
        <div className="flex flex-col gap-5 flex-grow">
          {data.map((sys, sysIdx) => (
            <div key={sysIdx} className="flex flex-col gap-1.5 pb-3 border-b border-dashed border-black/20 last:border-0">
              <div className="text-[9px] font-sans font-bold opacity-60 text-right text-black">
                {lang === 'fr' 
                  ? `Mesures ${sys.startM} à ${sys.endM}`
                  : `Compassos ${sys.startM} a ${sys.endM}`}
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-black tab-system-table font-mono text-[12px]">
                  <tbody>
                    {sys.tracksData.map((tData) => (
                      <tr key={tData.trackId} className="tab-system-row border-0">
                        <td className="w-[120px] tab-inst-name font-sans font-bold shrink-0 truncate uppercase text-[10px] text-black pr-2 align-middle">
                          {tData.instName} :
                        </td>
                        {tData.measures.map((mStr, mIdx) => {
                          const steps = mStr.split('.');
                          return (
                            <React.Fragment key={mIdx}>
                              <td className="tab-barline opacity-40 font-mono text-[12px] text-black text-center px-0.5 align-middle select-none">
                                |
                              </td>
                              {steps.map((stepVal, stepIdx) => (
                                <td 
                                  key={stepIdx} 
                                  className="tab-step-cell text-center font-mono font-extrabold text-[12px] text-black px-1 align-middle"
                                >
                                  {stepVal}
                                </td>
                              ))}
                              {mIdx === tData.measures.length - 1 && (
                                <td className="tab-barline opacity-40 font-mono text-[12px] text-black text-center px-0.5 align-middle select-none">
                                  |
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Lyrics (Toada) */}
        {letras && letras.trim() !== '' && (
          <div className="border-t-[2px] border-black pt-4 mt-3 print:page-break-before-avoid text-black">
            <h3 className="font-sans font-bold text-xs uppercase mb-2 text-black">{lang === 'fr' ? 'Paroles (Toada)' : 'Letra (Toada)'} :</h3>
            <pre className="font-sans text-xs whitespace-pre-wrap leading-relaxed italic border-l-2 border-black/30 pl-3 text-black">
              {letras}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const isScrubbing = useRef(false);
  const propsRef = useRef({ totalMeasures, measureTimeSigs, onNavigate });
  
  useEffect(() => {
    propsRef.current = { totalMeasures, measureTimeSigs, onNavigate };
  });

  const handleRulerClickOrDrag = (clientX: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left - HEADER_W + scrollRef.current.scrollLeft;
    const { totalMeasures: tMeasures, measureTimeSigs: mSigs, onNavigate: navigateFn } = propsRef.current;
    
    if (relativeX < 0) {
      navigateFn(0, 0, 16);
      return;
    }
    
    const measureIdx = Math.floor(relativeX / MEASURE_W);
    if (measureIdx >= tMeasures) {
      const lastMeasureIdx = tMeasures - 1;
      const mTimeSig = mSigs[lastMeasureIdx] || '4/4';
      const steps = mTimeSig === '6/8' || mTimeSig === '12/8' ? 24 : 16;
      navigateFn(lastMeasureIdx, steps - 1, steps);
      return;
    }
    
    const mTimeSig = mSigs[measureIdx] || '4/4';
    const steps = mTimeSig === '6/8' || mTimeSig === '12/8' ? 24 : 16;
    const xInMeasure = relativeX - measureIdx * MEASURE_W;
    const ratio = Math.max(0, Math.min(1, xInMeasure / MEASURE_W));
    const stepIdx = Math.floor(ratio * steps);
    
    navigateFn(measureIdx, stepIdx, steps);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Clic gauche uniquement
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < HEADER_W) return; // Clic sur en-tête d'instruments, ignoré
    
    isScrubbing.current = true;
    handleRulerClickOrDrag(e.clientX);
    e.preventDefault();
  };

  const handleRulerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    if (clickX < HEADER_W) return;
    
    isScrubbing.current = true;
    handleRulerClickOrDrag(touch.clientX);
    e.preventDefault();
  };

  const currentMeasureSig = measureTimeSigs[currentMeasure] || '4/4';
  const currentMeasureTicks = getMaxTicks(currentMeasureSig);
  const tickPos = currentStepIndex >= 0 ? currentStepIndex : 0;
  const playheadX = currentMeasure * MEASURE_W + (tickPos / currentMeasureTicks) * MEASURE_W;

  // Total scrollable content width (excluding sticky header column)
  const totalContentW = totalMeasures * MEASURE_W;

  // 1. Mouse wheel horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // 2. Drag-scroll and Scrubbing global handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing.current) {
        handleRulerClickOrDrag(e.clientX);
      } else if (isDragging.current && scrollRef.current) {
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; // Défilement avec multiplicateur
        scrollRef.current.scrollLeft = startScrollLeft.current - walk;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScrubbing.current) {
        const touch = e.touches[0];
        handleRulerClickOrDrag(touch.clientX);
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing.current) {
        isScrubbing.current = false;
      }
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
      }
    };

    const handleTouchEnd = () => {
      if (isScrubbing.current) {
        isScrubbing.current = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!isPlaying || currentStepIndex < 0) {
      if (currentStepIndex === -1) el.scrollLeft = 0;
      return;
    }
    const vw = el.clientWidth - HEADER_W;
    if (vw <= 0) return;
    el.scrollLeft = Math.max(0, playheadX - vw * 0.4);
  }, [currentStepIndex, currentMeasure, isPlaying, playheadX]);



  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none">
      {/* Séquenceur Title Sub-header with Partition Export Button */}
      <div className="h-10 border-b-2 border-[var(--cordel-border)] px-4 flex items-center justify-between shrink-0 bg-[var(--cordel-bg)] z-10">
        <span className="font-cactus font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5">
          <span>🎞️ {lang === 'fr' ? 'Séquenceur Linéaire' : 'Sequenciador Linear'}</span>
        </span>

        {/* Zoom & Loop Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <span className="text-[10px] uppercase font-bold text-[var(--cordel-text)]/70">{lang === 'fr' ? 'Zoom' : 'Zoom'} :</span>
          <button
            onClick={() => onMeasureWidthChange(Math.max(240, measureWidth - 60))}
            disabled={measureWidth <= 240}
            className={`font-bold text-[10px] md:text-xs px-2 py-0.5 rounded cordel-border-sm hover:opacity-85 transition-opacity cursor-pointer shadow-[1.5px_1.5px_0_var(--cordel-border)] font-sans ${
              measureWidth <= 240 ? 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            }`}
            title={lang === 'fr' ? 'Zoom arrière' : 'Reduzir zoom'}
          >
            ➖
          </button>
          <button
            onClick={() => onMeasureWidthChange(Math.min(960, measureWidth + 60))}
            disabled={measureWidth >= 960}
            className={`font-bold text-[10px] md:text-xs px-2 py-0.5 rounded cordel-border-sm hover:opacity-85 transition-opacity cursor-pointer shadow-[1.5px_1.5px_0_var(--cordel-border)] font-sans ${
              measureWidth >= 960 ? 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            }`}
            title={lang === 'fr' ? 'Zoom avant' : 'Ampliar zoom'}
          >
            ➕
          </button>

          {/* Loop indicator and Clear Button */}
          {loopStartMeasure !== null && loopEndMeasure !== null && (
            <div className="flex items-center gap-1.5 ml-4 bg-[#8b2a1a]/10 border border-[#8b2a1a]/40 px-2 py-0.5 rounded cordel-border-sm">
              <span className="text-[9px] md:text-[10px] uppercase font-bold text-[#8b2a1a]">
                🔁 {lang === 'fr' ? `Boucle: M. ${loopStartMeasure + 1}-${loopEndMeasure + 1}` : `Loop: Comp. ${loopStartMeasure + 1}-${loopEndMeasure + 1}`}
              </span>
              <button
                onClick={onClearLoop}
                className="text-[#8b2a1a] hover:text-[#a63320] font-bold text-[10px] ml-1.5 cursor-pointer"
                title={lang === 'fr' ? 'Effacer la boucle' : 'Limpar loop'}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setTablatureModalOpen(true)}
          className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] md:text-xs px-2.5 py-0.5 md:py-1 rounded cordel-border-sm hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-1 shadow-[1.5px_1.5px_0_var(--cordel-border)] font-sans"
          title={lang === 'fr' ? 'Extraction de la tablature' : 'Extrair partitura'}
        >
          <span>📋</span>
          <span>{lang === 'fr' ? 'Exporter la partition (TAB)' : 'Exportar partitura (TAB)'}</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-grow overflow-x-auto overflow-y-auto relative custom-scrollbar"
      >
        {/* 
          We use a single wrapper with explicit width so the ruler row and
          every track row share the same coordinate space.
        */}
        <div style={{ width: `${HEADER_W + totalContentW + 150}px`, minHeight: '100%' }} className="relative">

          {/* ══════════ SECTIONS ROW ══════════ */}
          <div
            className="flex h-10 border-b border-[var(--cordel-border)]/30 bg-[var(--cordel-bg)]/80 relative"
            style={{ width: `${HEADER_W + totalContentW + 150}px` }}
          >
            {/* Sticky header */}
            <div
              className="sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between px-3 font-cactus text-[11px] font-bold uppercase shrink-0"
              style={{ width: HEADER_W, minWidth: HEADER_W }}
            >
              <span>{lang === 'fr' ? 'Sections' : 'Seções'}</span>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setSectionFormName(lang === 'fr' ? 'Partie A' : 'Parte A');
                  setSectionFormStart(1);
                  setSectionFormEnd(Math.min(4, totalMeasures));
                  setSectionFormColor('#f19066');
                  setSectionModalOpen(true);
                }}
                className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] px-1.5 py-0.5 rounded cordel-border-sm hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center gap-0.5"
                title={lang === 'fr' ? 'Créer une section' : 'Criar seção'}
              >
                <span>➕</span>
                <span>{lang === 'fr' ? 'Sect.' : 'Seção'}</span>
              </button>
            </div>

            {/* Space where sections will render */}
            <div className="flex-grow relative h-full">
              {songSections.map((section) => {
                const startX = section.startMeasure * MEASURE_W;
                const width = (section.endMeasure - section.startMeasure + 1) * MEASURE_W;

                return (
                  <div
                    key={section.id}
                    className="absolute top-1 bottom-1 flex items-center justify-between px-3 text-xs font-bold rounded cordel-border-sm select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                    style={{
                      left: `${startX}px`,
                      width: `${width - 8}px`, // 4px margin left & right
                      marginLeft: '4px',
                      backgroundColor: section.color || '#eaddcf',
                      color: '#1a1a1a', // Toujours lisible en noir sur fond coloré
                      borderColor: '#1a1a1a',
                      borderWidth: '1.5px',
                    }}
                  >
                    <span className="truncate max-w-[50%] font-cactus uppercase tracking-wider">{section.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopySection(section);
                        }}
                        className="bg-white/80 hover:bg-white text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer font-sans"
                        title={lang === 'fr' ? 'Copier le bloc' : 'Copiar bloco'}
                      >
                        📋 Copier
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSection(section);
                          setSectionFormName(section.name);
                          setSectionFormStart(section.startMeasure + 1);
                          setSectionFormEnd(section.endMeasure + 1);
                          setSectionFormColor(section.color || '#f19066');
                          setSectionModalOpen(true);
                        }}
                        className="bg-white/80 hover:bg-white text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                        title={lang === 'fr' ? 'Modifier' : 'Editar'}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                        className="bg-red-800/80 hover:bg-red-800 text-white text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                        title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Paste buttons in the sections bar */}
              {copiedSection && Array.from({ length: totalMeasures }).map((_, mIdx) => {
                const startX = mIdx * MEASURE_W;
                return (
                  <button
                    key={`paste-sec-${mIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPasteSection(mIdx);
                    }}
                    onMouseEnter={() => setHoveredPasteMeasure(mIdx)}
                    onMouseLeave={() => setHoveredPasteMeasure(null)}
                    className="absolute top-1 bottom-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 font-sans font-bold text-[9px] px-2 rounded border border-dashed border-emerald-600 flex items-center justify-center gap-1 cursor-pointer z-30 transition-all hover:scale-105 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]"
                    style={{
                      left: `${startX + 4}px`,
                      width: `${Math.min(100, MEASURE_W - 8)}px`,
                    }}
                    title={lang === 'fr' ? `Coller à la mesure ${mIdx + 1}` : `Colar no compasso ${mIdx + 1}`}
                  >
                    📋 {lang === 'fr' ? `Coller M.${mIdx + 1}` : `Colar C.${mIdx + 1}`}
                  </button>
                );
              })}

              {/* Ghost preview block */}
              {copiedSection && hoveredPasteMeasure !== null && (
                (() => {
                  const startX = hoveredPasteMeasure * MEASURE_W;
                  const width = copiedSection.length * MEASURE_W;
                  return (
                    <div
                      className="absolute top-1 bottom-1 flex items-center justify-between px-3 text-xs font-bold rounded border border-dashed pointer-events-none opacity-50 z-20 animate-pulse"
                      style={{
                        left: `${startX}px`,
                        width: `${width - 8}px`,
                        marginLeft: '4px',
                        backgroundColor: copiedSection.color || '#f19066',
                        color: '#1a1a1a',
                        borderColor: '#1a1a1a',
                        borderWidth: '1.5px',
                      }}
                    >
                      <span className="truncate max-w-[80%] font-cactus uppercase tracking-wider">
                        {copiedSection.name} ({lang === 'fr' ? 'Aperçu' : 'Prévia'})
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* ══════════ RULER ROW ══════════ */}
          <div
            className="flex min-h-16 h-auto border-b-2 border-[var(--cordel-border)] sticky top-0 z-30 bg-[var(--cordel-bg)] cursor-pointer select-none"
            style={{ width: `${HEADER_W + totalContentW + 150}px` }}
            onMouseDown={handleRulerMouseDown}
            onTouchStart={handleRulerTouchStart}
          >
             {/* Sticky corner */}
             <div
               className="sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center px-3 font-cactus text-sm font-bold uppercase"
               style={{ width: HEADER_W, minWidth: HEADER_W }}
             >
               <span>{lang === 'fr' ? 'Instruments' : 'Instrumentos'}</span>
             </div>

            {/* Measure labels */}
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              const mTimeSig = measureTimeSigs[mIdx] || '4/4';
              const mBpm = measureBpms[mIdx] || 100;
              const mTransition = measureBpmTransitions[mIdx] || 'immediate';
              const mVol = measureVols[mIdx] !== undefined ? measureVols[mIdx] : 100;
              const mVolTransition = measureVolTransitions[mIdx] || 'immediate';
              const localBeats = mTimeSig === '3/4' || mTimeSig === '6/8' ? 3 : mTimeSig === '2/4' ? 2 : mTimeSig === '12/8' ? 12 : 4;

              const isInLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;

              return (
                <div
                  key={mIdx}
                  className={`border-r border-[var(--cordel-border)]/30 flex flex-col justify-between px-2 py-1 text-[10px] font-bold relative transition-all ${
                    isInLoop
                      ? 'bg-blue-600/5 border-t-4 border-t-blue-600/80 dark:border-t-blue-500/80'
                      : ''
                  }`}
                  style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                >
                  <div className="flex flex-wrap items-center justify-between w-full mt-0.5 gap-x-2 gap-y-1">
                    <span className="font-cactus text-xs tracking-wide flex items-center gap-1.5 shrink-0">
                      <span>{lang === 'fr' ? 'M.' : 'C.'} {mIdx + 1}</span>
                      
                      {/* Loop Delimiters */}
                      <div className="flex gap-0.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetLoopStart(mIdx);
                          }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${
                            loopStartMeasure === mIdx 
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'
                          }`}
                          title={lang === 'fr' ? 'Définir comme début de boucle' : 'Definir como início do loop'}
                        >
                          [
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetLoopEnd(mIdx);
                          }}
                          className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${
                            loopEndMeasure === mIdx 
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'
                          }`}
                          title={lang === 'fr' ? 'Définir comme fin de boucle' : 'Definir como fim do loop'}
                        >
                          ]
                        </button>
                      </div>

                      {/* Measure Insertion / Deletion */}
                      <div className="flex gap-0.5 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertMeasure && onInsertMeasure(mIdx);
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded bg-emerald-600/10 text-emerald-700 hover:bg-emerald-700 hover:text-white border border-emerald-600/30 transition-colors font-bold text-[9px] cursor-pointer"
                          title={lang === 'fr' ? 'Insérer une mesure avant' : 'Inserir compasso antes'}
                        >
                          ➕
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(lang === 'fr' ? `Supprimer la mesure ${mIdx + 1} ?` : `Excluir o compasso ${mIdx + 1} ?`)) {
                              onDeleteMeasure && onDeleteMeasure(mIdx);
                            }
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded bg-rose-600/10 text-rose-700 hover:bg-rose-700 hover:text-white border border-rose-600/30 transition-colors font-bold text-[9px] cursor-pointer"
                          title={lang === 'fr' ? 'Supprimer la mesure' : 'Excluir compasso'}
                        >
                          ✕
                        </button>
                      </div>

                    </span>

                    <div 
                      className="flex items-center gap-1.5"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                    >
                      {/* Signature rythmique */}
                      <select
                        value={mTimeSig}
                        onChange={e => onMeasureTimeSigChange(mIdx, e.target.value as TimeSignature)}
                        className="bg-[var(--cordel-bg)] text-[9px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px outline-none cursor-pointer"
                        style={{ height: '18px' }}
                      >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                        <option value="12/8">12/8</option>
                      </select>

                      {/* BPM Input */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[8px] opacity-75">BPM:</span>
                        <input
                          type="number"
                          min={40}
                          max={240}
                          value={mBpm}
                          onChange={e => onMeasureBpmChange(mIdx, Math.round(Number(e.target.value)))}
                          className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                      </div>

                      {/* Transition Toggle */}
                      <button
                        onClick={() => onMeasureTransitionChange(mIdx, mTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Rampe)' : 'Transição progressiva (Rampa)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mTransition === 'ramp' ? (
                          <span className="text-amber-600 dark:text-amber-500 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>

                      {/* Vol Input */}
                      <div className="flex items-center gap-0.5 ml-1.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <span className="text-[8px] opacity-75 font-cactus">VOL:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={mVol}
                          onChange={e => onMeasureVolChange(mIdx, Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))}
                          className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                        <span className="text-[8px] opacity-75">%</span>
                      </div>

                      {/* Vol Transition Toggle */}
                      <button
                        onClick={() => onMeasureVolTransitionChange(mIdx, mVolTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mVolTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Fade)' : 'Transição progressiva (Fade)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mVolTransition === 'ramp' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex w-full opacity-50 text-[8px] pb-0.5">
                    {Array.from({ length: localBeats }).map((_, b) => (
                      <span
                        key={b}
                        className="text-left pl-1 border-l border-[var(--cordel-border)]/10"
                        style={{ width: `${100 / localBeats}%` }}
                      >
                        {b + 1}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Measure Button */}
            <div
              className="flex items-center justify-start px-4 z-40 bg-[var(--cordel-bg)] border-r border-[var(--cordel-border)]/30"
              style={{ width: 150, minWidth: 150 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onTotalMeasuresChange(Math.min(64, totalMeasures + 1))}
                className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center gap-1 w-full"
                title={lang === 'fr' ? 'Ajouter une mesure' : 'Adicionar compasso'}
                style={{ height: '28px' }}
              >
                <span>➕</span>
                <span>{lang === 'fr' ? 'Mesure' : 'Compasso'}</span>
              </button>
            </div>
          </div>

          {/* ══════════ SIGNAUX DU RYTHME ROW ══════════ */}
          {rhythmSignals.length > 0 && (
            <div
              className="flex border-b border-[var(--cordel-border)]/20 h-14"
              style={{ width: `${HEADER_W + totalContentW + 150}px` }}
            >
              {/* Sticky header */}
              <div
                className="sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center px-3 py-1 gap-2"
                style={{ width: HEADER_W, minWidth: HEADER_W }}
              >
                <span className="text-base">🥁</span>
                <span className="font-cactus text-xs font-bold uppercase tracking-wider text-[var(--cordel-text)]">
                  {lang === 'fr' ? 'Signaux' : 'Sinais'}
                </span>
              </div>

              {/* Measure signal cells */}
              {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                const sigId = measureSignals[mIdx] ?? null;
                const activeSig = rhythmSignals.find(s => s.id === sigId) || null;
                const isCurrentMeasure = mIdx === currentMeasure;

                return (
                  <div
                    key={mIdx}
                    className={`relative border-r border-[var(--cordel-border)]/20 flex items-center justify-center ${
                      isCurrentMeasure ? 'bg-[var(--cordel-border)]/10' : ''
                    }`}
                    style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                  >
                    {activeSig ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--cordel-border)]/20 hover:bg-[var(--cordel-border)]/40 transition-colors rounded text-[9px] font-bold text-[var(--cordel-text)] max-w-full"
                        title={activeSig.name}
                      >
                        {activeSig.image ? (
                          <img src={activeSig.image} alt={activeSig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                        ) : (
                          <span className="text-[12px] flex-shrink-0 leading-none">📢</span>
                        )}
                        <span className="truncate max-w-[70px]">{activeSig.name}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-dashed border-[var(--cordel-border)]/30 rounded text-[10px] font-bold hover:bg-[var(--cordel-border)]/20 hover:text-[var(--cordel-text)] transition-colors cursor-pointer"
                        title={lang === 'fr' ? 'Assigner un signal' : 'Atribuir um sinal'}
                      >
                        +
                      </button>
                    )}

                    {/* Dropdown de sélection */}
                    {signalDropdownOpen === mIdx && (
                      <div
                        className="absolute top-full left-0 z-50 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-lg min-w-[140px] flex flex-col py-1"
                        style={{ marginTop: 2 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Aucun signal */}
                        <button
                          onClick={() => {
                            onMeasureSignalChange?.(mIdx, null);
                            setSignalDropdownOpen(null);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left"
                        >
                          <span className="text-xs opacity-50">✕</span>
                          <span className="opacity-70">{lang === 'fr' ? 'Aucun' : 'Nenhum'}</span>
                        </button>
                        <div className="border-t border-[var(--cordel-border)]/20 my-0.5" />
                        {rhythmSignals.map(sig => (
                          <button
                            key={sig.id}
                            onClick={() => {
                              onMeasureSignalChange?.(mIdx, sig.id);
                              setSignalDropdownOpen(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left ${
                              sigId === sig.id ? 'bg-[var(--cordel-border)]/30' : ''
                            }`}
                          >
                            {sig.image ? (
                              <img src={sig.image} alt={sig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                            ) : (
                              <span className="text-[12px] w-6 h-6 flex items-center justify-center bg-black/10 rounded flex-shrink-0 leading-none">📢</span>
                            )}
                            <span className="truncate">{sig.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Spacer */}
              <div style={{ width: 150, minWidth: 150 }} />
            </div>
          )}

          {/* ══════════ TRACK ROWS ══════════ */}
          {tracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const hasSolo = tracks.some(t => t.isSolo);
            const isMutedBySolo = hasSolo && !track.isSolo;
            const canPlay = !track.isMute && !isMutedBySolo;

            return (
              <div
                key={track.id}
                className={`flex border-b border-[var(--cordel-border)]/20 h-16 transition-opacity duration-150 ${
                  !canPlay ? 'opacity-50' : ''
                }`}
                style={{ width: `${HEADER_W + totalContentW}px` }}
              >
                {/* ── Sticky track header ── */}
                <div
                  className="sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between px-3 py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)]"
                  style={{ width: HEADER_W, minWidth: HEADER_W }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                      alt={inst.name}
                      className="w-8 h-8 object-contain filter invert-[var(--cordel-invert)] dark:invert-0"
                    />
                    <span className="font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider">
                      {inst.name}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onMuteToggle(track.id)}
                      className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isMute ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Mute"
                    >M</button>
                    <button
                      onClick={() => onSoloToggle(track.id)}
                      className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isSolo ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Solo"
                    >S</button>
                  </div>
                </div>

                {/* ── Measure cells ── */}
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const activePattern = track.patterns.find(p => p.measureAssignments[mIdx]);
                  const steps = activePattern ? activePattern.steps : 16;

                  return (
                    <div
                      key={mIdx}
                      className={`h-full border-r border-[var(--cordel-border)]/20 relative cursor-pointer ${
                        loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure
                          ? 'bg-blue-600/[0.03]'
                          : ''
                      }`}
                      style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / MEASURE_W));
                        onNavigate(mIdx, Math.floor(ratio * steps), steps);
                      }}
                    >
                      {/* Pattern selector */}
                      <div
                        className="absolute top-1 left-1 z-20"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                      >
                        <select
                          value={activePattern ? String(activePattern.id) : 'silence'}
                          onChange={e => {
                            const v = e.target.value;
                            onPatternAssignForMeasure(
                              track.id,
                              v === 'silence' ? null : Number(v),
                              mIdx,
                            );
                          }}
                          className="bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] text-[10px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-1 py-px outline-none cursor-pointer tracking-wider uppercase max-w-[125px] leading-tight"
                          style={{ fontSize: '10px', height: '22px' }}
                        >
                          <option value="silence">
                            {lang === 'fr' ? '— Silence' : '— Silêncio'}
                          </option>
                          {track.patterns.map((p, pidx) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.vocalMode === 'micro' ? '🎙️ ' : ''}{p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {activePattern && activePattern.vocalMode === 'micro' && (
                        <div className="absolute bottom-1.5 right-1.5 bg-[#27ae60] text-white border border-black/20 font-sans font-bold text-[8px] px-1 py-px rounded-sm z-20 pointer-events-none select-none flex items-center gap-0.5 shadow-sm">
                          🎙️ MIC
                        </div>
                      )}

                      {/* Cell content */}
                      {!activePattern ? (
                        /* Silence hatching */
                        <div
                          className="w-full h-full opacity-15"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                            backgroundSize: '10px 10px',
                          }}
                        />
                      ) : (
                        /* Steps grid */
                        <div className="flex h-full w-full">
                          {Array.from({ length: steps }).map((_, sIdx) => {
                            const val = activePattern.activeSteps[sIdx];
                            const display = getDisplayVal(val);
                            const isActive = val !== 0 && val !== '';
                            const mMaxTicks = getMaxTicks(measureTimeSigs[mIdx] || '4/4');
                            const isCurrent =
                              isPlaying &&
                              currentMeasure === mIdx &&
                              Math.floor((tickPos / mMaxTicks) * steps) === sIdx;

                            let style: React.CSSProperties = {
                              width: `${MEASURE_W / steps}px`,
                            };
                            if (isActive) {
                              const bg = inst.colors[val as string] || '#111';
                              let fg = inst.colors.text || '#f4ecd8';
                              if (inst.id === 'gongue' && (val === 'AIG' || val === 'aig')) fg = '#000';
                              style = { ...style, backgroundColor: bg, color: fg };
                            }

                            return (
                              <div
                                key={sIdx}
                                className={`h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center ${
                                  isCurrent
                                    ? 'outline outline-2 outline-amber-500 z-10 bg-[var(--cordel-text)]/15'
                                    : ''
                                }`}
                                style={style}
                              >
                                {inst.type === 'voice' ? (
                                  <div className="flex flex-col items-center justify-center leading-none px-0.5 overflow-hidden w-full h-full">
                                    <span className="text-[9px] font-bold uppercase opacity-75">
                                      {val === 'P' ? 'PUX' : val === 'C' ? 'CORO' : ''}
                                    </span>
                                    <span className="text-[11px] font-cactus font-bold truncate max-w-full">
                                      {activePattern.lyrics?.[sIdx] || ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[13px] font-extrabold tracking-wide">
                                    {display}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ══════════ PLAYHEAD ══════════ */}
          {currentStepIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
              style={{ left: `${HEADER_W + playheadX}px` }}
            />
          )}
        </div>
      </div>

      {/* Bottom legend */}
      {!isMobile && (
        <div className="h-8 border-t border-[var(--cordel-border)] flex items-center justify-center px-4 bg-[var(--cordel-bg)] text-[10px] font-bold opacity-80 uppercase tracking-widest gap-4 shrink-0">
          <span>💡 {lang === 'fr'
            ? 'Cliquer-glisser sur la règle ou utiliser la molette pour défiler · Cliquer sur la timeline pour naviguer'
            : 'Clique e arraste na régua ou use o scroll para navegar · Clique na timeline para navegar'}</span>
        </div>
      )}

      {/* ══════════ SECTION FORM MODAL ══════════ */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-[360px] bg-[#f4ecd8] text-[#1a1a1a] p-5 cordel-border-sm shadow-2xl flex flex-col gap-4">
            <h3 className="font-cactus text-xl font-bold uppercase border-b border-[#1a1a1a] pb-2 text-[#1a1a1a]">
              {editingSection 
                ? (lang === 'fr' ? 'Modifier la Section' : 'Editar Seção')
                : (lang === 'fr' ? 'Créer une Section' : 'Criar Seção')}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#1a1a1a]">{lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}</label>
              <input
                type="text"
                value={sectionFormName}
                onChange={(e) => setSectionFormName(e.target.value)}
                placeholder="Ex: Partie A / Refrain"
                className="w-full bg-[#eaddcf] border-2 border-[#1a1a1a] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[#eaddcf]/80 text-[#1a1a1a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[#1a1a1a]">{lang === 'fr' ? 'Début (Mesure)' : 'Compasso inicial'}</label>
                <input
                  type="number"
                  min={1}
                  max={totalMeasures}
                  value={sectionFormStart}
                  onChange={(e) => setSectionFormStart(Math.max(1, Math.min(totalMeasures, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#eaddcf] border-2 border-[#1a1a1a] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[#1a1a1a]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[#1a1a1a]">{lang === 'fr' ? 'Fin (Mesure)' : 'Compasso final'}</label>
                <input
                  type="number"
                  min={sectionFormStart}
                  max={totalMeasures}
                  value={sectionFormEnd}
                  onChange={(e) => setSectionFormEnd(Math.max(sectionFormStart, Math.min(totalMeasures, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#eaddcf] border-2 border-[#1a1a1a] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[#1a1a1a]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#1a1a1a]">{lang === 'fr' ? 'Couleur du bloc' : 'Cor do bloco'}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { value: '#e08283', label: 'Rouge' },
                  { value: '#f19066', label: 'Orange' },
                  { value: '#f5cd79', label: 'Jaune' },
                  { value: '#55efc4', label: 'Vert d\'eau' },
                  { value: '#74b9ff', label: 'Bleu pastel' },
                  { value: '#a29bfe', label: 'Violet doux' },
                  { value: '#eaddcf', label: 'Cordel beige' }
                ].map((colorOpt) => (
                  <button
                    key={colorOpt.value}
                    onClick={() => setSectionFormColor(colorOpt.value)}
                    className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${
                      sectionFormColor === colorOpt.value ? 'scale-115 ring-2 ring-amber-600' : 'opacity-85'
                    }`}
                    style={{ backgroundColor: colorOpt.value }}
                    title={colorOpt.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 border-t border-[#1a1a1a] pt-3">
              <button
                onClick={() => setSectionModalOpen(false)}
                className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-[#1a1a1a] text-xs font-bold cordel-border-sm cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button
                onClick={() => {
                  if (!sectionFormName.trim()) return;
                  if (editingSection) {
                    onUpdateSection(editingSection.id, sectionFormName, sectionFormStart - 1, sectionFormEnd - 1, sectionFormColor);
                  } else {
                    onCreateSection(sectionFormName, sectionFormStart - 1, sectionFormEnd - 1, sectionFormColor);
                  }
                  setSectionModalOpen(false);
                }}
                className="px-4 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
              >
                {lang === 'fr' ? 'Valider' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TABLATURE EXPORT MODAL ══════════ */}
      {tablatureModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-[850px] max-w-[95%] h-[80vh] bg-[#f4ecd8] text-[#1a1a1a] p-5 cordel-border-sm shadow-2xl flex flex-col md:flex-row gap-5 overflow-hidden">
            {/* Left Sidebar: configuration */}
            <div className="w-full md:w-[220px] shrink-0 flex flex-col gap-4">
              <h3 className="font-cactus text-lg font-bold uppercase border-b border-[#1a1a1a] pb-2 text-[#1a1a1a]">
                {lang === 'fr' ? 'Configuration' : 'Configuração'}
              </h3>
              
              {/* Checkboxes list */}
              <div className="flex-grow flex flex-col gap-2 bg-[#eaddcf] p-3 cordel-border-sm overflow-y-auto">
                <div className="border-b border-[#1a1a1a]/30 pb-2 mb-1.5 flex justify-between text-[10px] font-cactus uppercase text-[#1a1a1a]">
                  <span>{lang === 'fr' ? 'Pistes à inclure :' : 'Instrumentos :'}</span>
                </div>
                <div className="flex flex-col gap-2 text-xs text-[#1a1a1a]">
                  {tracks.map(t => {
                    const inst = instrumentsConfig[t.instrumentIdx];
                    const isChecked = selectedTracksForTab.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedTracksForTab(selectedTracksForTab.filter(x => x !== t.id));
                            } else {
                              setSelectedTracksForTab([...selectedTracksForTab, t.id]);
                            }
                          }}
                          className="accent-[#1a1a1a]"
                        />
                        <img src={ASSETS_BASE_URL + inst.iconImg} alt="" className="w-5 h-5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0" />
                        <span className="truncate">{inst.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🖨️ {lang === 'fr' ? 'Imprimer (A4)' : 'Imprimir (A4)'}
                </button>
                <button
                  onClick={() => setTablatureModalOpen(false)}
                  className="w-full py-2 bg-gray-300 hover:bg-gray-400 text-[#1a1a1a] text-xs font-bold cordel-border-sm transition-colors cursor-pointer"
                >
                  {lang === 'fr' ? 'Fermer' : 'Fechar'}
                </button>
              </div>
            </div>

            {/* Right Zone: print preview */}
            <div className="flex-grow flex flex-col overflow-hidden bg-white p-1 rounded-sm border border-[#1a1a1a]/20">
              {renderTablaturePreview()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
