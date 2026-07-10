/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GripHorizontal, Trash2, Edit2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TrackGroup } from '../types';
import { useAudioStore } from '../stores/useAudioStore';
import { getBusColor, getContrastColor } from '../utils/colorHelpers';
import { DragNumberBox } from './DragNumberBox';
import { HorizontalPanFader } from './HorizontalPanFader';
import { PanKnob } from './PanKnob';
import { MixerVolumeFader } from './MixerVolumeFader';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { VisualOnlyTimeline } from './VisualOnlyTimeline';
import { reverbSends, distortionSends, subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { MixerKnob } from './MixerKnob';
import { MixerSlantedDivider } from './MixerSlantedDivider';
import { eqNodes } from '../audio/effectsChain';

interface MixerFolderBusProps {
  trackId: number;
  index: number;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
  isCompact?: boolean;
}

const MixerFolderBusComponent: React.FC<MixerFolderBusProps> = ({
  trackId,
  index,
  isActive = true,
  busPosition = 'none',
  isCompact = false,
}) => {
  const audio = useAudio();
  const { isPlaying } = audio;

  const lang = useSequencerStore(state => state.lang);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const childTracks = tracks.filter(t => String(t.busId) === String(trackId));

  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState(track?.customName || 'Bus');

  const [liveMeasure, setLiveMeasure] = useState<number>(-1);
  const lastMeasureRef = useRef<number>(-1);

  const isToada = track?.customName === 'Toada' || String(track?.id) === 'toada';

  const activeChildTrack = useMemo(() => {
    if (!isToada) return null;
    const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    
    const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
    if (globalSelectedId) {
      if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
      if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
    }
    
    const measure = liveMeasure >= 0 ? liveMeasure : useSequencerStore.getState().currentMeasure;
    const coroPtn = coro?.patterns.find(p => p.measureAssignments[measure]);
    if (coroPtn) return coro;
    
    const puxPtn = pux?.patterns.find(p => p.measureAssignments[measure]);
    if (puxPtn) return pux;
    
    return coro || pux || null;
  }, [isToada, tracks, liveMeasure]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;

  const effectiveLiveActivePatternId = useMemo(() => {
    if (!effectiveTrack) return null;
    if (isPlaying && liveMeasure >= 0) {
      const assignedPattern = effectiveTrack.patterns?.find(p => p?.measureAssignments?.[liveMeasure]);
      return assignedPattern ? assignedPattern.id : null;
    }
    return effectiveTrack.selectedPatternId;
  }, [effectiveTrack, isPlaying, liveMeasure]);

  const effectiveActivePattern = useMemo(() => {
    if (!effectiveTrack) return null;
    return effectiveTrack.patterns?.find(p => p.id === effectiveLiveActivePatternId) || effectiveTrack.patterns?.[0];
  }, [effectiveTrack, effectiveLiveActivePatternId]);

  const toadaLyrics = useMemo(() => {
    if (!isToada) return null;
    const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const measure = liveMeasure >= 0 ? liveMeasure : useSequencerStore.getState().currentMeasure;

    const getPtnText = (trackObj: TrackGroup | undefined) => {
      if (!trackObj) return '';
      const ptn = trackObj.patterns?.find(p => p?.measureAssignments?.[measure]) || trackObj.patterns?.[0];
      if (!ptn || !ptn.lyrics) return '';
      return ptn.lyrics.filter(l => l && l.trim() !== '').join(' ');
    };

    const puxText = getPtnText(pux);
    const coroText = getPtnText(coro);

    return {
      puxText: puxText || '...',
      coroText: coroText || '...',
      puxColor: '#eaddcf',
      coroColor: '#b3dcd8',
    };
  }, [isToada, tracks, liveMeasure]);

  useEffect(() => {
    if (!isActive) {
      if (lastMeasureRef.current !== -1) {
        lastMeasureRef.current = -1;
        setLiveMeasure(-1);
      }
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure } = detail;
      
      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        return;
      }
      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }
    };
    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
    };
  }, [isActive]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `track-${trackId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  useEffect(() => {
    if (track?.customName) {
      setNameVal(track.customName);
    }
  }, [track?.customName]);

  if (!track) return null;

  const childrenCount = tracks.filter(t => String(t.busId) === String(trackId)).length;

  const handleRenameSubmit = () => {
    if (nameVal.trim()) {
      useSequencerStore.getState().setTracks(prev =>
        prev.map(t => t.id === trackId ? { ...t, customName: nameVal.trim() } : t)
      );
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setNameVal(track.customName || 'Bus');
      setIsEditing(false);
    }
  };

  const onDelete = () => {
    const confirmMsg = lang === 'fr' 
      ? 'Voulez-vous supprimer ce Bus ? Les pistes enfants seront déliées du bus.' 
      : 'Deseja excluir este Bus? As pistas filhas serão desvinculadas.';
    if (window.confirm(confirmMsg)) {
      useSequencerStore.getState().pushUndoState();
      useSequencerStore.getState().setTracks(prev => {
        const next = prev.map(t => String(t.busId) === String(trackId) ? { ...t, busId: undefined } : t);
        return next.filter(t => t.id !== trackId);
      });
    }
  };

  const onVolumeChange = (val: number) => {
    useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
  };

  const onPanChange = (val: number) => {
    useSequencerStore.getState().handleTrackPanChange(trackId, val);
  };

  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };

  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
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

  const onToggleFold = () => {
    useSequencerStore.getState().handleToggleFoldBus(String(trackId));
  };

  const busColor = getBusColor(String(trackId), tracks, instrumentsConfig);

  const faderTextColor = getContrastColor(busColor);

  const cleanHex = busColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
  const bgAlphaGroup = `rgba(${r}, ${g}, ${b}, 0.14)`;
  const bgAlphaOrphan = `rgba(${r}, ${g}, ${b}, 0.12)`;

  const groupStyle: React.CSSProperties = {};
  if (busPosition !== 'none') {
    groupStyle.backgroundColor = bgAlphaGroup;
    groupStyle.marginRight = '0px';
    groupStyle.borderTop = `3px solid ${busColor}`;
    groupStyle.borderBottom = `3px solid ${busColor}`;

    if (busPosition === 'first') {
      groupStyle.borderLeft = `3px solid ${busColor}`;
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'middle') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
    } else if (busPosition === 'last') {
      groupStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
      groupStyle.borderRight = `3px solid ${busColor}`;
      groupStyle.marginRight = '16px';
    }
  } else {
    // Bus orphelin (sans enfants ou replié) -> Double bordure
    groupStyle.backgroundColor = bgAlphaOrphan;
    groupStyle.borderTop = `3px double ${busColor}`;
    groupStyle.borderBottom = `3px double ${busColor}`;
    groupStyle.borderLeft = `3px double ${busColor}`;
    groupStyle.borderRight = `3px double ${busColor}`;
    groupStyle.marginRight = '16px';
  }

  if (isCompact) {
    const borderThicknessTop = 3;
    const borderThicknessBottom = 3;
    const paddingTop = 3 - borderThicknessTop;
    const paddingBottom = 3 - borderThicknessBottom;

    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col bg-[var(--cordel-bg)] w-[104px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-hidden relative transition-all duration-300 ${
          hasSolo ? (track.isSolo ? 'shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
          (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
        } ${busPosition === 'none' ? 'cordel-border' : ''}`}
        style={{
          ...style,
          ...groupStyle,
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${12 + paddingBottom}px`,
          zIndex: isDragging ? 50 : 1,
          '--fader-thumb-bg': busColor,
          '--fader-thumb-border': 'var(--cordel-border)',
        } as React.CSSProperties}
      >
        {/* Niveau 6 (Tout en haut) : En-tête */}
        <div 
          className="relative p-1.5 pb-1 flex flex-col gap-1 border-b-[3px] border-[var(--cordel-border)] h-[76px] shrink-0 justify-between w-full"
          style={{ zIndex: isDragging ? 60 : 10 }}
        >
          {/* Outils */}
          <div className="flex justify-between items-center w-full">
            <div 
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripHorizontal size={14} />
            </div>
            
            <button
              onClick={() => setIsEditing(true)}
              className="w-5 h-5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-[9px]"
              title={lang === 'fr' ? 'Renommer le groupe' : 'Renomear o grupo'}
            >
              ✏️
            </button>

            <button 
              onClick={onDelete} 
              className="w-5 h-5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-[9px]"
              title={lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o groupe'}
            >
              ✕
            </button>
          </div>

          {/* Instrument Selector / Dropdown Trigger */}
          <div className="relative flex items-center w-full">
            {isEditing ? (
              <input
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsEditing(false);
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
            )}
          </div>
        </div>

        {/* Inner Controls Stack (Responsive / Elastic Vertical Layout) */}
        <div className="flex-1 flex flex-col p-1.5 gap-1.5 justify-between items-center w-full min-h-0 overflow-y-auto custom-scrollbar">
          {/* Section EQ & Low-Cut (Compact Mode) - flex-shrink */}
          {(() => {
            if (!track) return null;
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

            // Real-time audio update handlers (Zero Render Thrashing)
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

            return (
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

                <MixerSlantedDivider />
              </div>
            );
          })()}

          {/* Niveau 5 : Distortion - flexible compression */}
          <DragNumberBox 
            label="Dst" 
            value={track.fxSends?.distortion ?? 0} 
            onChange={onDistortionChange}
            onAudioDrag={handleDistortionAudioDrag}
            className="w-full text-[8px] px-1 py-0.5 shrink"
          />

          {/* Niveau 4 : Reverb - flexible compression */}
          <DragNumberBox 
            label="Rev" 
            value={track.fxSends?.reverb ?? 0} 
            onChange={onReverbChange}
            onAudioDrag={handleReverbAudioDrag}
            className="w-full text-[8px] px-1 py-0.5 shrink"
          />

          {/* Ligne de délimitation fine au-dessus du Pan */}
          <div className="w-full border-t border-[var(--cordel-border)]/20 my-0.5 shrink-0" />

          {/* Niveau 3 : Panoramique - fixed height */}
          <div className="shrink-0 flex justify-center w-full">
            <PanKnob 
              trackId={trackId} 
              value={track.panVal || 0} 
              onChange={onPanChange}
              label="PAN"
              showLabels={false}
            />
          </div>

          {/* Niveau 2 : Volume + VU-mètre side-by-side (ÉLASTIQUE) */}
          <div className="flex-grow flex-1 min-h-[100px] h-auto flex justify-center gap-2 items-stretch w-full py-1 overflow-hidden">
            <div className="flex flex-col items-center flex-1 h-full min-w-0">
              <MixerVolumeFader
                trackId={trackId}
                value={track.volumeVal}
                onChange={onVolumeChange}
                faderColor={busColor}
                textColor={faderTextColor}
              />
            </div>
            <div className="flex flex-col items-center w-5 h-full justify-center">
              <VUMeter
                busId={String(trackId)}
                isPlaying={isPlaying && isActive}
                isActive={isActive}
                orientation="vertical"
                className="w-2 h-full bg-[var(--cordel-bg)] cordel-border-sm"
              />
            </div>
          </div>

          {/* Niveau 1 (Tout en bas) : Mute & Solo - fixed size */}
          <div className="flex gap-1.5 w-full justify-center shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
              className={`flex-1 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                track.isMute ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
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
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...groupStyle }}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[210px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 ${
        hasSolo ? (track.isSolo ? 'shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-50') : 
        (track.isMute ? 'opacity-60 bg-black/5 dark:bg-white/5' : 'opacity-100')
      } ${busPosition === 'none' ? 'cordel-border' : ''}`}
    >
      {/* En-tête du Bus */}
      <div className="relative p-2 pb-1.5 flex flex-col gap-1.5 border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 h-[82px] shrink-0 flex flex-col justify-between">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5">
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripHorizontal size={18} />
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-xs"
              title={lang === 'pt' ? 'Editar nome' : 'Modifier le nom'}
            >
              <Edit2 size={12} />
            </button>
          </div>
          <button
            onClick={onDelete}
            className="w-7 h-7 bg-[#8b2a1a]/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border-[#8b2a1a] text-[#8b2a1a] cordel-border-sm cursor-pointer font-bold flex items-center justify-center transition-colors text-xs"
            title={lang === 'pt' ? 'Excluir Bus' : 'Supprimer le Bus'}
          >
            ✕
          </button>
        </div>

        {/* Zone de Titre avec Fold/Unfold */}
        <div className="flex items-center justify-between w-full mt-0.5 gap-2 px-1">
          {isEditing ? (
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="font-cactus font-bold text-xs bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-2 py-1 flex-1 outline-none w-full text-center"
              autoFocus
            />
          ) : (
            <div 
              onClick={onToggleFold}
              onDoubleClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-2 py-1.5 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-between font-bold"
              title={lang === 'fr' ? 'Double-cliquer pour renommer / Cliquer pour plier' : 'Clique duplo para renomear / Clique para dobrar'}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-[10px] flex-shrink-0 font-sans font-bold select-none opacity-80">
                  {track.isFolded ? '▼' : '▶'}
                </span>
                <div className="flex items-center gap-1.5 truncate">
                  <img 
                    src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                    alt="Bus" 
                    className="w-4 h-4 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                  />
                  <span className="font-cactus text-xs truncate">{index + 1}. {track.customName || 'Bus'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone centrale de hauteur identique à la grille pattern montrant les pistes enfants */}
      <div className="relative z-10 flex-1 p-3 flex flex-col border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 justify-start items-center w-full">
        {isToada && toadaLyrics ? (
          <div className="flex flex-col w-full h-full justify-start gap-2 py-1 px-0.5 min-h-[220px]">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider opacity-60 border-b border-[var(--cordel-border)]/15 pb-1 select-none">
              <span>{lang === 'fr' ? 'Pistes du Groupe' : 'Pistas do Grupo'}</span>
              <span>🔗 {childTracks.length}</span>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[210px] w-full mt-2 font-cactus text-[11px] leading-[1.3] text-left">
              {/* Puxador lyrics */}
              <div className="flex flex-col gap-1 p-2 rounded bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/15 shadow-[1px_1px_0px_rgba(26,26,26,0.05)]">
                <span className="text-[8px] uppercase tracking-wider font-sans font-extrabold opacity-60" style={{ color: toadaLyrics.puxColor }}>
                  Puxador
                </span>
                <p className="font-cactus font-bold truncate-2-lines" style={{ color: toadaLyrics.puxColor }}>
                  {toadaLyrics.puxText}
                </p>
              </div>

              {/* Separateur */}
              <div className="border-t border-dashed border-[var(--cordel-border)]/20 my-1 w-full" />

              {/* Coro lyrics */}
              <div className="flex flex-col gap-1 p-2 rounded bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/15 shadow-[1px_1px_0px_rgba(26,26,26,0.05)]">
                <span className="text-[8px] uppercase tracking-wider font-sans font-extrabold opacity-60" style={{ color: toadaLyrics.coroColor }}>
                  Coro
                </span>
                <p className="font-cactus font-bold truncate-2-lines" style={{ color: toadaLyrics.coroColor }}>
                  {toadaLyrics.coroText}
                </p>
              </div>
            </div>
          </div>
        ) : childTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center min-h-[220px]">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">AUDIO BUS / GROUP</span>
            <div className="flex items-center gap-1.5 mt-2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/30 px-3 py-1.5 rounded-none font-bold text-xs">
              <span>🔗 0</span>
              <span>{lang === 'fr' ? 'piste' : 'pista'}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full justify-start gap-2.5 py-1 px-0.5 min-h-[220px]">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider opacity-60 border-b border-[var(--cordel-border)]/15 pb-1 select-none">
              <span>{lang === 'fr' ? 'Pistes du Groupe' : 'Pistas do Grupo'}</span>
              <span>🔗 {childTracks.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[210px] pr-1 w-full">
              {childTracks.map(childTrack => {
                const childInst = instrumentsConfig[childTrack.instrumentIdx];
                if (!childInst) return null;

                const childLiveActivePatternId = (() => {
                  if (isPlaying && liveMeasure >= 0) {
                    const assignedPattern = childTrack.patterns?.find(p => p?.measureAssignments?.[liveMeasure]);
                    return assignedPattern ? assignedPattern.id : null;
                  }
                  return childTrack.selectedPatternId;
                })();

                const childActivePattern = childTrack.patterns?.find(p => p.id === childLiveActivePatternId) || childTrack.patterns?.[0];
                if (!childActivePattern) return null;

                const childDisplayName = childTrack.customName || childInst.name;

                return (
                  <div key={childTrack.id} className="flex flex-col gap-1 w-full bg-[var(--cordel-bg)] p-1.5 border border-[var(--cordel-border)]/20 shadow-[1px_1px_0px_rgba(26,26,26,0.1)]">
                    {/* Nom de la piste & icône */}
                    <div className="flex items-center gap-1.5 truncate select-none">
                      <img 
                        src={`${ASSETS_BASE_URL}${childInst.iconImg}`} 
                        alt={childInst.name} 
                        className="w-4 h-4 object-contain flex-shrink-0" 
                      />
                      <span className="font-cactus font-bold text-[10px] text-[var(--cordel-text)] truncate">
                        {childDisplayName}
                      </span>
                    </div>

                    {/* Défilement du motif de 16 pas */}
                    <div className="w-full flex justify-center mt-0.5">
                      <VisualOnlyTimeline
                        trackId={childTrack.id}
                        steps={childActivePattern.steps}
                        activeSteps={childLiveActivePatternId === null ? Array(childActivePattern.steps).fill(0) : (childActivePattern.activeSteps || [])}
                        instrumentIdx={childTrack.instrumentIdx}
                        isPlaying={isPlaying && childLiveActivePatternId !== null}
                        isLeftHanded={isLeftHanded}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Only Timeline alternative (Hauteur identique fixe) */}
      <div className="h-[48px] bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] shrink-0 flex items-center justify-center z-10">
        {isToada && effectiveActivePattern ? (
          <div className="px-4 py-2 w-full h-full flex items-center justify-center">
            <VisualOnlyTimeline
              trackId={effectiveTrack.id}
              steps={effectiveActivePattern.steps}
              activeSteps={effectiveLiveActivePatternId === null ? Array(effectiveActivePattern.steps).fill(0) : (effectiveActivePattern.activeSteps || [])}
              instrumentIdx={effectiveTrack.instrumentIdx}
              isPlaying={isPlaying && effectiveLiveActivePatternId !== null}
              isLeftHanded={isLeftHanded}
            />
          </div>
        ) : (
          <div className="font-bold text-[9px] uppercase tracking-widest opacity-40 select-none">
            CANAL DE BUS
          </div>
        )}
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div 
        className="relative z-10 p-3 pt-2.5 pb-1 flex flex-col h-[200px] justify-between gap-1.5 w-full"
        style={{
          '--fader-thumb-bg': busColor,
          '--fader-thumb-border': 'var(--cordel-border)',
        } as React.CSSProperties}
      >
        {/* Ligne 1 (Panoramique) : HorizontalPanFader tout en haut */}
        <HorizontalPanFader 
          value={track.panVal || 0} 
          onChange={onPanChange}
          className="w-full shrink-0 h-4"
          lang={lang}
        />

        {/* Zone Inférieure (Mixage) : 3 colonnes horizontales regroupées au centre */}
        <div className="flex justify-center items-center w-full flex-grow gap-5 pt-1.5">
          {/* Colonne de gauche : Bouton Mute [M] au-dessus de Solo [S] */}
          <div className="flex flex-col gap-2 justify-center items-center w-7 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
              className={`w-7 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                track.isMute ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >M</button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
              className={`w-7 h-7 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${
                track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >S</button>
          </div>

          {/* Colonne centrale : Fader vertical de volume (Ghost Input à haute performance) */}
          <div className="flex flex-col items-center w-10 shrink-0">
            <MixerVolumeFader
              trackId={trackId}
              value={track.volumeVal}
              onChange={onVolumeChange}
              faderColor={busColor}
              textColor={faderTextColor}
            />
          </div>

          {/* Colonne de droite : VU-mètre vertical élargi, sans label Meter */}
          <div className="flex flex-col items-center w-7 shrink-0">
            <div className="h-[115px] flex justify-center items-center relative w-7">
              <VUMeter
                busId={String(trackId)}
                isPlaying={isPlaying && isActive}
                isActive={isActive}
                orientation="vertical"
                className="w-3 h-[99px] bg-[var(--cordel-bg)] cordel-border-sm"
              />
            </div>
          </div>
        </div>

        {/* Ligne 3 (Effets) : Deux DragNumberBox actifs côte à côte tout en bas */}
        <div className="flex gap-2 w-full shrink-0">
          <DragNumberBox 
            label="Rev" 
            value={track.fxSends?.reverb ?? 0} 
            onChange={onReverbChange}
            onAudioDrag={handleReverbAudioDrag}
            className="flex-1"
          />
          <DragNumberBox 
            label="Dst" 
            value={track.fxSends?.distortion ?? 0} 
            onChange={onDistortionChange}
            onAudioDrag={handleDistortionAudioDrag}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export const MixerFolderBus = React.memo(MixerFolderBusComponent);
