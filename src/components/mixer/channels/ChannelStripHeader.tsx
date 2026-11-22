import React from 'react';
import { GripHorizontal, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { ASSETS_BASE_URL } from '../../../data';
import { TrackGroup } from '../../../types';
import { useSequencer } from '../../../contexts/SequencerContext';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../../utils/colorHelpers';
import { useTrackLinkRoleBadge } from './useTrackLinkRoleBadge';

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
  track, inst, channelOrdinal, midiFaderIndex = null, isUnderMidiControl = false,
  displayName, linkedSlavesTooltip, onOpenDetailEditor, attributes, listeners,
  isEditingName = false, nameVal = '', setNameVal, handleRenameSubmit, setIsEditingName, customDeleteMessage,
}) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore((state) => state.lang);
  const roleBadge = useTrackLinkRoleBadge(track.id);
  const badgeBg = getInstrumentPrimaryStrongColor(inst, track);
  const badgeText = getContrastColor(badgeBg);
  const isBus = Boolean(track.isLinkFolder || track.isBusFolder);

  const handleDelete = async () => {
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
                isUnderMidiControl ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] px-1.5 py-0.5 rounded shadow-xs' : 'text-[var(--cordel-text)]/60 px-1 py-0.5'
              }`}
              title={isUnderMidiControl ? (midiFaderIndex ? `Contrôle physique actif (Fader ${midiFaderIndex})` : 'Contrôle physique actif') : undefined}
            >
              {channelOrdinal}
            </span>
          )}
        </div>
        <button onClick={handleDelete} className="w-5 h-5 bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-parchment-bg)] text-xs cursor-pointer shrink-0" title={track.isBusFolder ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir o grupo') : (lang === 'fr' ? 'Supprimer la piste' : 'Excluir a faixa')}>
          <Trash2 size={11} />
        </button>
      </div>

      <div className="relative flex items-center w-full h-6">
        {isBus ? (
          isEditingName && setNameVal && handleRenameSubmit && setIsEditingName ? (
            <input
              type="text" value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={handleRenameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsEditingName(false); }}
              className="font-cactus font-bold text-[9px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-1 py-0.5 flex-1 outline-none w-full h-6" autoFocus
            />
          ) : (
            <div
              onClick={() => useSequencerStore.getState().handleToggleFoldBus(String(track.id))}
              className="xilo-wood-stamp flex items-center gap-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm px-1 py-1 cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors w-full justify-center font-bold text-[9px] h-6"
              title={lang === 'fr' ? 'Clic gauche : plier/déplier | Clic droit : menu' : 'Clique esquerdo : recolher/expandir | Clique direito : menu'}
            >
              {track.isFolded ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
              <span className="font-cactus truncate uppercase tracking-wider">{track.customName || (track.isLinkFolder ? 'ALFAIAS' : 'Bus')}</span>
            </div>
          )
        ) : (
          <div
            onClick={() => onOpenDetailEditor?.(track.id)} style={{ backgroundColor: badgeBg, color: badgeText }}
            className="xilo-wood-stamp flex items-center gap-1 cordel-border-sm cordel-button px-1 py-1 cursor-pointer transition-opacity hover:opacity-90 w-full justify-between h-6"
            title={linkedSlavesTooltip || displayName}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-4 h-4 object-contain shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <span className="font-cactus font-black text-[9px] truncate">{displayName}</span>
            </div>
            {roleBadge === 'M' && (
              <span data-testid="track-role-master-badge" title={lang === 'fr' ? 'Piste Maître du groupe lié' : 'Faixa Mestre do grupo vinculado'} className="px-1 py-px bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] border border-[var(--cordel-parchment-bg)]/60 font-mono text-[7.5px] font-black leading-none flex items-center gap-0.5 shrink-0">
                <svg className="w-2 h-2 shrink-0" viewBox="0 0 10 10"><polygon points="5,0.6 9.4,5 5,9.4 0.6,5" fill="currentColor" /></svg>
                <span>M</span>
              </span>
            )}
            {roleBadge.startsWith('S:') && (
              <span data-testid="track-role-slave-badge" title={lang === 'fr' ? `Piste Esclave liée à ${roleBadge.slice(2)}` : `Faixa Escrava vinculada a ${roleBadge.slice(2)}`} className="px-1 py-px bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] font-mono text-[7.5px] font-black leading-none flex items-center gap-0.5 shrink-0">
                <svg className="w-2 h-2 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 1.5v4.5h5.5M5.5 4l2.2 2-2.2 2" /></svg>
                <span>{roleBadge.slice(2)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
