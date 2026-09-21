import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, getVisualStrokeSymbol, isDarkText } from '../data';
import { useSequencerStore, isToadaBus } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useWindow } from '../contexts/WindowContext';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { getBusColor, getTopParentBusId } from '../utils/colorHelpers';

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
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
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
  const sequencer = useSequencer();
  const { handleTrackStepValueChange, alertAsync } = sequencer;
  const audio = useAudio();
  const lang = useSequencerStore(state => state.lang);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const isMaster = useSequencerStore(state => state.tracks.some(t => String(t.linkedToTrackId) === String(trackId)));
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);

  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const onHideToggle = () => {
    useSequencerStore.getState().handleTrackHideToggle(trackId);
  };
  const onOpenDetailEditorClick = () => {
    onOpenDetailEditor(trackId);
  };

  const handleDeleteTrack = async () => {
    if (!track) return;
    const isBus = track.isBusFolder;
    const childTracks = tracks.filter(t => String(t.busId) === String(trackId));
    const inst = instrumentsConfig[track.instrumentIdx];
    const trackDisplayName = track.customName || inst?.name || (lang === 'fr' ? 'cette piste' : 'esta faixa');

    let confirmMsg: string;
    if (isBus && childTracks.length > 0) {
      confirmMsg = lang === 'fr'
        ? `Attention : le bus "${trackDisplayName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?`
        : `Atenção: o bus "${trackDisplayName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`;
    } else {
      confirmMsg = lang === 'fr'
        ? `Supprimer définitivement la piste "${trackDisplayName}" et tous ses motifs ?`
        : `Excluir definitivamente a faixa "${trackDisplayName}" e todos os seus padrões?`;
    }

    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(trackId);
    }
  };

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

  const handleStepClick = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number | [string, string]) => {
    e.stopPropagation();
    if (!activePattern || !inst || !track) return;
    const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
    const primaryVisualVal = Array.isArray(visualVal) ? visualVal[0] : visualVal;
    
    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        activePattern.id,
        stepIdx,
        inst.id,
        primaryVisualVal,
        (newVal) => {
          handleTrackStepValueChange(track.id, activePattern.id, stepIdx, newVal);
        },
        track.id
      );
    } else {
      const nextVisualVal = getNextStepValue(inst.id, inst.type, primaryVisualVal);
      const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
      const nextSemanticStr = Array.isArray(nextSemanticVal) ? nextSemanticVal[0] : nextSemanticVal;
      handleTrackStepValueChange(track.id, activePattern.id, stepIdx, String(nextSemanticStr));
    }
  };

  const topBusId = useMemo(() => {
    if (!track) return null;
    return getTopParentBusId(track, tracks);
  }, [track, tracks]);

  const busColor = useMemo(() => {
    if (!topBusId) return null;
    return getBusColor(topBusId, tracks, instrumentsConfig);
  }, [topBusId, tracks]);

  const isChild = useMemo(() => {
    if (!track) return false;
    return !!((track.busId || track.linkedToTrackId) && !track.isBusFolder);
  }, [track]);

  const parentBus = useMemo(() => {
    if (!track || !isChild) return null;
    const pId = track.busId || track.linkedToTrackId;
    return tracks.find(t => String(t.id) === String(pId)) || null;
  }, [track, isChild, tracks]);

  const parentBusName = useMemo(() => {
    if (!parentBus) return 'Bus';
    if (parentBus.customName) return parentBus.customName;
    if (parentBus.isLinkFolder) return 'ALFAIAS';
    const parentInst = instrumentsConfig[parentBus.instrumentIdx];
    return parentInst ? parentInst.name : 'Bus';
  }, [parentBus]);




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
    : (inst ? (isMaster ? `🔗 ${getPluralName(inst.name)}` : (track ? useNomenclatureStore.getState().getInstrumentLabel(track) : inst.name)) : 'Instrument');

  const isAoVivo = track ? activeAoVivoTrackId === track.id : false;
  const toggleAoVivo = async () => {
    if (!track) return;
    if (useSequencerStore.getState().isEcoMode) {
      const msg = lang === 'pt' 
        ? "Modo de economia ativado: As animações (AoVivo) foram desativadas para preservar o desempenho."
        : "Mode éco activé : Les animations (AoVivo) ont été désactivées pour préserver les performances.";
      await alertAsync(msg);
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
        borderLeft: busColor ? `4px solid ${busColor}` : '4px solid #1a1a1a',
        zIndex: 10,
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
            title={lang === 'fr' ? "Glisser pour réorganiser" : "Arrastar para reordenar"}
          >
            <GripVertical size={16} />
          </div>

          <div className="relative flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (track.isBusFolder && !isToada && !track.isLinkFolder && !track.linkedToTrackId) {
                  useSequencerStore.getState().handleToggleFoldBus(String(track.id));
                  return;
                }
                let targetId = track.id;
                if (track.isLinkFolder) {
                   const masterTrack = tracks.find(t => String(t.linkedToTrackId) === String(track.id) && t.isLinkMaster);
                   if (masterTrack) targetId = masterTrack.id;
                } else if (isToada) {
                   const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
                   if (coro) targetId = coro.id;
                }
                onOpenDetailEditor(targetId);
              }}
              className="flex items-center gap-2 cordel-border-sm cordel-button px-2 py-1 text-xs cursor-pointer transition-colors w-[145px] h-[44px] min-h-[44px] shrink-0"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
              title={lang === 'pt' ? 'Editar instrumento' : 'Éditer l\'instrument'}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex flex-col justify-center flex-1 min-w-0 text-left">
                {isChild && parentBusName && (
                  <span 
                    className="text-[8px] uppercase tracking-wider opacity-75 leading-tight truncate block"
                    style={{ color: inst.colors.text }}
                  >
                    🔗 {parentBusName}
                  </span>
                )}
                <span className="text-xs font-cactus font-black leading-tight truncate block">
                  {index + 1}. {displayName}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTrack();
              }}
              className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
              title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}
            >
              <Trash2 size={12} />
            </button>
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
              title={lang === 'fr' ? "Masquer la piste" : "Ocultar pista"}
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
                handleTrackStepValueChange(track.id, activePattern.id, stepIdx, val);
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
