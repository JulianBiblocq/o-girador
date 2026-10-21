import React from 'react';
import { GripHorizontal, Trash2 } from 'lucide-react';
import { ASSETS_BASE_URL } from '../../../data';
import { TrackGroup } from '../../../types';
import { useSequencer } from '../../../contexts/SequencerContext';
import { useSequencerStore } from '../../../stores/useSequencerStore';

interface ChannelStripHeaderProps {
  track: TrackGroup;
  inst: any;
  channelOrdinal?: string;
  midiFaderIndex?: number | null;
  isUnderMidiControl?: boolean;
  displayName: string;
  linkedSlavesTooltip?: string;
  onOpenDetailEditor?: (trackId: number) => void;
  attributes: any;
  listeners: any;
  isEditingName?: boolean;
  nameVal?: string;
  setNameVal?: (v: string) => void;
  handleRenameSubmit?: () => void;
  setIsEditingName?: (v: boolean) => void;
  customDeleteMessage?: string;
}

export const ChannelStripHeader: React.FC<ChannelStripHeaderProps> = ({
  track,
  inst,
  channelOrdinal,
  midiFaderIndex = null,
  isUnderMidiControl = false,
  displayName,
  linkedSlavesTooltip,
  onOpenDetailEditor,
  attributes,
  listeners,
  isEditingName = false,
  nameVal = '',
  setNameVal,
  handleRenameSubmit,
  setIsEditingName,
  customDeleteMessage,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);

  const handleDelete = async () => {
    const isBus = track.isLinkFolder || track.isBusFolder;
    const confirmMsg = customDeleteMessage || (
      isBus
        ? (lang === 'fr' ? `Supprimer définitivement le groupe "${displayName}" et toutes les pistes associées ?` : `Excluir definitivamente o grupo "${displayName}" e todas as faixas associadas?`)
        : (lang === 'fr' ? `Supprimer définitivement la piste "${displayName}" et tous ses motifs ?` : `Excluir definitivamente a faixa "${displayName}" e todos os seus padrões?`)
    );
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(track.id);
    }
  };

  return (
    <div className="relative p-1.5 pb-1 flex flex-col gap-1 border-b-[3px] border-[var(--cordel-border)] h-[76px] shrink-0 justify-between w-full" style={{ zIndex: 10 }}>
      <div className="flex justify-between items-center w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div {...attributes} {...listeners} className="flex items-center justify-center p-0.5 cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] transition-colors touch-none shrink-0" title={lang === 'fr' ? 'Glisser pour réorganiser' : 'Arrastar para reordenar'}>
            <GripHorizontal size={16} />
          </div>
          {channelOrdinal && (
            <span
              className={`font-mono text-[10px] font-bold tracking-tight select-none shrink-0 transition-colors ${
                isUnderMidiControl ? 'bg-[#ea580c] text-[#f4ecd8] px-1.5 py-0.5 rounded shadow-xs' : 'text-[var(--cordel-text)]/60 px-1 py-0.5'
              }`}
              title={isUnderMidiControl ? (midiFaderIndex ? `Contrôle physique actif (Fader ${midiFaderIndex})` : 'Contrôle physique actif') : undefined}
            >
              {channelOrdinal}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleDelete} className="w-5 h-5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[#f4ecd8] text-xs cursor-pointer" title={track.isBusFolder ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o grupo') : (lang === 'fr' ? 'Supprimer la piste' : 'Excluir a faixa')}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="relative flex items-center w-full h-6">
        {track.isLinkFolder || track.isBusFolder ? (
          isEditingName && setNameVal && handleRenameSubmit && setIsEditingName ? (
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              className="font-cactus font-bold text-[9px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-0.5 flex-1 outline-none w-full h-6"
              autoFocus
            />
          ) : (
            <div onClick={() => useSequencerStore.getState().handleToggleFoldBus(String(track.id))} className="flex items-center gap-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-1 py-1 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-center font-bold text-[9px] h-6">
              <span className="font-cactus truncate uppercase tracking-wider">{track.isFolded ? '▼' : '▶'} {track.customName || (track.isLinkFolder ? 'ALFAIAS' : 'Bus')}</span>
            </div>
          )
        ) : (
          <div onClick={() => onOpenDetailEditor?.(track.id)} className="flex items-center gap-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-1 py-1 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors w-full justify-between h-6" title={linkedSlavesTooltip || displayName}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <span className="font-cactus font-bold text-[9px] truncate">{displayName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
