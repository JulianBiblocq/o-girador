import React from 'react';
import { Edit3 } from 'lucide-react';
import { CordelContextMenu, CordelMenuItem } from '../ui/CordelContextMenu';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { getPasteDisabledReason } from '../../utils/patternPasteNormalizer';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useTransportStore } from '../../stores/useTransportStore';
import { XiloTarget } from '../XiloIcons';
import { buildTrackSoloMenuItems } from './buildTrackSoloMenuItems';

export interface TrackContextMenuProps {
  trackId: number;
  x: number;
  y: number;
  onClose: () => void;
  onRename?: () => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  trackId, x, y, onClose, onRename,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const soloPatternPlayId = useTransportStore((s) => s.soloPatternPlayId);
  const soloPatternVariationId = useTransportStore((s) => s.soloPatternVariationId);
  const lang = useSequencerStore((state) => state.lang);
  const track = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId));
  const tracks = useSequencerStore((state) => state.tracks);
  const clipboard = useSequencerStore((state) => state.instrumentPatternsClipboard);
  const copyAllTrackPatterns = useSequencerStore((state) => state.copyAllTrackPatterns);
  const pasteAllTrackPatterns = useSequencerStore((state) => state.pasteAllTrackPatterns);
  const duplicateTrack = useSequencerStore((state) => state.duplicateTrack);

  if (!track) return null;

  const isPureBus = Boolean(track.isBusFolder && !track.isLinkFolder);
  const inst = instrumentsConfig[track.instrumentIdx];
  const trackDisplayName = track.customName || (isPureBus ? 'Bus' : inst?.name) || (lang === 'fr' ? 'Piste' : 'Faixa');
  const isCompatible = clipboard ? canTransferPatterns(clipboard, track, tracks) : false;
  const targetInstId = resolveTrackInstrumentId(track, tracks);

  const handleDelete = async () => {
    const childTracks = tracks.filter((t) => String(t.busId) === String(trackId));
    const confirmMsg = track.isBusFolder && childTracks.length > 0
      ? (lang === 'fr'
        ? `Attention : le bus "${trackDisplayName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?`
        : `Atenção: o bus "${trackDisplayName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`)
      : (lang === 'fr'
        ? `Supprimer définitivement la piste "${trackDisplayName}" et tous ses motifs ?`
        : `Excluir definitivamente a faixa "${trackDisplayName}" e todos os seus padrões?`);
    if (await sequencer.confirmAsync(confirmMsg)) {
      useSequencerStore.getState().handleTrackDelete(trackId);
    }
  };

  const handleRenameClick = () => {
    onClose();
    requestAnimationFrame(() => { onRename?.(); });
  };

  const items: CordelMenuItem[] = [];

  if (onRename) {
    items.push({
      id: 'rename-track',
      label: lang === 'fr' ? 'Renommer' : 'Renomear',
      icon: <Edit3 size={15} className="shrink-0" />,
      onClick: handleRenameClick,
    });
    items.push({ isSeparator: true });
  }

  if (!isPureBus) {
    items.push(...buildTrackSoloMenuItems({
      track, tracks, lang, soloPatternPlayId, soloPatternVariationId,
      onPlaySolo: (pId, vId) => audio.handleStartSoloPattern?.(pId, vId),
      onStopSolo: () => audio.handleStopSoloPattern?.(),
    }));
    items.push({
      id: 'train-track',
      label: lang === 'fr' ? "S'entraîner sur ce pupitre (Jouer avec)" : 'Treinar neste naipe (Tocar Junto)',
      icon: <XiloTarget size={16} className="shrink-0" />,
      onClick: () => { useSequencerStore.getState().activateFocusOnTrack(trackId); },
    });
    items.push({ isSeparator: true });
    items.push({
      id: 'copy-patterns',
      label: lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos os padrões',
      icon: '',
      onClick: () => copyAllTrackPatterns(trackId),
    });
    items.push({
      id: 'paste-patterns',
      label: lang === 'fr' ? 'Coller les motifs' : 'Colar padrões',
      icon: '',
      disabled: !clipboard || !isCompatible,
      disabledReason: getPasteDisabledReason(Boolean(clipboard), isCompatible, lang, clipboard?.sourceInstId || clipboard?.sourceFamily, targetInstId),
      subItems: (clipboard && isCompatible) ? [
        { id: 'paste-bank', label: lang === 'fr' ? 'Banque seule' : 'Apenas banco', icon: '', onClick: () => pasteAllTrackPatterns(trackId, 'libraryOnly') },
        { id: 'paste-full', label: lang === 'fr' ? 'Banque + Timeline' : 'Banco + Linha do tempo', icon: '', onClick: () => pasteAllTrackPatterns(trackId, 'libraryAndTimeline') },
      ] : undefined,
    });
    items.push({
      id: 'duplicate-track',
      label: lang === 'fr' ? 'Dupliquer la piste complète' : 'Duplicar faixa completa',
      icon: '',
      onClick: () => duplicateTrack(trackId),
    });
    items.push({ isSeparator: true });
  }

  items.push({
    id: 'delete-track',
    label: isPureBus ? (lang === 'fr' ? 'Supprimer le groupe' : 'Excluir grupo') : (lang === 'fr' ? 'Supprimer la piste' : 'Excluir faixa'),
    icon: '',
    isDestructive: true,
    onClick: handleDelete,
  });

  return <CordelContextMenu x={x} y={y} title={trackDisplayName} items={items} onClose={onClose} />;
};
