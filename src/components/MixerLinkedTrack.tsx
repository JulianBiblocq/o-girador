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
import { getBusColor, getContrastColor } from '../utils/colorHelpers';
import { DragNumberBox } from './DragNumberBox';
import { HorizontalPanFader } from './HorizontalPanFader';
import { PanKnob } from './PanKnob';
import { MixerVolumeFader } from './MixerVolumeFader';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';
import { reverbSends, distortionSends } from '../hooks/useAudioSync';

interface MixerLinkedTrackProps {
  trackId: number;
  index: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
}

const MixerLinkedTrackComponent: React.FC<MixerLinkedTrackProps> = ({
  trackId,
  index,
  onOpenDetailEditor,
  isActive = true,
  busPosition = 'none',
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

  // Calcul des pistes cibles de liaison éligibles (même nature)
  const eligibleTracks = tracks.filter(tOpt => {
    if (tOpt.isBusFolder) return false;
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

  const faderColor = inst.color || '#555555';

  const faderTextColor = getContrastColor(faderColor);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: instDropdownOpen ? 30 : 1,
    '--fader-thumb-bg': faderColor,
    '--fader-thumb-border': 'var(--cordel-border)',
  } as React.CSSProperties;

  // Calcul du style de groupe
  const groupStyle: React.CSSProperties = {
    marginRight: (busPosition === 'none' || busPosition === 'last') ? '16px' : '0px'
  };
  if (busPosition !== 'none' && track.busId) {
    const busColor = getBusColor(String(track.busId), tracks, instrumentsConfig);
    const cleanHex = busColor.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
    const bgAlpha = `rgba(${r}, ${g}, ${b}, 0.03)`;

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

  // Style hachuré Cordel / Xilogravura pour distinction forte
  const hatchedBgStyle = {
    background: `repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.02),
      rgba(0, 0, 0, 0.02) 8px,
      rgba(0, 0, 0, 0.05) 8px,
      rgba(0, 0, 0, 0.05) 16px
    )`,
    ...groupStyle,
    borderTop: busPosition === 'none' ? '2px dashed var(--cordel-border)' : groupStyle.borderTop,
    borderBottom: busPosition === 'none' ? '2px dashed var(--cordel-border)' : groupStyle.borderBottom,
    borderLeft: busPosition === 'none' ? '2px dashed var(--cordel-border)' : groupStyle.borderLeft,
    borderRight: busPosition === 'none' ? '2px dashed var(--cordel-border)' : groupStyle.borderRight,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{ ...style, ...groupStyle }}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[210px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-all duration-300 cordel-linked-track-container ${
        busPosition === 'none' ? 'cordel-border' : ''
      }`}
    >
      <div 
        className="relative p-2 pb-1.5 flex flex-col gap-1.5 border-b-[3px] border-[var(--cordel-border)] h-[82px] shrink-0 flex flex-col justify-between"
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

              {/* Section Audio Bussing */}
              <div className="text-[10px] uppercase opacity-60 font-bold px-3 py-1 bg-[var(--cordel-text)]/5 border-t border-b border-[var(--cordel-border)]/20 mt-1 flex items-center gap-1.5">
                <img 
                  src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                />
                <span>{lang === 'fr' ? 'Bus / Groupes' : 'Bus / Grupos'}</span>
              </div>

              {/* Option 1: Créer un groupe avec cet instrument */}
              <div
                onClick={() => {
                  const busName = window.prompt(lang === 'fr' ? 'Nom du groupe :' : 'Nome do grupo:', 'Alfaias');
                  if (busName && busName.trim()) {
                    useSequencerStore.getState().handleCreateBus(trackId, busName.trim());
                  }
                  setInstDropdownOpen(false);
                }}
                className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5"
              >
                <img 
                  src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                />
                <span>{lang === 'fr' ? 'Créer un groupe avec cet instrument' : 'Criar um grupo com este instrumento'}</span>
              </div>

              {/* Option 2: Quitter le Bus s'il y est affecté */}
              {track.busId && (
                <div
                  onClick={() => {
                    useSequencerStore.getState().handleAssignToBus(trackId, null);
                    setInstDropdownOpen(false);
                  }}
                  className="px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-xs font-bold text-[#8b2a1a]"
                >
                  ✕ {lang === 'fr' ? 'Quitter le Bus/Groupe' : 'Sair do Bus/Grupo'}
                </div>
              )}

              {/* Option 3: Liste des Bus existants à rejoindre */}
              {tracks.filter(t => t.isBusFolder && t.id !== trackId).map((bus) => {
                const busIdx = tracks.findIndex(t => t.id === bus.id);
                return (
                  <div
                    key={bus.id}
                    onClick={() => {
                      useSequencerStore.getState().handleAssignToBus(trackId, String(bus.id));
                      setInstDropdownOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-xs font-bold truncate flex items-center gap-1.5 ${
                      String(track.busId) === String(bus.id) ? 'bg-[var(--cordel-text)]/10' : ''
                    }`}
                  >
                    <img 
                      src={`${ASSETS_BASE_URL}icones/bus.svg`} 
                      alt="" 
                      className="w-3.5 h-3.5 object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0" 
                    />
                    <span className="truncate">{bus.customName || 'Bus'} ({busIdx + 1})</span>
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
            {track.isLinkMaster 
              ? (lang === 'fr' ? 'Instrument Maître' : 'Instrumento Mestre')
              : (lang === 'fr' ? 'Instrument Esclave' : 'Instrumento Escravo')}
          </span>
          <span className="text-[9px] font-bold text-[var(--cordel-text)]/70 leading-snug">
            {track.isLinkMaster 
              ? (lang === 'fr' ? 'Contrôle la partition du groupe' : 'Controla a partitura do grupo')
              : (lang === 'fr' 
                  ? `Suit la partition du groupe (${masterName})` 
                  : `Segue a partitura do grupo (${masterName})`)}
          </span>
        </div>
      </div>

      {/* Visual Only Timeline alternative / Barre de statut de liaison */}
      <div className="h-[48px] bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] shrink-0 flex items-center justify-center gap-1">
        <span className="text-[8px] font-extrabold uppercase tracking-widest text-[var(--cordel-text)]/40 flex items-center gap-1">
          {track.isLinkMaster 
            ? (lang === 'fr' ? '👑 MAÎTRE' : '👑 MESTRE') 
            : (lang === 'fr' ? '🔒 ESCLAVE' : '🔒 ESCRAVO')}
        </span>
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-3 pt-2.5 pb-1 flex flex-col h-[200px] justify-between gap-1.5 w-full">
        {/* Ligne 1 (Panoramique) : HorizontalPanFader tout en haut */}
        <HorizontalPanFader 
          value={track.pan ?? track.panVal ?? 0} 
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
                (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
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
              faderColor={faderColor}
              textColor={faderTextColor}
            />
          </div>

          {/* Colonne de droite : VU-mètre vertical élargi, sans label Meter */}
          <div className="flex flex-col items-center w-7 shrink-0">
            <div className="h-[115px] flex justify-center items-center relative w-7">
              <VUMeter
                trackId={trackId}
                instrumentId={inst.id}
                isPlaying={isPlaying && isActive}
                isActive={isActive}
                orientation="vertical"
                className="w-3 h-[99px] bg-[var(--cordel-bg)] cordel-border-sm"
              />
            </div>
          </div>
        </div>

        {/* Ligne 3 (Effets) : Deux DragNumberBox côte à côte tout en bas */}
        <div className="flex gap-2 w-full shrink-0">
          <DragNumberBox 
            label="Rev" 
            value={track.fxSends?.reverb ?? track.reverbVal ?? 0} 
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

export const MixerLinkedTrack = React.memo(MixerLinkedTrackComponent);
