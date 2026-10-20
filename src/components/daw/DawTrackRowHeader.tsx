import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { useSequencerStore, isToadaBus } from '../../stores/useSequencerStore';
import { XiloChisel } from '../XiloIcons';

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
  isChild,
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
    let confirmMsg: string;
    if (isBus && childTracks.length > 0) {
      confirmMsg = lang === 'fr'
        ? `Attention : le bus "${trackName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?`
        : `Atenção: o bus "${trackName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`;
    } else {
      confirmMsg = lang === 'fr'
        ? `Supprimer définitivement la piste "${trackName}" et tous ses motifs ?`
        : `Excluir definitivamente a faixa "${trackName}" e todos os seus padrões?`;
    }
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(track.id);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 w-[360px] min-w-[360px] h-[76px] min-h-[76px] shrink-0 border-r border-[#1a1a1a]/20 pr-3 relative z-[2] ${isChild ? 'pl-8' : 'pl-3'}`}>
      <div className="flex items-center gap-2">
        {!isChild ? (
          <div {...listeners} {...attributes} className="mr-2 transition-colors p-1 touch-none flex-shrink-0 text-[#1a1a1a]/60 hover:text-[#1a1a1a] cursor-grab active:cursor-grabbing" title={lang === 'fr' ? 'Glisser pour réordonner la piste' : 'Arrastar para reordenar a faixa'}>
            <GripVertical size={16} />
          </div>
        ) : (
          <div className="w-6 mr-2 flex-shrink-0" />
        )}

        <div className="relative flex items-center">
          <button
            onClick={() => {
              if (track.isBusFolder && !isToada && !track.isLinkFolder) {
                useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
                return;
              }
              const targetTrack = isToada
                ? (activeChildTrack || tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || track)
                : track;
              useSequencerStore.getState().setEditingTrackId(targetTrack.id);
            }}
            className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[10px] cursor-pointer transition-colors w-[180px] sm:w-[190px]"
            style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
            title={lang === 'pt' ? 'Editar instrumento' : "Éditer l'instrument"}
          >
            <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="font-cactus font-bold text-center leading-normal flex-1 truncate">{trackIdx + 1}. {displayName}</span>
            {(!track.isBusFolder || isToada || track.isLinkFolder) && (
              <span className="flex-shrink-0 opacity-70"><XiloChisel size={11} /></span>
            )}
          </button>
        </div>

        <button onClick={handleDelete} className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]" title={lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'}>
          <Trash2 size={13} />
        </button>

        {(track.isLinkMaster || isToada) && (
          <button
            onClick={() => {
              if (isToada) {
                useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
              } else if (track.isLinkMaster && track.linkedToTrackId) {
                const parentBus = tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
                if (parentBus) useSequencerStore.getState().handleToggleSequencerFoldBus(String(parentBus.id));
              }
            }}
            className="ml-1 p-0.5 hover:bg-black/10 rounded cursor-pointer text-[10px] font-bold shrink-0 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-black"
            title={(() => {
              const isCollapsed = isToada
                ? track.isSequencerFolded
                : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
              return isCollapsed ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar');
            })()}
          >
            {(() => {
              const isCollapsed = isToada
                ? track.isSequencerFolded
                : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
              return isCollapsed ? '▶' : '▼';
            })()}
          </button>
        )}
      </div>
    </div>
  );
};
