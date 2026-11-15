/**
 * StudioSatelliteHeader.tsx — Barre de commutation Cordel de la Fenêtre Satellite Écran 2 (< 120 lignes).
 * Permet de basculer instantanément entre Mixage, Édition et A Oficina sans rouvrir la fenêtre.
 */
import React from 'react';
import { Sliders, Edit3, Wrench, Play, Square, ArrowDownLeft } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useLiveMeasure } from '../../hooks/useLiveMeasure';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { SatelliteMode } from '../../types/desktopWorkspace.types';
import { dockSatellite, switchSatelliteMode } from '../../utils/satelliteCoordinator';

const MODES: Array<{ id: SatelliteMode; fr: string; pt: string; Icon: React.FC<{ size?: number; className?: string }> }> = [
  { id: 'mixer', fr: 'Mixage', pt: 'Mixagem', Icon: Sliders },
  { id: 'editor', fr: 'Édition', pt: 'Edição', Icon: Edit3 },
  { id: 'oficina', fr: 'A Oficina', pt: 'A Oficina', Icon: Wrench },
];

export const StudioSatelliteHeader: React.FC = () => {
  const lang = useSequencerStore((s) => s.lang);
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const { isPlaying, handleTogglePlay } = useAudio();
  const liveMeasure = useLiveMeasure(true);
  const bpm = useSequencerStore((s) => s.measureBpms?.[liveMeasure] || s.bpm);
  const isPt = lang === 'pt';

  return (
    <header
      data-testid="studio-satellite-header"
      className="w-full min-h-[48px] px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-b-2 border-[var(--cordel-border-strong)] flex flex-wrap items-center justify-between gap-2 select-none shrink-0 z-30"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-cactus font-black uppercase tracking-widest border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)]">
          {isPt ? 'Tela 2 · Studio' : 'Écran 2 · Studio'}
        </span>

        <nav
          aria-label={isPt ? 'Modo da Tela 2' : "Mode de l'Écran 2"}
          className="inline-flex items-stretch border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]"
        >
          {MODES.map(({ id, fr, pt, Icon }, idx) => {
            const isActive = satelliteMode === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`satellite-mode-${id}`}
                onClick={() => switchSatelliteMode(id)}
                className={`px-3 py-1.5 text-xs font-cactus font-bold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer transition-colors ${
                  idx > 0 ? 'border-l-2 border-[var(--cordel-border)]' : ''
                } ${
                  isActive
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-black'
                    : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-surface-elevated)]'
                }`}
              >
                <Icon size={13} className="shrink-0" />
                <span>{isPt ? pt : fr}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-2 py-1 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          <button
            type="button"
            data-testid="satellite-transport-toggle"
            onClick={handleTogglePlay}
            className={`w-7 h-6 flex items-center justify-center border border-[var(--cordel-border-strong)] cursor-pointer transition-colors ${
              isPlaying
                ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)]'
            }`}
            title={isPt ? 'Reproduzir / Parar [Espaço]' : 'Lecture / Arrêt [Espace]'}
            aria-label={isPt ? 'Reproduzir / Parar' : 'Lecture / Arrêt'}
          >
            {isPlaying ? <Square size={11} className="fill-current" /> : <Play size={12} className="fill-current" />}
          </button>
          <span className="font-mono font-bold text-xs px-1.5 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] text-[var(--cordel-text)] tabular-nums">
            M{liveMeasure + 1}
          </span>
          <span className="font-cactus font-bold text-[11px] text-[var(--cordel-text)] pr-0.5 tabular-nums">
            {Math.round(bpm)} BPM
          </span>
        </div>

        <button
          type="button"
          data-testid="satellite-dock-btn"
          onClick={() => dockSatellite({ reanchorToScreen1: true })}
          className="px-2.5 py-1.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors"
          title={isPt ? 'Fechar a Tela 2 e reancorar na Tela 1' : "Fermer l'Écran 2 et ré-ancrer sur l'Écran 1"}
        >
          <ArrowDownLeft size={14} className="shrink-0" />
          <span>{isPt ? 'Reancorar' : 'Ré-ancrer'}</span>
        </button>
      </div>
    </header>
  );
};
