/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Mic } from 'lucide-react';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { TrackInkVolumeSlider } from '../mixer/TrackInkVolumeSlider';

interface WorkspaceTrackCardProps {
  track: TrackGroup;
  index: number;
  tracks: TrackGroup[];
  isPistasOpen: boolean;
  onOpenDetailEditor: (trackId: number) => void;
  dragHandleProps?: {
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
  };
}

export const WorkspaceTrackCard: React.FC<WorkspaceTrackCardProps> = ({
  track,
  index,
  tracks,
  isPistasOpen,
  onOpenDetailEditor,
  dragHandleProps,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const isLetraActive = useSequencerStore(state => state.isLetraActive);
  const toggleLetraActive = useSequencerStore(state => state.toggleLetraActive);

  const isToada = Boolean(track.isBusFolder && (track.customName === 'Toada' || String(track.id) === 'toada'));
  const inst = instrumentsConfig[track.instrumentIdx] || (isToada ? instrumentsConfig.find(i => i.id === 'puxador' || i.type === 'voice') : null);

  const displayName = useMemo(() => {
    if (isToada) return 'Toada';
    if (!inst) return 'Instrument';
    return useNomenclatureStore.getState().getInstrumentLabel(track);
  }, [isToada, inst, track]);

  const handleDelete = async () => {
    const trackName = displayName || inst?.name || (lang === 'fr' ? 'cette piste' : 'esta faixa');
    const isBus = track.isBusFolder;
    const childTracks = tracks.filter(t => String(t.busId) === String(track.id));
    const confirmMsg = isBus && childTracks.length > 0
      ? (lang === 'fr' ? `Attention : le bus "${trackName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?` : `Atenção: o bus "${trackName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`)
      : (lang === 'fr' ? `Supprimer définitivement la piste "${trackName}" et tous ses motifs ?` : `Excluir definitivamente a faixa "${trackName}" e todos os seus padrões?`);
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(track.id);
    }
  };

  const isAoVivo = activeAoVivoTrackId === track.id;
  const toggleAoVivo = async () => {
    if (useSequencerStore.getState().isEcoMode) {
      await sequencer.alertAsync(lang === 'pt' ? 'Modo de economia ativado: As animações (AoVivo) foram desativadas para preservar o desempenho.' : 'Mode éco activé : Les animations (AoVivo) ont été désactivées pour préserver les performances.');
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  if (!inst) return null;

  return (
    <div className="flex items-center justify-between w-full h-[53px] min-h-[53px] max-h-[53px] shrink-0 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] px-2 relative z-10 bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] select-none">
      <div className="flex items-center gap-1 min-w-0">
        <div {...dragHandleProps?.attributes} {...dragHandleProps?.listeners} className="transition-colors p-0.5 touch-none flex-shrink-0 cursor-grab active:cursor-grabbing text-[#1a1a1a]/60 hover:text-[#1a1a1a]" title={lang === 'fr' ? 'Glisser pour réorganiser' : 'Arrastar para reordenar'}>
          <GripVertical size={14} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetailEditor(track.id);
          }}
          className="flex items-center gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-xs cursor-pointer transition-colors w-[116px] h-[34px] min-h-[34px] shrink-0"
          style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
          title={lang === 'pt' ? 'Editar instrumento' : "Éditer l'instrument"}
        >
          <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          <span className="text-[11px] font-cactus font-black leading-tight truncate block text-left flex-1">{index + 1}. {displayName}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="flex items-center justify-center w-5 h-5 cordel-border-sm cordel-button cursor-pointer transition-colors bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shrink-0" title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-1 items-center shrink-0">
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackMuteToggle(track.id); }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${(track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'}`}>M</button>
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackSoloToggle(track.id); }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'}`}>S</button>
        {inst.id !== 'apito' && (
          <button onClick={() => !isPistasOpen && useSequencerStore.getState().handleTrackHideToggle(track.id)} className={`w-5 h-5 cordel-border-sm cordel-button text-[9px] font-bold transition-all flex items-center justify-center ${isPistasOpen ? 'opacity-30 pointer-events-none' : 'cursor-pointer'} ${track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'}`} title={isPistasOpen ? (lang === 'fr' ? 'Disponible en vue Roda' : 'Disponível na vista Roda') : (track.isHidden ? (lang === 'fr' ? 'Afficher la piste' : 'Exibir pista') : (lang === 'fr' ? 'Masquer la piste' : 'Ocultar pista'))}>
            {track.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
        {inst.id !== 'apito' && (
          <button onClick={(e) => { e.stopPropagation(); if (!isPistasOpen) { (inst.type === 'voice' || isToada) ? toggleLetraActive() : toggleAoVivo(); } }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold transition-all flex items-center justify-center ${isPistasOpen ? 'opacity-30 pointer-events-none' : 'cursor-pointer'} ${(inst.type === 'voice' || isToada) ? (isLetraActive ? 'bg-[#c25e38] text-white shadow-[1px_1px_0px_#1a1a1a]' : 'bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]') : (isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]')}`} title={isPistasOpen ? (lang === 'fr' ? 'Disponible en vue Roda' : 'Disponível na vista Roda') : ((inst.type === 'voice' || isToada) ? (lang === 'fr' ? (isLetraActive ? 'Masquer la Letra' : 'Afficher la Letra') : (isLetraActive ? 'Ocultar Letra' : 'Exibir Letra')) : (lang === 'fr' ? 'Vue en direct' : 'Ao Vivo'))}>
            {(inst.type === 'voice' || isToada) ? <Mic className="w-3 h-3" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M11 22 L5 6" /><circle cx="4" cy="3" r="2.5" fill="currentColor" /><path d="M13 22 L19 6" /><circle cx="20" cy="3" r="2.5" fill="currentColor" /></svg>}
          </button>
        )}
      </div>

      <TrackInkVolumeSlider trackId={track.id} volumeVal={track.volumeVal} />
    </div>
  );
};
