/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Trash2, Unlink } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { Pattern } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { getBusColor, getContrastColor, getTopParentBusId, getTrackDisplayName } from '../utils/colorHelpers';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { DragNumberBox } from './DragNumberBox';
import { PanKnob } from './PanKnob';
import { MixerVolumeFader } from './MixerVolumeFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';
import { reverbSends, distortionSends } from '../hooks/useAudioSync';
import { MixerKnob } from './MixerKnob';
import { MixerSlantedDivider } from './MixerSlantedDivider';
import { eqNodes } from '../audio/effectsChain';
import { XiloChisel } from './XiloIcons';
import * as Tone from 'tone';
import { interpolateAutomationValue } from '../utils/automationMath';
import { getLastAudibleTick } from '../audio/visualTickBuffer';

interface MixerChannelProps {
  trackId: number;
  index: number;
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (trackId: number, patternId: number) => void;
  canPaste?: boolean;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
  linkPosition?: 'first' | 'middle' | 'last' | 'none';
  isDragOver?: boolean;
  dropIndicator?: 'left' | 'right' | null;
  activeWagonSize?: number;
  isWagonMember?: boolean;
  isDraggingWagon?: boolean;
}

const MixerChannelComponent: React.FC<MixerChannelProps> = ({
  trackId,
  index,
  onOpenDetailEditor,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste = false,
  isActive = true,
  busPosition = 'none',
  linkPosition = 'none',
  isDragOver = false,
  dropIndicator = null,
  activeWagonSize = 1,
  isWagonMember = false,
  isDraggingWagon = false,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  const storeLang = useSequencerStore(state => state.lang);
  const lang = sequencer?.lang || storeLang || 'pt';
  const track = useSequencerStore(useShallow(state => state.tracks.find(t => t.id === trackId)));
  const tracksMeta = useSequencerStore(selectTracksMeta);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const hasVolAuto = !!track?.measureVols && track.measureVols.length > 0;
  const isVolBypassed = !!track?.automationBypass?.volume;
  const isVolActive = hasVolAuto && !isVolBypassed;

  const hasPanAuto = !!track?.measurePans && track.measurePans.length > 0;
  const isPanBypassed = !!track?.automationBypass?.pan;
  const isPanActive = hasPanAuto && !isPanBypassed;

  const hasRevAuto = !!track?.measureReverbSends && track.measureReverbSends.length > 0;
  const isRevBypassed = !!track?.automationBypass?.reverb;
  const isRevActive = hasRevAuto && !isRevBypassed;

  const currentInst = track ? instrumentsConfig[track.instrumentIdx] : null;

  const eligibleTracks = currentInst ? tracksMeta.filter(t => {
    if (t.isBusFolder) return false;
    if (t.id === trackId) return false;
    if (t.linkedToTrackId && String(t.linkedToTrackId) === String(trackId)) return false;
    
    const optInst = instrumentsConfig[t.instrumentIdx];
    if (!optInst) return false;
    
    if (currentInst.id === optInst.id) return true;
    const isAlfaiaA = currentInst.path?.startsWith('Alfaia');
    const isAlfaiaB = optInst.path?.startsWith('Alfaia');
    if (isAlfaiaA && isAlfaiaB) return true;
    const isCaixaA = currentInst.id === 'caixa' || currentInst.id === 'tarol';
    const isCaixaB = optInst.id === 'caixa' || optInst.id === 'tarol';
    if (isCaixaA && isCaixaB) return true;
    const isShakeA = currentInst.type === 'shake';
    const isShakeB = optInst.type === 'shake';
    if (isShakeA && isShakeB) return true;
    
    return false;
  }) : [];

  const slaves = tracksMeta.filter(t => String(t.linkedToTrackId) === String(trackId));
  const isMaster = slaves.length > 0;
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster 
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${useNomenclatureStore.getState().getInstrumentLabel(track)} et ${slaves.map(s => useNomenclatureStore.getState().getInstrumentLabel(s)).join(', ')}`
    : undefined;
  const displayName = getTrackDisplayName(track, tracksMeta);

  const { isPlaying } = audio;

  const isEcoMode = useSequencerStore(state => state.isEcoMode);
  const isEcoModeRef = useRef(isEcoMode);
  isEcoModeRef.current = isEcoMode;

  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const totalMeasuresRef = useRef(totalMeasures);
  totalMeasuresRef.current = totalMeasures;

  const trackRef = useRef(track);
  trackRef.current = track;

  // Refs pour l'animation motorisée directe du DOM (60 FPS, Zéro Render Thrashing, Priorité GPU)
  const faderHandleRef = useRef<HTMLDivElement>(null);
  const faderTextRef = useRef<HTMLSpanElement>(null);
  const travelRangeRef = useRef<number>(90);
  const panKnobRef = useRef<SVGGElement>(null);
  const reverbGaugeRef = useRef<HTMLDivElement>(null);
  const reverbTextRef = useRef<HTMLSpanElement>(null);

  // Réinitialisation instantanée sur les positions manuelles statiques
  const resetManualPositions = (resetVol = true, resetPan = true, resetRev = true) => {
    const t = trackRef.current;
    if (!t) return;
    if (resetVol && faderHandleRef.current) {
      faderHandleRef.current.style.transform = 'translateY(0px)';
      if (faderTextRef.current) {
        faderTextRef.current.textContent = String(Math.round(t.volumeVal));
      }
    }
    if (resetPan && panKnobRef.current) {
      const manualPan = t.panVal ?? t.pan ?? 0;
      const angle = manualPan * 1.35;
      panKnobRef.current.style.transform = '';
      panKnobRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (resetRev && reverbGaugeRef.current) {
      const manualRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
      reverbGaugeRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, manualRev / 100))})`;
      if (reverbTextRef.current) {
        reverbTextRef.current.textContent = `${Math.round(manualRev)}%`;
      }
    }
  };

  useEffect(() => {
    const hasAnyAutomation = isVolActive || isPanActive || isRevActive;

    if (!isPlaying || !hasAnyAutomation || isEcoMode) {
      resetManualPositions(!isVolActive, !isPanActive, !isRevActive);
      if (!isPlaying || isEcoMode) {
        resetManualPositions(true, true, true);
      }
      return;
    }

    let rafId: number | null = null;

    const animate = () => {
      if (isEcoModeRef.current) {
        resetManualPositions(true, true, true);
        return;
      }

      const t = trackRef.current;
      if (!t) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const tick = getLastAudibleTick();
      if (tick && tick.measureDuration && tick.measureDuration > 0 && tick.measureStartTime !== undefined) {
        const audioCtxTime = Tone.context?.currentTime ?? (performance.now() / 1000);
        const elapsed = audioCtxTime - tick.measureStartTime;
        const progress = Math.max(0, Math.min(1, elapsed / tick.measureDuration));
        const currentM = tick.measure;
        const totalM = totalMeasuresRef.current || 1;
        const prevM = (currentM - 1 + totalM) % totalM;

        // 1. Fader de volume motorisé (translateY)
        if (isVolActive && t.measureVols && t.measureVols.length > 0) {
          const rawStart = t.measureVols[prevM] !== undefined ? t.measureVols[prevM] : 100;
          const rawEnd = t.measureVols[currentM] !== undefined ? t.measureVols[currentM] : 100;
          const trans = t.measureVolTransitions?.[currentM] || 'immediate';
          const interpVol = interpolateAutomationValue(rawStart, rawEnd, progress, trans);

          if (faderHandleRef.current) {
            const travel = travelRangeRef.current || 90;
            const deltaY = ((t.volumeVal - interpVol) / 100) * travel;
            faderHandleRef.current.style.transform = `translateY(${deltaY}px)`;
          }
          if (faderTextRef.current) {
            faderTextRef.current.textContent = String(Math.round(interpVol));
          }
        }

        // 2. Potentiomètre Panoramique motorisé (-135° à +135°)
        if (isPanActive && t.measurePans && t.measurePans.length > 0) {
          const manualPan = t.panVal ?? t.pan ?? 0;
          const rawStart = t.measurePans[prevM] !== undefined ? t.measurePans[prevM] : manualPan;
          const rawEnd = t.measurePans[currentM] !== undefined ? t.measurePans[currentM] : manualPan;
          const trans = t.measurePanTransitions?.[currentM] || 'immediate';
          const interpPan = interpolateAutomationValue(rawStart, rawEnd, progress, trans);

          if (panKnobRef.current) {
            const angle = interpPan * 1.35;
            panKnobRef.current.style.transform = '';
            panKnobRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
          }
        }

        // 3. Jauge Départ Réverbe motorisée (scaleX 0 à 1)
        if (isRevActive && t.measureReverbSends && t.measureReverbSends.length > 0) {
          const manualRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
          const rawStart = t.measureReverbSends[prevM] !== undefined ? t.measureReverbSends[prevM] : manualRev;
          const rawEnd = t.measureReverbSends[currentM] !== undefined ? t.measureReverbSends[currentM] : manualRev;
          const trans = t.measureReverbTransitions?.[currentM] || 'immediate';
          const interpRev = interpolateAutomationValue(rawStart, rawEnd, progress, trans);

          if (reverbGaugeRef.current) {
            const norm = Math.max(0, Math.min(1, interpRev / 100));
            reverbGaugeRef.current.style.transform = `scaleX(${norm})`;
          }
          if (reverbTextRef.current) {
            reverbTextRef.current.textContent = `${Math.round(interpRev)}%`;
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resetManualPositions(true, true, true);
    };
  }, [isPlaying, isVolActive, isPanActive, isRevActive, isEcoMode]);

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameVal, setNameVal] = useState<string>(track?.customName || '');
  useEffect(() => {
    if (track?.customName) {
      setNameVal(track.customName);
    }
  }, [track?.customName]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `track-${trackId}` });

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return null;

  const handleRenameSubmit = () => {
    if (nameVal.trim()) {
      useSequencerStore.getState().setTracks(prev => prev.map(t => t.id === trackId ? { ...t, customName: nameVal.trim() } : t));
    }
    setIsEditingName(false);
  };

  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const handleDeleteTrack = async () => {
    if (!track) return;
    const isBus = track.isLinkFolder;
    const trackName = track.customName || getTrackDisplayName(track, tracksMeta) || currentInst?.name || (lang === 'fr' ? 'la piste' : 'a faixa');
    const confirmMsg = isBus
      ? (lang === 'fr'
          ? `Supprimer définitivement le groupe "${trackName}" et toutes les pistes associées ?`
          : `Excluir definitivamente o grupo "${trackName}" e todas as faixas associadas?`)
      : (lang === 'fr'
          ? `Supprimer définitivement la piste "${trackName}" et tous ses motifs ?`
          : `Excluir definitivamente a faixa "${trackName}" e todos os seus padrões?`);

    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(trackId);
    }
  };

  const isLinkChild = !track?.isBusFolder && !!track?.linkedToTrackId;
  const isBusChild = !track?.isBusFolder && !!track?.busId && !isLinkChild;
  const isChild = !track?.isBusFolder && !!(track?.busId || track?.linkedToTrackId);
  const parentBus = isChild ? tracksMeta.find(t => String(t.id) === String(track?.busId || track?.linkedToTrackId)) : null;
  const parentBusName = parentBus ? (parentBus.customName || (parentBus.isLinkFolder ? 'ALFAIAS' : 'Bus')) : 'Bus';

  const handleDetachTrackClick = async () => {
    if (!track) return;
    const trackName = track.customName || getTrackDisplayName(track, tracksMeta) || currentInst?.name || (lang === 'fr' ? 'la piste' : 'a faixa');
    const confirmMsg = isBusChild
      ? (lang === 'fr'
          ? `Dissocier la piste "${trackName}" du bus "${parentBusName}" ?`
          : `Desvincular a faixa "${trackName}" do bus "${parentBusName}"?`)
      : (lang === 'fr'
          ? `Dissocier la piste "${trackName}" du groupe "${parentBusName}" ?`
          : `Desvincular a faixa "${trackName}" do grupo "${parentBusName}"?`);
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleDetachTrack(track.id);
    }
  };
  const onVolumeChange = (val: number) => {
    useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
  };
  const onPanChange = (val: number) => {
    useSequencerStore.getState().setTrackPan(trackId, val);
  };
  const onReverbChange = (val: number) => {
    useSequencerStore.getState().setTrackFxSend(trackId, 'reverb', val);
  };
  const onDistortionChange = (val: number) => {
    useSequencerStore.getState().setTrackFxSend(trackId, 'distortion', val);
  };

  const handleReverbAudioDrag = React.useCallback((val: number) => {
    const sendNode = reverbSends[trackId];
    if (sendNode) {
      const gain = Math.max(0.00001, val / 100);
      const targetDb = val === 0 ? -Infinity : (40 * Math.log10(gain));
      try {
        sendNode.gain.value = targetDb;
      } catch (_) {}
    }
  }, [trackId]);

  const handleDistortionAudioDrag = React.useCallback((val: number) => {
    const sendNode = distortionSends[trackId];
    if (sendNode) {
      const gain = Math.max(0.00001, val / 100);
      const targetDb = val === 0 ? -Infinity : (40 * Math.log10(gain));
      try {
        sendNode.gain.value = targetDb;
      } catch (_) {}
    }
  }, [trackId]);

  const style: React.CSSProperties = {
    transform: transform ? (
      activeWagonSize > 1 && !isWagonMember
        ? CSS.Transform.toString({
            ...transform,
            x: transform.x * activeWagonSize,
          })
        : CSS.Transform.toString(transform)
    ) : undefined,
    transition,
    opacity: isWagonMember && isDraggingWagon ? 0.25 : undefined,
  };

  // Calcul du style du grand bus externe
  const isInsideBusBlock = busPosition === 'first' || busPosition === 'middle';
  const isInsideLinkBlock = linkPosition === 'first' || linkPosition === 'middle';
  const groupStyle: React.CSSProperties = {
    marginRight: (isInsideBusBlock || isInsideLinkBlock) ? '0px' : '16px'
  };
  const topBusId = getTopParentBusId(track, tracksMeta);
  if (busPosition !== 'none' && topBusId) {
    const targetBusId = topBusId;
    const busColor = getBusColor(targetBusId, tracksMeta, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    const bgAlpha = `rgba(${r}, ${g}, ${b}, ${isDragOver ? 0.22 : (track.isLinkFolder ? 0.14 : 0.02)})`;
    const borderWidth = isDragOver ? '5px' : '3px';

    groupStyle.backgroundColor = bgAlpha;
    groupStyle.borderTop = `${borderWidth} solid ${busColor}`;
    groupStyle.borderBottom = `${borderWidth} solid ${busColor}`;

    if (busPosition === 'first') {
      groupStyle.borderLeft = `${borderWidth} solid ${busColor}`;
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'middle') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'last') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = `${borderWidth} solid ${busColor}`;
    }

    if (isDragOver) {
      groupStyle.boxShadow = `0 0 22px ${busColor}77, inset 0 0 15px ${busColor}22`;
    }
  } else if (track.isLinkFolder && busPosition === 'none') {
    const targetBusId = String(track.id);
    const busColor = getBusColor(targetBusId, tracksMeta, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    const bgAlpha = `rgba(${r}, ${g}, ${b}, ${isDragOver ? 0.25 : 0.12})`;
    const borderWidth = isDragOver ? '5px' : '3px';

    groupStyle.backgroundColor = bgAlpha;
    groupStyle.borderTop = `${borderWidth} ${isDragOver ? 'solid' : 'double'} ${busColor}`;
    groupStyle.borderBottom = `${borderWidth} ${isDragOver ? 'solid' : 'double'} ${busColor}`;
    groupStyle.borderLeft = `${borderWidth} ${isDragOver ? 'solid' : 'double'} ${busColor}`;
    groupStyle.borderRight = `${borderWidth} ${isDragOver ? 'solid' : 'double'} ${busColor}`;

    if (isDragOver) {
      groupStyle.boxShadow = `0 0 22px ${busColor}77, inset 0 0 15px ${busColor}22`;
    }
  }

  // Calcul du cadre de liaison de partition interne (Track Linking)
  const linkColor = track.isLinkFolder 
    ? getBusColor(String(track.id), tracksMeta, instrumentsConfig) 
    : (track.linkedToTrackId 
        ? getBusColor(String(track.linkedToTrackId), tracksMeta, instrumentsConfig) 
        : (inst?.color || '#8b2a1a'));

  const linkBorderWidth = isDragOver ? '4px' : '2.5px';
  const linkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '3px',
    bottom: '3px',
    left: '3px',
    right: '3px',
    pointerEvents: 'none',
    zIndex: 2,
    borderTop: `${linkBorderWidth} solid ${linkColor}`,
    borderBottom: `${linkBorderWidth} solid ${linkColor}`,
  };

  if (linkPosition === 'first') {
    linkStyle.borderLeft = `${linkBorderWidth} solid ${linkColor}`;
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'middle') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'last') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = `${linkBorderWidth} solid ${linkColor}`;
  } else if (linkPosition === 'none' && (!track.isBusFolder || track.isLinkFolder)) {
    linkStyle.borderLeft = `${linkBorderWidth} solid ${linkColor}`;
    linkStyle.borderRight = `${linkBorderWidth} solid ${linkColor}`;
  }

  if (isDragOver && linkPosition !== 'none') {
    linkStyle.boxShadow = `0 0 12px ${linkColor}66`;
  }

  const faderColor = track.isLinkFolder 
    ? getBusColor(String(track.id), tracksMeta, instrumentsConfig) 
    : (inst.color || '#8b2a1a');

  const faderTextColor = getContrastColor(faderColor);

  const hasOuterBorder = busPosition === 'none';
  const hasGroupBorder = busPosition !== 'none' && (track.isLinkFolder || track.busId);
  const borderThicknessTop = (hasOuterBorder || hasGroupBorder) ? (isDragOver ? 5 : 3) : 0;
  const borderThicknessBottom = (hasOuterBorder || hasGroupBorder) ? (isDragOver ? 5 : 3) : 0;
  const paddingTop = Math.max(0, 3 - borderThicknessTop);
  const paddingBottom = Math.max(0, 3 - borderThicknessBottom);

  const lowCut = track.lowCut ?? false;
  const eq = track.eqBands ?? {
    low: { f: 100, g: 0 },
    mid: { f: 1000, g: 0, q: 'wide' },
    high: { f: 8000, g: 0 }
  };

  const isEQModified = eq.low.g !== 0 || eq.low.f !== 100 ||
                      eq.mid.g !== 0 || eq.mid.f !== 1000 ||
                      eq.high.g !== 0 || eq.high.f !== 8000;

  const handleLowCutToggle = () => {
    useSequencerStore.getState().handleTrackLowCutToggle(trackId);
  };

  const handleEQChange = (bands: Partial<typeof eq>) => {
    useSequencerStore.getState().handleTrackEQChange(trackId, bands);
  };

  const handleEQReset = () => {
    if (isEQModified) {
      useSequencerStore.getState().handleTrackEQReset(trackId);
    }
  };

  const handleHFAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.high.frequency.value = val; } catch (_) {}
    }
  };
  const handleHGAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.high.gain.value = val; } catch (_) {}
    }
  };
  const handleMFAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.mid.frequency.value = val; } catch (_) {}
    }
  };
  const handleMGAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.mid.gain.value = val; } catch (_) {}
    }
  };
  const handleLFAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.low.frequency.value = val; } catch (_) {}
    }
  };
  const handleLGAudioDrag = (val: number) => {
    const node = eqNodes[trackId];
    if (node) {
      try { node.low.gain.value = val; } catch (_) {}
    }
  };

    const isMuted = getEffectiveMuteState(tracksMeta, trackId);
  return (
    <div 
      ref={setNodeRef}
      data-track-id={trackId}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[115px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-hidden relative transition-all duration-300 ${
        isMuted ? 'opacity-50 bg-black/5 dark:bg-white/5' : (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-100')
      } ${busPosition === 'none' ? 'cordel-border' : ''}`}
      style={{
        ...style,
        ...groupStyle,
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${12 + paddingBottom}px`,
        zIndex: isDragging ? 50 : (isDragOver ? 20 : 1),
        '--fader-thumb-bg': faderColor,
        '--fader-thumb-border': 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      {(linkPosition !== 'none' || !track.isBusFolder) && (
        <div style={linkStyle} className="rounded-sm" />
      )}
      {dropIndicator === 'left' && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />
      )}
      {dropIndicator === 'right' && (
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />
      )}
      {/* Niveau 6 (Tout en haut) : En-tête */}
      <div 
        className="relative p-1.5 pb-1 flex flex-col gap-1 border-b-[3px] border-[var(--cordel-border)] h-[76px] shrink-0 justify-between w-full"
        style={{ zIndex: 10 }}
      >
        {/* Outils */}
        <div className="flex justify-between items-center w-full">
          <div 
            {...attributes}
            {...listeners}
            className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
            title={lang === 'fr' ? "Glisser pour réorganiser" : "Arrastar para reordenar"}
          >
            <GripHorizontal size={18} />
          </div>
          <div className="flex items-center gap-1">
            {isChild && (
              <button 
                onClick={handleDetachTrackClick} 
                className="w-6 h-6 bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[#b23b25] hover:text-[#f4ecd8] text-sm"
                title={isBusChild
                  ? (lang === 'fr' ? `Dissocier du bus "${parentBusName}"` : `Desvincular do bus "${parentBusName}"`)
                  : (lang === 'fr' ? `Dissocier du groupe "${parentBusName}"` : `Desvincular do grupo "${parentBusName}"`)}
              >
                <Unlink size={13} />
              </button>
            )}
            <button 
              onClick={handleDeleteTrack} 
              className="w-6 h-6 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-sm"
              title={track?.isLinkFolder ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o grupo') : (lang === 'fr' ? 'Supprimer la piste' : 'Excluir a faixa')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Instrument Selector / Dropdown Trigger */}
        <div className="relative flex items-center w-full">
          {track?.isLinkFolder ? (
            isEditingName ? (
              <input
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="font-cactus font-bold text-[9px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-0.5 flex-1 outline-none w-full"
                autoFocus
              />
            ) : (
              <div 
                onClick={() => useSequencerStore.getState().handleToggleFoldBus(String(trackId))}
                className="flex items-center gap-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-1 py-1 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-center font-bold text-[9px]"
              >
                <span className="font-cactus truncate">{track.isFolded ? '▼' : '▶'} {track.customName || 'Bus'}</span>
              </div>
            )
          ) : (
            <div 
              onClick={() => onOpenDetailEditor(trackId)} 
              className="flex items-center gap-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-1 py-1 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors w-full justify-between"
              title={linkedSlavesTooltip || displayName}
            >
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain flex-shrink-0" />
                <span className="font-cactus font-bold text-[9px] truncate">{displayName}</span>
              </div>
              <XiloChisel size={10} className="opacity-70 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Inner Controls Stack (Responsive / Elastic Vertical Layout) */}
      <div className="flex-1 flex flex-col p-1.5 gap-1.5 justify-start items-center w-full min-h-0 overflow-hidden">
        
        {/* Section EQ */}
        <div className="w-full flex flex-col shrink-0">
          <div className="w-full flex flex-col gap-1 shrink px-0.5">
            {/* Reset button row */}
            <div className="flex justify-end w-full">
              <button
                onClick={handleEQReset}
                className={`w-5 h-5 flex items-center justify-center cordel-border-sm transition-colors rounded-sm ${
                  isEQModified 
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] hover:opacity-90' 
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/30 border-[var(--cordel-border)]/20 cursor-default opacity-55'
                }`}
                title="Reset EQ"
                disabled={!isEQModified}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" />
                </svg>
              </button>
            </div>

            {/* HF / HG in diagonal */}
            <div className="flex justify-between w-full items-start">
              <MixerKnob 
                label="HF" 
                min={4000} 
                max={16000} 
                step={100} 
                value={eq.high.f} 
                unit="Hz" 
                size={30}
                color="#3d8b85"
                onChange={(v) => handleEQChange({ high: { f: v, g: eq.high.g } })} 
                onAudioDrag={handleHFAudioDrag}
              />
              <div className="pt-2">
                <MixerKnob 
                  label="HG" 
                  min={-15} 
                  max={15} 
                  step={1} 
                  value={eq.high.g} 
                  unit="dB" 
                  size={30}
                  isGain={true}
                  onChange={(v) => handleEQChange({ high: { f: eq.high.f, g: v } })} 
                  onAudioDrag={handleHGAudioDrag}
                />
              </div>
            </div>

            <MixerSlantedDivider />

            {/* MF / MG in diagonal, Q button under MF */}
            <div className="flex justify-between w-full items-start">
              <div className="flex flex-col items-center gap-1.5">
                <MixerKnob 
                  label="MF" 
                  min={250} 
                  max={4000} 
                  step={50} 
                  value={eq.mid.f} 
                  unit="Hz" 
                  size={30}
                  color="#d4af37"
                  onChange={(v) => handleEQChange({ mid: { f: v, g: eq.mid.g, q: eq.mid.q } })} 
                  onAudioDrag={handleMFAudioDrag}
                />
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => handleEQChange({ mid: { ...eq.mid, q: eq.mid.q === 'narrow' ? 'wide' : 'narrow' } })}
                    className={`w-6 h-3.5 text-[7px] font-black cordel-border-sm flex items-center justify-center transition-colors rounded-sm ${
                      eq.mid.q === 'narrow' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                    }`}
                  >
                    {eq.mid.q === 'narrow' ? 'N' : 'W'}
                  </button>
                  <span className="text-[5.5px] font-black opacity-40 uppercase tracking-wide mt-0.5">Q</span>
                </div>
              </div>
              <div className="pt-2">
                <MixerKnob 
                  label="MG" 
                  min={-15} 
                  max={15} 
                  step={1} 
                  value={eq.mid.g} 
                  unit="dB" 
                  size={30}
                  isGain={true}
                  onChange={(v) => handleEQChange({ mid: { f: eq.mid.f, g: v, q: eq.mid.q } })} 
                  onAudioDrag={handleMGAudioDrag}
                />
              </div>
            </div>

            <MixerSlantedDivider />

            {/* LF / LG in diagonal */}
            <div className="flex justify-between w-full items-start">
              <MixerKnob 
                label="LF" 
                min={50} 
                max={250} 
                step={5} 
                value={eq.low.f} 
                unit="Hz" 
                size={30}
                color="#8b2a1a"
                onChange={(v) => handleEQChange({ low: { f: v, g: eq.low.g } })} 
                onAudioDrag={handleLFAudioDrag}
              />
              <div className="pt-2">
                <MixerKnob 
                  label="LG" 
                  min={-15} 
                  max={15} 
                  step={1} 
                  value={eq.low.g} 
                  unit="dB" 
                  size={30}
                  isGain={true}
                  onChange={(v) => handleEQChange({ low: { f: eq.low.f, g: v } })} 
                  onAudioDrag={handleLGAudioDrag}
                />
              </div>
            </div>

            <MixerSlantedDivider />

            {/* Low-Cut Button Row */}
            <div className="flex justify-between w-full items-center">
              <button 
                onClick={handleLowCutToggle}
                className={`w-6 h-6 cordel-border-sm flex items-center justify-center p-0.5 transition-colors rounded-sm ${
                  lowCut ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                }`}
                title="Low Cut 80Hz"
              >
                <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-95 pointer-events-none">
                  <path d="M 2 14 L 10 3 L 22 3" />
                </svg>
              </button>
              <span className="text-[6.5px] font-black opacity-35 uppercase tracking-widest pr-2 select-none">80Hz</span>
            </div>
          </div>
        </div>

        {/* Section FX */}
        <div className="w-full flex flex-col gap-1.5 px-0.5 shrink-0">
          <DragNumberBox 
            label="Dst" 
            value={track.fxSends?.distortion ?? 0} 
            onChange={onDistortionChange}
            onAudioDrag={handleDistortionAudioDrag}
            fillColor="var(--disto-color)"
            className="w-full text-[8px] px-1 py-0.5 shrink"
          />
          <div className="relative w-full">
            <DragNumberBox 
              label="Rev" 
              value={track.fxSends?.reverb ?? track.reverbVal ?? 0} 
              onChange={onReverbChange}
              onAudioDrag={handleReverbAudioDrag}
              disabled={isRevActive}
              gaugeRef={reverbGaugeRef}
              valueTextRef={reverbTextRef}
              fillColor="var(--reverb-color)"
              className={`w-full text-[8px] px-1 py-0.5 shrink transition-opacity ${
                isRevActive ? 'opacity-50 pointer-events-none' : ''
              }`}
            />
            {hasRevAuto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'reverb');
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                  isRevActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220] shadow-xs hover:bg-[#a83220]'
                    : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through hover:text-gray-200'
                }`}
                title={isRevActive ? "Automation Réverbe active (cliquer pour débrayer)" : "Automation Réverbe débrayée (cliquer pour activer)"}
              >
                A
              </button>
            )}
          </div>
        </div>

        {/* Section PAN */}
        <div className="w-full flex flex-col items-center shrink-0">
          <div className="w-full border-t border-[var(--cordel-border)]/20 my-0.5 shrink-0" />
          <div className="relative flex items-center justify-center w-full">
            {hasPanAuto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'pan');
                }}
                className={`absolute left-1 top-0 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                  isPanActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220] shadow-xs hover:bg-[#a83220]'
                    : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through hover:text-gray-200'
                }`}
                title={isPanActive ? "Automation Pan active (cliquer pour débrayer)" : "Automation Pan débrayée (cliquer pour activer)"}
              >
                A
              </button>
            )}
            <div className={`transition-opacity ${isPanActive ? 'opacity-50 pointer-events-none' : ''}`}>
              <PanKnob 
                trackId={trackId}
                value={track.panVal ?? track.pan ?? 0} 
                onChange={onPanChange}
                label="PAN"
                showLabels={false}
                panKnobRef={panKnobRef}
              />
            </div>
          </div>
        </div>

        {/* Section VOL */}
        <div className="w-full flex flex-col flex-grow min-h-[60px] overflow-hidden">
          <div className="relative flex-grow flex-1 min-h-[60px] h-auto flex justify-center gap-2 items-stretch w-full py-1 overflow-hidden">
            {hasVolAuto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  useSequencerStore.getState().toggleTrackAutomationBypass(track.id, 'volume');
                }}
                className={`absolute top-0.5 left-1 z-20 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                  isVolActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220] shadow-xs hover:bg-[#a83220]'
                    : 'bg-black/40 text-gray-400 border border-dashed border-gray-600 line-through hover:text-gray-200'
                }`}
                title={isVolActive ? "Automation Volume active (cliquer pour débrayer)" : "Automation Volume débrayée (cliquer pour activer)"}
              >
                A
              </button>
            )}
            <div className={`flex flex-col items-center flex-1 h-full min-w-0 transition-opacity ${
              isVolActive ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <MixerVolumeFader
                trackId={trackId}
                value={track.volumeVal}
                onChange={onVolumeChange}
                faderColor={faderColor}
                textColor={faderTextColor}
                faderHandleRef={faderHandleRef}
                valueTextRefProp={faderTextRef}
                travelRangeRef={travelRangeRef}
              />
            </div>
            <div className="flex flex-col items-center w-5 h-full justify-center">
              <VUMeter
                trackId={trackId}
                instrumentId={inst.id}
                isPlaying={isPlaying && isActive}
                isActive={isActive}
                orientation="vertical"
                className="w-2 h-full bg-[var(--cordel-bg)] cordel-border-sm"
              />
            </div>
          </div>
        </div>

        {/* Niveau 1 (Tout en bas) : Mute & Solo - fixed size */}
        <div className="flex gap-1.5 w-full justify-center shrink-0 border-t border-[var(--cordel-border)]/20 pt-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Mute"
          >
            M
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Solo"
          >
            S
          </button>
        </div>
      </div>
    </div>
  );
};

export const MixerChannel = React.memo(MixerChannelComponent);
