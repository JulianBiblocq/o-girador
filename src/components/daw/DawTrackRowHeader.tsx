import React from 'react';
import { GripVertical, Trash2, Eye, Mic } from 'lucide-react';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { useSequencerStore, isToadaBus } from '../../stores/useSequencerStore';
import { TrackInkVolumeSlider } from '../mixer/TrackInkVolumeSlider';

interface DawTrackRowHeaderProps {
  track: TrackGroup;
  trackIdx: number;
  displayName: string;
  inst: any;
  isChild: boolean;
  lang: string;
  listeners: any;
  attributes: any;
  activeChildTrack: TrackGroup | null;
  tracks: TrackGroup[];
  sequencer: any;
}

export const DawTrackRowHeader: React.FC<DawTrackRowHeaderProps> = ({
  track,
  trackIdx,
  displayName,
  inst,
  lang,
  listeners,
  attributes,
  activeChildTrack,
  tracks,
  sequencer,
}) => {
  const isToada = isToadaBus(track);

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

  return (
    <div className="flex items-center justify-between w-[360px] min-w-[360px] max-w-[360px] h-[58px] min-h-[58px] max-h-[58px] shrink-0 border-r border-[var(--cordel-border,#1a1a1a)]/20 px-3 relative z-[2]">
      <div className="flex items-center gap-1.5">
        <div {...listeners} {...attributes} className="transition-colors p-1 touch-none flex-shrink-0 text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] cursor-grab active:cursor-grabbing" title={lang === 'fr' ? 'Glisser pour réorganiser' : 'Arrastar para reordenar'}>
          <GripVertical size={16} />
        </div>

        <div className="relative flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const targetTrack = isToada
                ? (activeChildTrack || tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro') || track)
                : track;
              useSequencerStore.getState().setEditingTrackId(targetTrack.id);
            }}
            className="flex items-center gap-2 cordel-border-sm cordel-button px-2 py-0.5 text-xs cursor-pointer transition-colors w-[130px] h-[38px] min-h-[38px] shrink-0"
            style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
            title={lang === 'pt' ? 'Editar instrumento' : "Éditer l'instrument"}
          >
            <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <div className="flex flex-col justify-center flex-1 min-w-0 text-left">
              <span className="text-xs font-cactus font-black leading-tight truncate block">{trackIdx + 1}. {displayName}</span>
            </div>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="ml-1.5 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]" title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackMuteToggle(track.id); }} className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${(track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>M</button>
        <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackSoloToggle(track.id); }} className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>S</button>
        {inst.id !== 'apito' && (
          <button disabled className="w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold flex items-center justify-center opacity-30 cursor-not-allowed bg-[var(--cordel-bg)] text-[var(--cordel-text)]" title={lang === 'fr' ? 'Disponible en vue Roda' : 'Disponível na vista Roda'}>
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {inst.id !== 'apito' && (
          <button disabled className="w-6 h-6 cordel-border-sm cordel-button font-bold flex items-center justify-center opacity-30 cursor-not-allowed bg-[var(--cordel-bg)] text-[var(--cordel-text)]" title={lang === 'fr' ? 'Disponible en vue Roda' : 'Disponível na vista Roda'}>
            {(inst.type === 'voice' || isToada) ? <Mic className="w-3.5 h-3.5" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 22 L5 6" /><circle cx="4" cy="3" r="2.5" fill="currentColor" /></svg>}
          </button>
        )}
        {inst.id === 'apito' && <><div className="w-6 h-6 pointer-events-none" /><div className="w-6 h-6 pointer-events-none" /></>}
      </div>

      <TrackInkVolumeSlider trackId={track.id} volumeVal={track.volumeVal} />
    </div>
  );
};
