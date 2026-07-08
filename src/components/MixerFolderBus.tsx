/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Trash2, Edit2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getBusColor, getContrastColor } from '../utils/colorHelpers';
import { DragNumberBox } from './DragNumberBox';
import { HorizontalPanFader } from './HorizontalPanFader';
import { PanKnob } from './PanKnob';
import { MixerVolumeFader } from './MixerVolumeFader';
import { useAudio } from '../contexts/AudioContext';
import { VUMeter } from './VUMeter';
import { instrumentsConfig } from '../data';

interface MixerFolderBusProps {
  trackId: number;
  index: number;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
}

const MixerFolderBusComponent: React.FC<MixerFolderBusProps> = ({
  trackId,
  index,
  isActive = true,
  busPosition = 'none',
}) => {
  const audio = useAudio();
  const { isPlaying } = audio;

  const lang = useSequencerStore(state => state.lang);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));

  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState(track?.customName || 'Bus');

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

  const onToggleFold = () => {
    useSequencerStore.getState().handleToggleFoldBus(String(trackId));
  };

  const busColor = getBusColor(String(trackId), tracks, instrumentsConfig);

  const faderTextColor = getContrastColor(busColor);

  const cleanHex = busColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 42;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
  const bgAlphaGroup = `rgba(${r}, ${g}, ${b}, 0.07)`;
  const bgAlphaOrphan = `rgba(${r}, ${g}, ${b}, 0.05)`;

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
          <button
            onClick={onToggleFold}
            className="w-7 h-7 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-xs transition-colors shrink-0 font-bold"
            title={track.isFolded ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
          >
            {track.isFolded ? '▶️' : '🔽'}
          </button>

          {isEditing ? (
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="font-cactus font-bold text-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none px-1.5 py-0.5 w-full outline-none text-center"
              autoFocus
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditing(true)}
              className="font-cactus font-bold text-sm truncate flex-grow text-center tracking-wide cursor-pointer"
              title="Double-click to rename"
            >
              📁 {index + 1}. {track.customName || 'Bus'}
            </span>
          )}
        </div>
      </div>

      {/* Zone centrale neutre de hauteur identique à la grille pattern */}
      <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 justify-center items-center">
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center min-h-[220px]">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">AUDIO BUS / GROUP</span>
          <div className="flex items-center gap-1.5 mt-2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/30 px-3 py-1.5 rounded-none font-bold text-xs">
            <span>🔗 {childrenCount}</span>
            <span>{lang === 'fr' ? (childrenCount > 1 ? 'pistes' : 'piste') : (childrenCount > 1 ? 'pistas' : 'pista')}</span>
          </div>
        </div>
      </div>

      {/* Visual Only Timeline alternative (Hauteur identique fixe) */}
      <div className="h-[48px] bg-[var(--cordel-bg)] border-b-[3px] border-[var(--cordel-border)] shrink-0 flex items-center justify-center font-bold text-[9px] uppercase tracking-widest opacity-40">
        CANAL DE BUS
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
            className="flex-1"
          />
          <DragNumberBox 
            label="Dst" 
            value={track.fxSends?.distortion ?? 0} 
            onChange={onDistortionChange}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export const MixerFolderBus = React.memo(MixerFolderBusComponent);
