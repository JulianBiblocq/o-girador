/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Link } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig, ASSETS_BASE_URL, i18n } from '../data';
import { PanKnob } from './PanKnob';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';

interface MixerLinkedTrackProps {
  trackId: number;
  index: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
}

const MixerLinkedTrackComponent: React.FC<MixerLinkedTrackProps> = ({
  trackId,
  index,
  onOpenDetailEditor,
  isActive = true,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { isPlaying } = audio;

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
  } = useSortable({ id: `track-${trackId}` });

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return null;

  const masterTrack = tracks.find(t => String(t.id) === String(track.linkedToTrackId));
  const masterInst = masterTrack ? instrumentsConfig[masterTrack.instrumentIdx] : null;
  const masterName = masterInst ? masterInst.name : '?';
  const masterIndex = masterTrack ? tracks.findIndex(t => t.id === masterTrack.id) : -1;

  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(trackId, instIdx);
  };
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
    useSequencerStore.getState().handleTrackPanChange(trackId, val);
  };
  const onReverbChange = (val: number) => {
    sequencer.handleTrackReverbChange(trackId, val);
  };

  // Calcul des pistes cibles de liaison éligibles (même nature)
  const eligibleTracks = tracks.filter(tOpt => {
    if (tOpt.id === trackId) return false;
    if (tOpt.linkedToTrackId && String(tOpt.linkedToTrackId) === String(trackId)) return false;
    
    const optInst = instrumentsConfig[tOpt.instrumentIdx];
    if (!optInst) return false;
    
    if (inst.id === optInst.id) return true;
    const isAlfaiaA = inst.path?.startsWith('Alfaia');
    const isAlfaiaB = optInst.path?.startsWith('Alfaia');
    if (isAlfaiaA && isAlfaiaB) return true;
    const isCaixaA = inst.id === 'caixa' || inst.id === 'tarol';
    const isCaixaB = optInst.id === 'caixa' || optInst.id === 'tarol';
    if (isCaixaA && isCaixaB) return true;
    const isShakeA = inst.type === 'shake';
    const isShakeB = optInst.type === 'shake';
    if (isShakeA && isShakeB) return true;
    
    return false;
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: instDropdownOpen ? 30 : 1,
    '--fader-thumb-bg': '#555555',
    '--fader-thumb-border': 'var(--cordel-border)',
  } as React.CSSProperties;

  // Style hachuré Cordel / Xilogravura pour distinction forte
  const hatchedBgStyle = {
    background: `repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.03),
      rgba(0, 0, 0, 0.03) 8px,
      rgba(0, 0, 0, 0.08) 8px,
      rgba(0, 0, 0, 0.08) 16px
    )`,
    border: '2px dashed var(--cordel-border)',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[210px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 cordel-linked-track-container"
    >
      <div 
        className="relative p-2 pb-1.5 flex flex-col gap-1.5 border-b-[3px] border-[var(--cordel-border)]"
        style={{ zIndex: instDropdownOpen ? 40 : 10 }}
      >
        {/* Ligne 1 : Outils */}
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
              onClick={() => onOpenDetailEditor(trackId)}
              className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors text-xs"
              title="Éditeur détaillé"
            >
              ✏️
            </button>
          </div>
          <button 
            onClick={onDelete} 
            className="w-7 h-7 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-xs"
            title="Supprimer la piste"
          >
            ✕
          </button>
        </div>

        {/* Ligne 2 : Sélection de l'instrument et Liaison */}
        <div className="relative flex items-center w-full" ref={dropdownRef}>
          <div 
            onClick={() => setInstDropdownOpen(!instDropdownOpen)} 
            className="flex items-center gap-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1.5 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors w-full justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="font-cactus font-bold text-xs truncate">{index + 1}. {inst.name}</span>
            </div>
            <span className="text-[8px] flex-shrink-0 opacity-60">▼</span>
          </div>

          {instDropdownOpen && (
            <div className="absolute top-9 left-0 right-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow max-h-[300px] overflow-y-auto z-[99] w-full custom-scrollbar">
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/20">
                {lang === 'fr' ? 'Changer d\'instrument' : 'Mudar instrumento'}
              </div>
              {instrumentsConfig.map((opt, oIdx) => (
                <div 
                  key={oIdx} 
                  onClick={() => { onInstrumentChange(oIdx); setInstDropdownOpen(false); }} 
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold"
                >
                  <img src={`${ASSETS_BASE_URL}${opt.iconImg}`} alt={opt.name} className="w-5 h-5 object-contain" />
                  <span className="font-cactus">{opt.name}</span>
                </div>
              ))}
              
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1">
                🔗 {lang === 'fr' ? 'Liaison de partition' : 'Vínculo de partitura'}
              </div>
              
              <div 
                onClick={() => {
                  useSequencerStore.getState().handleLinkTrack(trackId, null);
                  setInstDropdownOpen(false);
                }}
                className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-xs font-bold text-[#8b2a1a]"
              >
                ✕ {lang === 'fr' ? 'Délier la piste' : 'Remover vínculo'}
              </div>

              {eligibleTracks.length > 0 && eligibleTracks.map((tOpt) => {
                const tOptInst = instrumentsConfig[tOpt.instrumentIdx];
                const tOptIndex = tracks.findIndex(t => t.id === tOpt.id);
                const shortName = tOptInst.name.replace('Alfaia ', '');
                return (
                  <div
                    key={tOpt.id}
                    onClick={() => {
                      useSequencerStore.getState().handleLinkTrack(trackId, String(tOpt.id));
                      setInstDropdownOpen(false);
                    }}
                    className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold truncate"
                  >
                    🔗 {shortName} ({tOptIndex + 1})
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zone centrale : Liaison de Partition avec texture hachurée */}
      <div className="relative flex-1 p-3 flex flex-col items-center justify-center border-b-[3px] border-[var(--cordel-border)] min-h-[140px]">
        <div 
          style={hatchedBgStyle} 
          className="w-full h-full flex flex-col items-center justify-center p-3 text-center gap-2 rounded bg-[var(--cordel-bg)]/40 cordel-shadow-sm select-none"
        >
          <div className="w-10 h-10 rounded-full border-2 border-[var(--cordel-border)] flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
            <Link size={18} className="animate-pulse" />
          </div>
          <span className="font-cactus font-bold text-[11px] uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Partition Liée' : 'Pauta Vinculada'}
          </span>
          <span className="text-[9px] font-bold text-[var(--cordel-text)]/70 leading-snug">
            {lang === 'fr' 
              ? `Partagée avec ${masterName} (${masterIndex >= 0 ? masterIndex + 1 : '?'})`
              : `Compartilhado com ${masterName} (${masterIndex >= 0 ? masterIndex + 1 : '?'})`}
          </span>
        </div>
      </div>

      {/* Visual Only Timeline alternative / Barre de statut de liaison */}
      <div className="px-3 py-1.5 bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] shrink-0 flex items-center justify-center gap-1">
        <span className="text-[8px] font-extrabold uppercase tracking-widest text-[var(--cordel-text)]/40 flex items-center gap-1">
          🔒 SLAVE MODE
        </span>
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-3 pt-4 flex justify-between items-end h-[200px] gap-2">
        {/* Column 1: Pan & Buttons Column */}
        <div className="flex flex-col gap-2 justify-end h-full pb-1 items-center w-11 shrink-0">
          <PanKnob trackId={trackId} value={track.panVal || 0} onChange={onPanChange} label="Pan" />
          <div className="h-0.5" />
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-8 h-8 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-8 h-8 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >S</button>
        </div>

        {/* Volume Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
          <div className="h-[145px] flex justify-center items-center relative w-10">
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackVolume"
              trackId={trackId}
              value={track.volumeVal}
              onChange={(val) => onVolumeChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-6 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)] fader-val-label">{track.volumeVal}</span>
        </div>

        {/* Reverb Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Reverb</span>
          <div className="h-[145px] flex justify-center items-center relative w-8">
            <div className="absolute top-0 bottom-0 w-1 bg-[var(--cordel-border)] rounded-none pointer-events-none"></div>
            <AudioFader
              type="range"
              min="0"
              max="100"
              orient="vertical"
              audioTarget="trackReverb"
              trackId={trackId}
              value={track.reverbVal || 0}
              onChange={(val) => onReverbChange(val)}
              className="vertical-fader touch-none z-10 h-[130px] w-5 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)] fader-val-label">{track.reverbVal || 0}</span>
        </div>

        {/* LED Meter */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
          <VUMeter
            instrumentId={inst.id}
            isPlaying={isPlaying && isActive}
            isActive={isActive}
            orientation="vertical"
            className="w-2.5 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm"
          />
          <div className="h-[15px]" />
        </div>
      </div>
    </div>
  );
};

export const MixerLinkedTrack = React.memo(MixerLinkedTrackComponent);
