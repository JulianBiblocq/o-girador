
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
        data-tour-id="transport-speed-trainer"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 shrink-0 whitespace-nowrap flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[var(--cordel-gold)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer animate-pulse"
        title={lang === 'fr' ? `Entraînement combiné (${trackLabel} + ${speedTrainerCurrentBpm} BPM). Cliquez pour configurer.` : `Treino combinado (${trackLabel} + ${speedTrainerCurrentBpm} BPM). Clique para configurar.`}
      >
        <CordelTarget size={15} className="shrink-0 text-[var(--cordel-on-accent)]" />
        <span className="font-cactus font-bold text-xs text-[var(--cordel-on-accent)] shrink-0 whitespace-nowrap">{speedTrainerCurrentBpm} BPM</span>
      </button>
    );
  }

  if (tocarJuntoActive) {
    return (
      <button
        type="button"
        data-tour-id="transport-speed-trainer"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 shrink-0 whitespace-nowrap flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer hover:brightness-110"
        title={lang === 'fr' ? `Jouer avec : ${trackLabel} (audio muet). Cliquez pour ajuster le pupitre.` : `Tocar Junto: ${trackLabel} (áudio mudo). Clique para ajustar o naipe.`}
      >
        <CordelTarget size={15} className="shrink-0 text-[var(--cordel-on-accent)]" />
        <span className="truncate max-w-[90px] sm:max-w-[140px] text-[var(--cordel-on-accent)] shrink-0">{trackLabel}</span>
      </button>
    );
  }

  if (isSpeedTrainerActive) {
    return (
      <button
        type="button"
        data-tour-id="transport-speed-trainer"
        onClick={openSpeedTrainerModal}
        className="h-8 px-2 sm:px-2.5 shrink-0 whitespace-nowrap flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[var(--cordel-gold)] bg-[var(--cordel-gold)]/20 text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer animate-pulse"
        title={lang === 'fr' ? `Speed Trainer actif : Tour ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Cliquez pour ouvrir.` : `Treino ativo: Volta ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Clique para abrir.`}
      >
        <XiloLightning size={14} className="shrink-0 text-[var(--cordel-gold)]" />
        <span className="font-cactus font-bold text-[11px] sm:text-xs shrink-0 whitespace-nowrap">
          {speedTrainerCountdown !== null ? speedTrainerCountdown : (lang === 'fr' ? `T${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm} BPM` : `V${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm} BPM`)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-tour-id="transport-speed-trainer"
      onClick={openSpeedTrainerModal}
      className="h-8 px-1.5 sm:px-2.5 shrink-0 whitespace-nowrap flex items-center gap-1 sm:gap-1.5 font-cactus font-bold text-xs select-none transition-all rounded-none border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10 shadow-[1px_1px_0px_var(--cordel-shadow-color)] cursor-pointer"
      title={lang === 'fr' ? 'Entraînement (Jouer avec / Montée en vitesse)' : 'Treino (Tocar Junto / Aceleração)'}
    >
      <XiloLightning size={14} className="shrink-0" />
      <span className="hidden md:inline shrink-0 whitespace-nowrap text-[var(--cordel-text)]">{lang === 'fr' ? 'Entraînement' : 'Treino'}</span>
    </button>
  );
};
