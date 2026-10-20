/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { XiloLightning } from '../XiloIcons';
import { CordelTarget } from '../ui/CordelTarget';
import { instrumentsConfig } from '../../data';

import { useSequencerStore, selectTracksMeta } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';

interface TransportSpeedTrainerButtonProps {
  isSpeedTrainerActive: boolean;
  speedTrainerTourCount: number;
  speedTrainerCurrentBpm: number;
  speedTrainerCountdown: number | null;
  tocarJuntoActive: boolean;
  tocarJuntoTrackId: number | null;
  storeTracks?: any[];
  openSpeedTrainerModal: () => void;
  lang: string;
}

export const TransportSpeedTrainerButton: React.FC<TransportSpeedTrainerButtonProps> = ({
  isSpeedTrainerActive,
  speedTrainerTourCount,
  speedTrainerCurrentBpm,
  speedTrainerCountdown,
  tocarJuntoActive,
  tocarJuntoTrackId,
  openSpeedTrainerModal,
  lang,
}) => {
  const targetTrack = useSequencerStore(useShallow((state) => {
    if (!tocarJuntoActive || !tocarJuntoTrackId) return null;
    const meta = selectTracksMeta(state).find(t => t.id === tocarJuntoTrackId);
    return meta ? { customName: meta.customName, instrumentIdx: meta.instrumentIdx } : null;
  }));
  const targetInst = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const trackLabel = targetTrack?.customName || targetInst?.name || (lang === 'fr' ? 'Pupitre' : 'Naipe');

  if (isSpeedTrainerActive && tocarJuntoActive) {
    return (
      <button
        type="button"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-amber-500 bg-[#c25e38] text-white shadow-[2px_2px_0px_#1a1a1a] cursor-pointer animate-pulse"
        title={lang === 'fr' ? `Entraînement combiné (${trackLabel} + ${speedTrainerCurrentBpm} BPM). Cliquez pour configurer.` : `Treino combinado (${trackLabel} + ${speedTrainerCurrentBpm} BPM). Clique para configurar.`}
      >
        <CordelTarget size={15} className="shrink-0 text-white" />
        <span className="font-cactus font-bold text-xs text-white">{speedTrainerCurrentBpm} BPM</span>
      </button>
    );
  }

  if (tocarJuntoActive) {
    return (
      <button
        type="button"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[#1a1a1a] dark:border-black/60 bg-[#c25e38] text-white shadow-[2px_2px_0px_#1a1a1a] cursor-pointer hover:brightness-110"
        title={lang === 'fr' ? `Jouer avec : ${trackLabel} (audio muet). Cliquez pour ajuster le pupitre.` : `Tocar Junto: ${trackLabel} (áudio mudo). Clique para ajustar o naipe.`}
      >
        <CordelTarget size={15} className="shrink-0 text-white" />
        <span className="truncate max-w-[90px] sm:max-w-[140px] text-white">{trackLabel}</span>
      </button>
    );
  }

  if (isSpeedTrainerActive) {
    return (
      <button
        type="button"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-amber-600 bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-[2px_2px_0px_#1a1a1a] cursor-pointer animate-pulse"
        title={lang === 'fr' ? `Speed Trainer actif : Tour ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Cliquez pour ouvrir.` : `Treino ativo: Volta ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Clique para abrir.`}
      >
        <XiloLightning size={14} className="shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="font-cactus font-bold text-[11px] sm:text-xs">
          {speedTrainerCountdown !== null ? speedTrainerCountdown : (lang === 'fr' ? `T${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm} BPM` : `V${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm} BPM`)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openSpeedTrainerModal}
      className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[#1a1a1a] dark:border-black/60 bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10 shadow-[1px_1px_0px_#1a1a1a] cursor-pointer"
      title={lang === 'fr' ? 'Entraînement (Jouer avec / Montée en vitesse)' : 'Treino (Tocar Junto / Aceleração)'}
    >
      <XiloLightning size={14} className="shrink-0" />
      <span className="hidden lg:inline text-[var(--cordel-text)]">{lang === 'fr' ? 'Entraînement' : 'Treino'}</span>
    </button>
  );
};
