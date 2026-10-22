import React, { useMemo } from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Mic, Link } from 'lucide-react';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { useSequencerStore, selectTracksMeta } from '../../stores/useSequencerStore';
import type { TrackGroup as Track } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { getBusColor, getTopParentBusId } from '../../utils/colorHelpers';

interface TrackMixerHeaderProps {
  track: Track;
  index: number;
  inst: any;
  isToada: boolean;
  onOpenDetailEditor: (trackId: number) => void;
  dragHandleProps: {
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
  };
}

export const TrackMixerHeader: React.FC<TrackMixerHeaderProps> = ({
  track,
  index,
  inst,
  isToada,
  onOpenDetailEditor,
  dragHandleProps,
}) => {
  const sequencer = useSequencer();
  const { alertAsync } = sequencer;
  const lang = useSequencerStore(state => state.lang);
  const tracks = useSequencerStore(selectTracksMeta);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const isLetraActive = useSequencerStore(state => state.isLetraActive);
  const toggleLetraActive = useSequencerStore(state => state.toggleLetraActive);

  const isMaster = useMemo(() => tracks.some(t => String(t.linkedToTrackId) === String(track.id)), [tracks, track.id]);
  const isChild = useMemo(() => !!((track.busId || track.linkedToTrackId) && !track.isBusFolder), [track]);

  const parentBusName = useMemo(() => {
    if (!isChild) return null;
    const pId = track.busId || track.linkedToTrackId;
    const p = tracks.find(t => String(t.id) === String(pId));
    if (!p) return 'Bus';
    if (p.customName) return p.customName;
    if (p.isLinkFolder) return 'ALFAIAS';
    return instrumentsConfig[p.instrumentIdx]?.name || 'Bus';
  }, [track, isChild, tracks]);

  const displayName = useMemo(() => {
    if (isToada) return 'Toada';
    if (!inst) return 'Instrument';
    if (isMaster) {
      const getPluralName = (n: string) => n.includes('Alfaia') ? 'Alfaias' : n === 'Caixa' ? 'Caixas' : n === 'Tarol' ? 'Tarols' : n === 'Agbê' ? 'Agbês' : n === 'Mineiro' ? 'Mineiros' : n === 'Gonguê' ? 'Gonguês' : n + 's';
      return getPluralName(inst.name);
    }
    return useNomenclatureStore.getState().getInstrumentLabel(track);
  }, [isToada, inst, isMaster, track]);

  const handleDeleteTrack = async () => {
    const isBus = track.isBusFolder;
    const childTracks = tracks.filter(t => String(t.busId) === String(track.id));
    const trackDisplayName = track.customName || inst?.name || (lang === 'fr' ? 'cette piste' : 'esta faixa');
    const confirmMsg = isBus && childTracks.length > 0
      ? (lang === 'fr' ? `Attention : le bus "${trackDisplayName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?` : `Atenção: o bus "${trackDisplayName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`)
      : (lang === 'fr' ? `Supprimer définitivement la piste "${trackDisplayName}" et tous ses motifs ?` : `Excluir definitivamente a faixa "${trackDisplayName}" e todos os seus padrões?`);
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(track.id);
    }
  };

  const isAoVivo = activeAoVivoTrackId === track.id;
  const toggleAoVivo = async () => {
    if (useSequencerStore.getState().isEcoMode) {
      await alertAsync(lang === 'pt' ? 'Modo de economia ativado: As animações (AoVivo) foram desativadas para preservar o desempenho.' : 'Mode éco activé : Les animations (AoVivo) ont été désactivées pour préserver les performances.');
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  return (
    <div className="flex justify-between items-center relative z-[2]">
      <div className="flex items-center gap-1.5">
        <div {...dragHandleProps.attributes} {...dragHandleProps.listeners} className="transition-colors p-1 touch-none flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)]" title={lang === 'fr' ? 'Glisser pour réorganiser' : 'Arrastar para reordenar'}>
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
                const master = tracks.find(t => String(t.linkedToTrackId) === String(track.id) && t.isLinkMaster);
                if (master) targetId = master.id;
              } else if (isToada) {
                const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
                if (coro) targetId = coro.id;
              }
              onOpenDetailEditor(targetId);
            }}
            className="flex items-center gap-2 cordel-border-sm cordel-button px-2 py-0.5 text-xs cursor-pointer transition-colors w-[130px] h-[38px] min-h-[38px] shrink-0"
            style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
            title={lang === 'pt' ? 'Editar instrumento' : "Éditer l'instrument"}
          >
            <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <div className="flex flex-col justify-center flex-1 min-w-0 text-left">
              {isChild && parentBusName && (
                <span className="text-[8px] uppercase tracking-wider opacity-75 leading-tight truncate flex items-center gap-0.5" style={{ color: inst.colors.text }}>
                  <Link className="w-2.5 h-2.5 shrink-0" /> {parentBusName}
                </span>
              )}
              <span className="text-xs font-cactus font-black leading-tight truncate block">{index + 1}. {displayName}</span>
            </div>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteTrack(); }} className="ml-1.5 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]" title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackMuteToggle(track.id); }} className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${(track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>M</button>
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackSoloToggle(track.id); }} className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>S</button>
        {inst.id !== 'apito' && (
          <button onClick={() => useSequencerStore.getState().handleTrackHideToggle(track.id)} className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'}`} title={lang === 'fr' ? 'Masquer la piste' : 'Ocultar pista'}>
            {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        {inst.id !== 'apito' && (
          <button onClick={(e) => { e.stopPropagation(); (inst.type === 'voice' || isToada) ? toggleLetraActive() : toggleAoVivo(); }} className={`w-6 h-6 cordel-border-sm cordel-button font-bold cursor-pointer transition-all flex items-center justify-center ${(inst.type === 'voice' || isToada) ? (isLetraActive ? 'bg-[#c25e38] text-white shadow-[1px_1px_0px_#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]') : (isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]')}`} title={(inst.type === 'voice' || isToada) ? (lang === 'fr' ? (isLetraActive ? 'Masquer la Letra' : 'Afficher la Letra') : (isLetraActive ? 'Ocultar Letra' : 'Exibir Letra')) : (lang === 'fr' ? 'Vue en direct (Baguettes)' : 'Ao Vivo (Visão das baquetas)')}>
            {(inst.type === 'voice' || isToada) ? <Mic className="w-3.5 h-3.5" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 22 L5 6" /><circle cx="4" cy="3" r="2.5" fill="currentColor" /><path d="M13 22 L19 6" /><circle cx="20" cy="3" r="2.5" fill="currentColor" /></svg>}
          </button>
        )}
        {inst.id === 'apito' && <><div className="w-6 h-6 pointer-events-none" /><div className="w-6 h-6 pointer-events-none" /></>}
      </div>
    </div>
  );
};
