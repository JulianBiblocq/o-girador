/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore, getEffectiveMuteState } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { getBusColor, getContrastColor, getTopParentBusId } from '../utils/colorHelpers';
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

interface MixerLinkedTrackProps {
  trackId: number;
  index: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
  linkPosition?: 'first' | 'middle' | 'last' | 'none';
  dropIndicator?: 'left' | 'right' | null;
}

const MixerLinkedTrackComponent: React.FC<MixerLinkedTrackProps> = ({
  trackId,
  index,
  isActive = true,
  busPosition = 'none',
  linkPosition = 'none',
  dropIndicator = null,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { isPlaying } = audio;
  const chorusDensity = useAudioStore(state => state.chorusDensity);

  const lang = useSequencerStore(state => state.lang);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

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

  const masterTrack = tracks.find(t => String(t.id) === String(track.linkedToTrackId));
  const masterInst = masterTrack ? instrumentsConfig[masterTrack.instrumentIdx] : null;
  const masterName = masterInst ? masterInst.name : '?';

  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const onDelete = () => {
    useSequencerStore.getState().handleTrackDelete(trackId);
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

  const faderColor = inst.color || '#555555';
  const faderTextColor = getContrastColor(faderColor);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: instDropdownOpen ? 30 : 1,
    '--fader-thumb-bg': faderColor,
    '--fader-thumb-border': 'var(--cordel-border)',
  } as React.CSSProperties;

  const isInsideBusBlock = busPosition === 'first' || busPosition === 'middle';
  const isInsideLinkBlock = linkPosition === 'first' || linkPosition === 'middle';
  const groupStyle: React.CSSProperties = {
    marginRight: (isInsideBusBlock || isInsideLinkBlock) ? '0px' : '16px'
  };
  const topBusId = getTopParentBusId(track, tracks);
  if (busPosition !== 'none' && topBusId) {
    const parentBusId = topBusId;
    const busColor = getBusColor(parentBusId, tracks, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    const bgAlpha = `rgba(${r}, ${g}, ${b}, 0.02)`;

    groupStyle.backgroundColor = bgAlpha;
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
    }
  }

  // Calcul du cadre de liaison de partition interne (Track Linking)
  const linkColor = track.isLinkFolder 
    ? getBusColor(String(track.id), tracks, instrumentsConfig) 
    : (track.linkedToTrackId 
        ? getBusColor(String(track.linkedToTrackId), tracks, instrumentsConfig) 
        : (inst?.color || '#8b2a1a'));

  const linkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '3px',
    bottom: '3px',
    left: '3px',
    right: '3px',
    pointerEvents: 'none',
    zIndex: 2,
    borderTop: `2.5px solid ${linkColor}`,
    borderBottom: `2.5px solid ${linkColor}`,
  };

  if (linkPosition === 'first') {
    linkStyle.borderLeft = `2.5px solid ${linkColor}`;
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'middle') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = '1.5px dashed rgba(26, 26, 26, 0.15)';
  } else if (linkPosition === 'last') {
    linkStyle.borderLeft = '1.5px dashed rgba(26, 26, 26, 0.15)';
    linkStyle.borderRight = `2.5px solid ${linkColor}`;
  } else if (linkPosition === 'none' && track.isLinkFolder) {
    linkStyle.borderLeft = `2.5px solid ${linkColor}`;
    linkStyle.borderRight = `2.5px solid ${linkColor}`;
  }

  const borderThicknessTop = 3;
  const borderThicknessBottom = 3;
  const paddingTop = 3 - borderThicknessTop;
  const paddingBottom = 3 - borderThicknessBottom;

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

    const isMuted = getEffectiveMuteState(tracks, trackId);
  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[115px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-hidden relative transition-all duration-300 ${
        isMuted ? 'opacity-50 bg-black/5' : 'opacity-100'
      } ${busPosition === 'none' ? 'cordel-border' : ''}`}
      style={{
        ...style,
        ...groupStyle,
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${12 + paddingBottom}px`,
        zIndex: isDragging ? 50 : 1,
        '--fader-thumb-bg': faderColor,
        '--fader-thumb-border': 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      {linkPosition !== 'none' && (
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
            onClick={onDelete} 
            className="w-5 h-5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-[9px]"
            title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir a faixa'}
          >
            ✕
          </button>
        </div>

        {/* Title / Name */}
        <div className="relative flex items-center w-full">
          <div className="flex items-center gap-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-1 w-full justify-center opacity-70">
            <span className="font-cactus font-bold text-[9px] truncate">{track.customName || inst.name}</span>
          </div>
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
            className="w-full text-[8px] px-1 py-0.5 shrink"
          />
          <DragNumberBox 
            label="Rev" 
            value={track.fxSends?.reverb ?? track.reverbVal ?? 0} 
            onChange={onReverbChange}
            onAudioDrag={handleReverbAudioDrag}
            className="w-full text-[8px] px-1 py-0.5 shrink"
          />
        </div>

        {/* Section PAN */}
        <div className="w-full flex flex-col items-center shrink-0">
          <div className="w-full border-t border-[var(--cordel-border)]/20 my-0.5 shrink-0" />
          <div className="flex justify-center w-full">
            <PanKnob 
              trackId={trackId}
              value={track.pan ?? track.panVal ?? 0} 
              onChange={onPanChange}
              label="PAN"
              showLabels={false}
            />
          </div>
        </div>

        {/* Section VOL */}
        <div className="w-full flex flex-col flex-grow min-h-[60px] overflow-hidden">
          <div className="flex-grow flex-1 min-h-[60px] h-auto flex justify-center gap-2 items-stretch w-full py-1.5 overflow-hidden">
            <div className="flex flex-col items-center flex-1 h-full min-w-0">
              <MixerVolumeFader
                trackId={trackId}
                value={track.volumeVal}
                onChange={onVolumeChange}
                faderColor={faderColor}
                textColor={faderTextColor}
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

export const MixerLinkedTrack = React.memo(MixerLinkedTrackComponent);
