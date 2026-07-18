import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, getVisualStrokeSymbol, isDarkText } from '../data';
import { useSequencerStore, isToadaBus } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { XiloChisel } from './XiloIcons';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { getNextStepValue } from '../utils/instrumentStrokes';

interface TrackMixerProps {
  trackId: number;
  index: number;
  totalTracks: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
  isDragOver?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  isMobile?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void,
    trackId?: number
  ) => void;
}

const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  trackId,
  index,
  totalTracks,
  onOpenDetailEditor,
  isActive = true,
  isDragOver = false,
  dropIndicator = null,
  isMobile = false,
  onStepTouchStart,
}) => {
  const lang = useSequencerStore(state => state.lang);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const isMaster = useSequencerStore(state => state.tracks.some(t => String(t.linkedToTrackId) === String(trackId)));
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const isPlaying = useSequencerStore(state => state.isPlaying);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);

  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(trackId, instIdx);
  };
  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const onHideToggle = () => {
    useSequencerStore.getState().handleTrackHideToggle(trackId);
  };
  const onDelete = () => {
    useSequencerStore.getState().handleTrackDelete(trackId);
  };
  const onOpenDetailEditorClick = () => {
    onOpenDetailEditor(trackId);
  };

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const isToada = track ? isToadaBus(track) : false;

  const activeChildTrack = useMemo(() => {
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
  }, [isToada, tracks, currentMeasure]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

  const activePattern = useMemo(() => {
    if (!effectiveTrack) return null;
    const override = effectiveTrack.patternOverrides?.[currentMeasure];
    if (override === null) return null;
    if (override !== undefined) {
      return effectiveTrack.patterns?.find(p => p.id === override) || null;
    }
    return effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
  }, [effectiveTrack, currentMeasure]);

  const cellRefs = useRef<Record<number, HTMLInputElement>>({});
  const lastActiveStepRef = useRef<number>(-1);

  const registerStepRef = (stepIdx: number, el: HTMLInputElement | null) => {
    if (el) {
      cellRefs.current[stepIdx] = el;
    } else {
      delete cellRefs.current[stepIdx];
    }
  };

  useEffect(() => {
    if (isTracksCollapsed || !isMobile) {
      if (lastActiveStepRef.current !== -1) {
        const lastIdx = lastActiveStepRef.current;
        if (cellRefs.current[lastIdx]) {
          const el = cellRefs.current[lastIdx];
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }
        lastActiveStepRef.current = -1;
      }
      return;
    }

    const handleTick = (detail: { step: number; ratio?: number }) => {
      const ratio = detail.ratio ?? 0;
      if (!activePattern) return;
      const targetStep = Math.floor(ratio * activePattern.steps);
      const lastStep = lastActiveStepRef.current;

      if (targetStep === lastStep) return;

      if (lastStep !== -1 && cellRefs.current[lastStep]) {
        const prevEl = cellRefs.current[lastStep];
        prevEl.style.boxShadow = '';
        prevEl.style.borderColor = '';
      }

      if (cellRefs.current[targetStep]) {
        const newEl = cellRefs.current[targetStep];
        newEl.style.boxShadow = '0 0 10px #b23b25';
        newEl.style.borderColor = '#b23b25';
      }

      lastActiveStepRef.current = targetStep;
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (lastActiveStepRef.current !== -1) {
        const lastIdx = lastActiveStepRef.current;
        if (cellRefs.current[lastIdx]) {
          const el = cellRefs.current[lastIdx];
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }
      }
    };
  }, [isTracksCollapsed, isMobile, activePattern]);

  const handleStepClick = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number) => {
    e.stopPropagation();
    if (!activePattern || !inst || !track) return;
    const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
    
    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        activePattern.id,
        stepIdx,
        inst.id,
        visualVal,
        (newVal) => {
          useSequencerStore.getState().handleTrackStepValueChange(track.id, activePattern.id, stepIdx, newVal);
        },
        track.id
      );
    } else {
      const nextVisualVal = getNextStepValue(inst.id, inst.type, visualVal);
      const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
      useSequencerStore.getState().handleTrackStepValueChange(track.id, activePattern.id, stepIdx, String(nextSemanticVal));
    }
  };

  const slaves = tracks.filter(t => String(t.linkedToTrackId) === String(trackId));
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster && inst
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${inst.name.replace('Alfaia ', '')} et ${slaves.map(s => instrumentsConfig[s.instrumentIdx]?.name.replace('Alfaia ', '')).join(', ')}`
    : undefined;
  const displayName = isToada
    ? 'Toada'
    : (inst ? (isMaster ? `🔗 ${getPluralName(inst.name)}` : inst.name) : 'Instrument');

  const isAoVivo = track ? activeAoVivoTrackId === track.id : false;
  const toggleAoVivo = () => {
    if (!track) return;
    if (useSequencerStore.getState().isEcoMode) {
      alert("Mode Éco activé : Les animations d'instruments (AoVivo) ont été désactivées pour préserver les performances.");
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track ? `track-${track.id}` : 'track-temp' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!track || !inst) return null;

  const isUnfolded = isMobile && !isTracksCollapsed;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col relative transition-all duration-300 w-full justify-center border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 ${
        isUnfolded ? 'h-auto min-h-[156px] py-2' : 'h-[76px] min-h-[76px] py-1'
      } ${
        isDragOver ? 'ring-4 ring-[var(--cordel-wood)] shadow-[0_0_20px_var(--cordel-wood)] z-30 scale-[1.01] border-[var(--cordel-wood)]' : ''
      }`}
      style={{
        ...style,
        zIndex: instDropdownOpen ? 9999 : 10,
        '--cordel-bg': '#f4ecd8',
        '--cordel-text': '#1a1a1a',
        '--cordel-border': '#1a1a1a',
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': '#1a1a1a',
      } as React.CSSProperties}
    >
      {dropIndicator === 'top' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />
      )}
      {dropIndicator === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />
      )}
      <div className="flex justify-between items-center relative z-[2]">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mr-2 transition-colors p-1 touch-none flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)]"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>

          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={() => setInstDropdownOpen(!instDropdownOpen)}
              className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[11px] cursor-pointer transition-colors w-[110px] sm:w-[120px]"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
              title={linkedSlavesTooltip}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-cactus font-bold text-center leading-[1.1] flex-1">
                {index + 1}. {displayName.split(' ')[0]}
                {displayName.indexOf(' ') !== -1 && <><br/>{displayName.substring(displayName.indexOf(' ') + 1)}</>}
              </span>
              <span className="text-[8px] flex-shrink-0">▼</span>
            </button>
            {/* 1. Éditeur détaillé pour les pistes normales (non esclaves, hors Toada) */}
            {onOpenDetailEditor && !track.isBusFolder && !track.linkedToTrackId && !isToada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetailEditor(track.id); 
                }}
                className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]"
                title={lang === 'pt' ? 'Editor detalhado' : 'Éditeur détaillé'}
              >
                <XiloChisel size={13} />
              </button>
            )}

            {/* 2. Éditeur Master pour les pistes esclaves ou dossiers de liens */}
            {(track.isLinkFolder || (track.linkedToTrackId && !track.isLinkFolder)) && (() => {
              const masterTrack = track.isLinkFolder
                ? tracks.find(t => String(t.linkedToTrackId) === String(track.id) && t.isLinkMaster)
                : (track.linkedToTrackId ? tracks.find(t => t.id === parseInt(track.linkedToTrackId!, 10)) : null);
              const masterId = masterTrack?.id;
              if (masterId === undefined) return null;

              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetailEditor(masterId);
                  }}
                  className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]"
                  title={lang === 'pt' ? 'Editar instrument principal (Master)' : 'Éditer l\'instrument maître (Master)'}
                >
                  <XiloChisel size={13} />
                </button>
              );
            })()}

            {/* 3. Exception Toada -> Ouvre l'éditeur de la piste 'Coro' */}
            {isToada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
                  if (coro) {
                    onOpenDetailEditor(coro.id);
                  }
                }}
                className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]"
                title={lang === 'pt' ? 'Editor de vozes (Coro)' : 'Éditeur de voix (Chœur)'}
              >
                <XiloChisel size={13} />
              </button>
            )}

            {/* 4. Bouton plier/déplier pour les dossiers de bus normaux (hors Toada, hors dossiers de liens) */}
            {track.isBusFolder && !isToada && !track.isLinkFolder && !track.linkedToTrackId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => {
                    useSequencerStore.getState().handleToggleFoldBus(String(track.id));
                  }, 10);
                }}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-xs"
                title={track.isFolded ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
              >
                {track.isFolded ? '▼' : '▶'}
              </button>
            )}

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onInstrumentChange(oIdx);
                      setInstDropdownOpen(false);
                    }}
                    className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
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
                    const isBus = track.isBusFolder;
                    const childTracks = tracks.filter(t => String(t.busId) === String(trackId));
                    if (isBus && childTracks.length > 0) {
                      const confirmMsg = lang === 'fr' 
                        ? "Attention, si vous supprimez ce bus, toutes les pistes audio qui sont à l'intérieur seront supprimées également. Voulez-vous continuer ?" 
                        : lang === 'pt'
                        ? "Atenção: se você excluir este bus, todas as pistas de áudio dentro dele também serão excluídas. Deseja continuar?"
                        : "Warning: if you delete this bus, all audio tracks inside will also be deleted. Do you want to continue?";
                      if (!window.confirm(confirmMsg)) return;
                    }
                    onDelete();
                    setInstDropdownOpen(false);
                  }}
                  className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
                >
                  <span className="w-5 text-center">✕</span>
                  <span>{lang === 'fr' ? 'Supprimer la piste' : lang === 'pt' ? 'Excluir pista' : 'Delete track'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >S</button>
          
          {inst.id !== 'apito' && (
            <button
              onClick={toggleAoVivo}
              className={`w-6 h-6 cordel-border-sm cordel-button font-bold cursor-pointer transition-all flex items-center justify-center ${
                isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title={inst.type === 'voice' ? (lang === 'fr' ? 'Karaoké (Live)' : 'Karaokê (Ao Vivo)') : "Ao Vivo (Live POV)"}
            >
              {inst.type === 'voice' ? (
                <span className="text-xs leading-none">🎤</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M11 22 L5 6" />
                  <circle cx="4" cy="3" r="2.5" fill="currentColor" />
                  <path d="M13 22 L19 6" />
                  <circle cx="20" cy="3" r="2.5" fill="currentColor" />
                </svg>
              )}
            </button>
          )}

          {inst.id !== 'apito' && (
            <button
              onClick={onHideToggle}
              className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
                track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title="Ocultar pista"
            >
              {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          {inst.id === 'apito' && (
            <>
              <div className="w-6 h-6 pointer-events-none"></div>
              <div className="w-6 h-6 pointer-events-none"></div>
            </>
          )}
        </div>
      </div>

      {isUnfolded && activePattern && (
        <div className="mt-2 w-full select-none relative z-[2]">
          <CompactPatternRenderer
            pattern={activePattern}
            inst={inst}
            isLeftHanded={isLeftHanded}
            isEditable={true}
            isFluid={true}
            className="w-full mb-0"
            isLinkFolder={track.isLinkFolder}
            tracks={tracks}
            trackId={String(track.id)}
            readOnly={false}
            registerStepRef={registerStepRef}
            onStepClick={(e, stepIdx, val) => handleStepClick(e, stepIdx, val)}
            onStepValueChange={(stepIdx, val) => {
              if (activePattern) {
                useSequencerStore.getState().handleTrackStepValueChange(track.id, activePattern.id, stepIdx, val);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export const TrackMixer = React.memo(TrackMixerComponent, (prevProps, nextProps) => {
  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof TrackMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') continue;
    if (key === 'trackId') continue;
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
