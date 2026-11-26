import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Mic, Link2, ListMusic, Square } from 'lucide-react';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { TrackGroup } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { TrackInkVolumeSlider } from '../mixer/TrackInkVolumeSlider';
import { getTrackGroupVisual } from './trackGroupVisual';
import { TrackCardGroupIndicator } from './TrackCardGroupIndicator';
import { RodaTrackPatternMenu, resolveTrackMenuPatterns } from './RodaTrackPatternMenu';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../utils/colorHelpers';

interface WorkspaceTrackCardProps {
  track: TrackGroup; index: number; tracks: TrackGroup[]; isPistasOpen: boolean;
  onOpenDetailEditor: (trackId: number) => void;
  dragHandleProps?: { attributes: Record<string, any>; listeners: Record<string, any> | undefined };
}

export const WorkspaceTrackCard: React.FC<WorkspaceTrackCardProps> = ({
  track, index, tracks, isPistasOpen, onOpenDetailEditor, dragHandleProps,
}) => {
  const sequencer = useSequencer(), lang = useSequencerStore((s) => s.lang);
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode), isFocusActive = useSequencerStore((s) => s.isFocusActive);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId), toggleFocusMode = useSequencerStore((s) => s.toggleFocusMode);
  const setFocusTrackId = useSequencerStore((s) => s.setFocusTrackId), activeAoVivoTrackId = useSequencerStore((s) => s.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore((s) => s.setActiveAoVivoTrackId), isLetraActive = useSequencerStore((s) => s.isLetraActive);
  const toggleLetraActive = useSequencerStore((s) => s.toggleLetraActive), soloPatternPlayId = useTransportStore((s) => s.soloPatternPlayId);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  const isToada = Boolean(track.isBusFolder && (track.customName === 'Toada' || String(track.id) === 'toada'));
  const isHidden = useSequencerStore((s) => Boolean(s.tracks.find((t) => t.id === track.id)?.isHidden ?? track.isHidden));
  const isMute = useSequencerStore((s) => Boolean(s.tracks.find((t) => t.id === track.id)?.isMute ?? track.isMute));
  const isSolo = useSequencerStore((s) => Boolean(s.tracks.find((t) => t.id === track.id)?.isSolo ?? track.isSolo));
  const volumeVal = useSequencerStore((s) => s.tracks.find((t) => t.id === track.id)?.volumeVal ?? track.volumeVal);
  const inst = instrumentsConfig[track.instrumentIdx] || (isToada ? instrumentsConfig.find((i) => i.id === 'puxador' || i.type === 'voice') : null);
  const isFocusEligible = !track.isBusFolder && !track.isLinkFolder && !isToada && !!inst && inst.id !== 'apito' && inst.id !== 'puxador' && inst.id !== 'coro' && inst.type !== 'voice';
  const isCurrentFocus = isFocusActive && focusTrackId === track.id;
  const isCardDimmed = !isPistasOpen && isFocusActive && isHidden && !isCurrentFocus;

  const displayName = useMemo(() => isToada ? 'Toada' : (!inst ? 'Instrument' : useNomenclatureStore.getState().getInstrumentLabel(track)), [isToada, inst, track]);
  const groupVisual = useMemo(() => getTrackGroupVisual(track, tracks), [track, tracks]);
  const menuPatterns = useMemo(() => resolveTrackMenuPatterns(track, tracks).patterns, [track, tracks]);
  const isTrackSolo = useMemo(() => soloPatternPlayId !== null && menuPatterns.some((p) => String(p.id) === String(soloPatternPlayId)), [soloPatternPlayId, menuPatterns]);

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPracticeMode) { onOpenDetailEditor(track.id); return; }
    if (!isFocusEligible) return;
    if (isFocusActive && focusTrackId !== track.id) setFocusTrackId(track.id); else toggleFocusMode(track.id);
  };

  const handleDelete = async () => {
    const trackName = displayName || inst?.name || (lang === 'fr' ? 'cette piste' : 'esta faixa');
    const childCount = tracks.filter((t) => String(t.busId) === String(track.id)).length;
    const msg = track.isBusFolder && childCount > 0
      ? (lang === 'fr' ? `Attention : le bus "${trackName}" contient ${childCount} piste(s). Supprimer ?` : `Atenção: o bus "${trackName}" contém ${childCount} faixa(s). Remover?`)
      : (lang === 'fr' ? `Supprimer définitivement la piste "${trackName}" et tous ses motifs ?` : `Excluir definitivamente a faixa "${trackName}"?`);
    if (await sequencer.confirmAsync(msg)) useSequencerStore.getState().handleTrackDelete(track.id);
  };

  const isAoVivo = activeAoVivoTrackId === track.id;
  const toggleAoVivo = async () => {
    if (useSequencerStore.getState().isEcoMode) {
      await sequencer.alertAsync(lang === 'pt' ? 'Modo de economia ativado: Animações desativadas.' : 'Mode éco activé : Animations désactivées.');
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  if (!inst) return null;
  const badgeBg = getInstrumentPrimaryStrongColor(inst, track), badgeText = getContrastColor(badgeBg);
  const idleBtn = 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)]';

  return (
    <div
      onContextMenu={(e) => { if (!menuPatterns.length) return; e.preventDefault(); e.stopPropagation(); setMenuAnchor({ top: e.clientY, left: e.clientX }); }}
      className={`flex flex-col justify-between w-full h-[52px] min-h-[52px] max-h-[52px] shrink-0 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] px-2 pt-[6px] relative z-10 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] select-none transition-opacity duration-200 ${isCardDimmed ? 'opacity-40' : 'opacity-100'}`}
    >
      <TrackCardGroupIndicator visual={groupVisual} />
      <div className="flex items-center justify-between w-full h-[28px] min-h-[28px] max-h-[28px]">
        <div className="flex items-center gap-1 min-w-0 flex-1 mr-1.5">
          <div {...dragHandleProps?.attributes} {...dragHandleProps?.listeners} className="transition-colors p-0.5 touch-none flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--cordel-ink-dark)]/60 hover:text-[var(--cordel-ink-dark)]">
            <GripVertical size={14} />
          </div>
          <button
            onClick={handleBadgeClick} style={{ backgroundColor: badgeBg, color: badgeText }}
            className={`xilo-wood-stamp flex items-center gap-1 cordel-border-sm cordel-button px-1.5 py-0.5 text-xs transition-all h-[28px] min-h-[28px] ${isPracticeMode ? 'flex-1 min-w-0' : 'w-[100px] shrink-0'} ${(!isPracticeMode || isFocusEligible) ? 'cursor-pointer' : 'cursor-default'} ${isCurrentFocus ? 'ring-2 ring-[var(--cordel-ink-dark)] shadow-inner font-black' : ''}`}
          >
            <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-3.5 h-3.5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[11px] font-cactus font-black leading-tight truncate block text-left flex-1">{index + 1}. {displayName}</span>
            {(track.sectionPlayers?.length ?? 0) > 1 && (
              <span className="font-mono text-[9px] font-black px-1 py-0.5 rounded-xs bg-black/20 leading-none shrink-0">
                ×{track.sectionPlayers!.length}
              </span>
            )}
            {groupVisual?.isSlave && <Link2 size={10} className="shrink-0 opacity-70" />}
          </button>
          {menuPatterns.length > 0 && (
            <button
              type="button" data-testid={`roda-track-pattern-menu-btn-${track.id}`}
              onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenuAnchor((p) => (p ? null : { top: r.bottom + 4, left: r.left })); }}
              className={`flex items-center justify-center w-5 h-5 cordel-border-sm cordel-button cursor-pointer transition-colors shrink-0 ${isTrackSolo ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : idleBtn}`}
              title={lang === 'fr' ? 'Écouter Motif / Variation' : 'Ouvir Padrão / Variação'}
            >
              {isTrackSolo ? <Square className="w-2.5 h-2.5 fill-current" /> : <ListMusic className="w-3 h-3" />}
            </button>
          )}
          {!isPracticeMode && (
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className={`flex items-center justify-center w-5 h-5 cordel-border-sm cordel-button cursor-pointer transition-colors shrink-0 ${idleBtn}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex gap-1 items-center shrink-0">
          <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleRodaTrackMuteToggle(track.id); }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${(isMute && !isSolo) ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : idleBtn}`}>M</button>
          <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleRodaTrackSoloToggle(track.id); }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold text-[10px] flex items-center justify-center transition-all ${isSolo ? 'bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)]' : idleBtn}`}>S</button>
          {inst.id !== 'apito' ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().handleTrackHideToggle(track.id); }} className={`w-5 h-5 cordel-border-sm cordel-button text-[9px] font-bold transition-all flex items-center justify-center cursor-pointer ${isHidden ? 'bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)]' : idleBtn}`}>
                {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (!isPistasOpen) { (inst.type === 'voice' || isToada) ? toggleLetraActive() : toggleAoVivo(); } }} className={`w-5 h-5 cordel-border-sm cordel-button font-bold transition-all flex items-center justify-center ${isPistasOpen ? 'opacity-30 pointer-events-none' : 'cursor-pointer'} ${(inst.type === 'voice' || isToada) ? (isLetraActive ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : idleBtn) : (isAoVivo ? 'bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)]' : idleBtn)}`}>
                {(inst.type === 'voice' || isToada) ? <Mic className="w-3 h-3" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M11 22 L5 6" /><circle cx="4" cy="3" r="2.5" fill="currentColor" /><path d="M13 22 L19 6" /><circle cx="20" cy="3" r="2.5" fill="currentColor" /></svg>}
              </button>
            </>
          ) : (<><div className="w-5 h-5 invisible shrink-0" aria-hidden="true" /><div className="w-5 h-5 invisible shrink-0" aria-hidden="true" /></>)}
        </div>
      </div>
      <div className="h-[14px] min-h-[14px] max-h-[14px] w-full flex items-center relative">
        <TrackInkVolumeSlider trackId={track.id} volumeVal={volumeVal} />
      </div>
      {menuAnchor && <RodaTrackPatternMenu track={track} tracks={tracks} anchorPos={menuAnchor} onClose={() => setMenuAnchor(null)} />}
    </div>
  );
};
