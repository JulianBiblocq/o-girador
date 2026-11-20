import React from 'react';
import { Play, Square } from 'lucide-react';
import { Pattern, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { CordelMenuItem } from '../ui/CordelContextMenu';

export function resolveTrackMenuPatterns(
  track: TrackGroup,
  tracks: TrackGroup[]
): { ownerLabel?: string; patterns: Pattern[]; isVocalOrApito: boolean } {
  const isToada = isToadaBus(track);
  const inst = instrumentsConfig[track.instrumentIdx];
  const isVocalOrApito = Boolean(
    isToada || !inst || inst.type === 'voice' || inst.id === 'apito' || inst.id === 'puxador' || inst.id === 'coro'
  );

  if (isToada) {
    const pux = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const combined: Pattern[] = [];
    (pux?.patterns || []).forEach((p) => combined.push(p));
    (coro?.patterns || []).forEach((p) => {
      if (!combined.some((x) => x.id === p.id)) combined.push(p);
    });
    return { patterns: combined, isVocalOrApito: true };
  }

  if (isSlaveTrack(track, tracks)) {
    const master = resolveMasterTrack(track.id, tracks);
    if (master && master.patterns?.length) {
      return { ownerLabel: master.customName, patterns: master.patterns, isVocalOrApito };
    }
    const folder = tracks.find((t) => t.isLinkFolder && String(t.id) === String(track.linkedToTrackId));
    if (folder && folder.patterns?.length) {
      return { ownerLabel: folder.customName, patterns: folder.patterns, isVocalOrApito };
    }
  }

  return { patterns: track.patterns || [], isVocalOrApito };
}

export function buildTrackSoloMenuItems(params: {
  track: TrackGroup;
  tracks: TrackGroup[];
  lang: string;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  onPlaySolo: (patternId: number, variationId: string) => void;
  onStopSolo: () => void;
}): CordelMenuItem[] {
  const { track, tracks, lang, soloPatternPlayId, soloPatternVariationId, onPlaySolo, onStopSolo } = params;
  const isFr = lang === 'fr';
  const { patterns, isVocalOrApito } = resolveTrackMenuPatterns(track, tracks);
  if (patterns.length === 0) return [];

  const toggle = (patternId: number, variationId: string) => {
    const active =
      soloPatternPlayId !== null &&
      String(soloPatternPlayId) === String(patternId) &&
      (soloPatternVariationId || 'ensemble') === variationId;
    if (active) onStopSolo();
    else onPlaySolo(patternId, variationId);
  };

  const makeIcon = (isActive: boolean, size: number) =>
    React.createElement(isActive ? Square : Play, { size, className: 'fill-current shrink-0' });

  const subItems: CordelMenuItem[] = [];
  patterns.forEach((ptn, idx) => {
    const ptnLabel = ptn.name || `${isFr ? 'Motif' : 'Padrão'} ${idx + 1}`;
    const isPtnSolo = soloPatternPlayId !== null && String(soloPatternPlayId) === String(ptn.id);
    const isEnsemble = isPtnSolo && (soloPatternVariationId === 'ensemble' || soloPatternVariationId === null);
    const vars = !isVocalOrApito && Array.isArray(ptn.variations) ? ptn.variations : [];

    subItems.push({
      id: `solo-ptn-${ptn.id}`,
      label: isEnsemble ? `■ ${ptnLabel}` : `▶ ${ptnLabel}`,
      icon: makeIcon(isEnsemble, 12),
      onClick: () => toggle(ptn.id, 'ensemble'),
    });

    if (vars.length > 0) {
      const isBase = isPtnSolo && soloPatternVariationId === 'base';
      subItems.push({
        id: `solo-base-${ptn.id}`,
        label: `  ↳ ${isFr ? 'Phrase de base' : 'Frase de base'}`,
        icon: makeIcon(isBase, 11),
        onClick: () => toggle(ptn.id, 'base'),
      });
      vars.forEach((v) => {
        const isVar = isPtnSolo && String(soloPatternVariationId) === String(v.id);
        subItems.push({
          id: `solo-var-${ptn.id}-${v.id}`,
          label: `  ↳ ${v.name}`,
          icon: makeIcon(isVar, 11),
          onClick: () => toggle(ptn.id, v.id),
        });
      });
    }
  });

  return [
    {
      id: 'solo-listen-menu',
      label: isFr ? 'Écouter Motif / Variation' : 'Ouvir Padrão / Variação',
      icon: React.createElement(Play, { size: 14, className: 'shrink-0' }),
      subItems,
    },
    { isSeparator: true },
  ];
}
