/**
 * SettingsDesktopModeCards.tsx — 3 Modes Studio Clés en Main & Coordonnées du 2e Écran (< 125 lignes).
 */
import React from 'react';
import { Sliders, Edit3, Wrench, ArrowDownLeft, Crosshair, RotateCcw } from 'lucide-react';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { SatelliteMode } from '../../types/desktopWorkspace.types';
import { detachedWindowManager } from '../../utils/detachedWindowManager';
import {
  captureCurrentSatelliteBounds,
  dockSatellite,
  openSatellite,
  switchSatelliteMode,
} from '../../utils/satelliteCoordinator';

interface SettingsDesktopModeCardsProps {
  lang: string;
  onNotify?: (message: string) => void;
}

export const SettingsDesktopModeCards: React.FC<SettingsDesktopModeCardsProps> = ({ lang, onNotify }) => {
  const isSatelliteOpen = useDesktopWorkspaceStore((s) => s.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const satelliteBounds = useDesktopWorkspaceStore((s) => s.satelliteBounds);
  const setSatelliteBounds = useDesktopWorkspaceStore((s) => s.setSatelliteBounds);
  const isPt = lang === 'pt';

  const modes: Array<{ id: SatelliteMode; title: string; desc: string; Icon: React.FC<{ size?: number; className?: string }> }> = [
    {
      id: 'mixer',
      title: isPt ? 'Modo Mixagem' : 'Mode Mixage',
      desc: isPt ? 'Tela 1 : Roda / Sequenciador · Tela 2 : Mesa de Som' : 'Écran 1 : Roda / Séquenceur · Écran 2 : Console de Mixage',
      Icon: Sliders,
    },
    {
      id: 'editor',
      title: isPt ? 'Modo Edição' : 'Mode Édition',
      desc: isPt ? 'Tela 1 : Roda / Sequenciador · Tela 2 : Editor Detalhado' : 'Écran 1 : Roda / Séquenceur · Écran 2 : Éditeur Détaillé',
      Icon: Edit3,
    },
    {
      id: 'oficina',
      title: 'Mode A Oficina',
      desc: isPt ? 'Tela 1 : Roda Ao Vivo · Tela 2 : Lutheria, Balanço & Sinais' : 'Écran 1 : Roda Ao Vivo · Écran 2 : Lutherie, Balanço & Signaux',
      Icon: Wrench,
    },
  ];

  const handleLaunchMode = (mode: SatelliteMode) => {
    if (isSatelliteOpen) switchSatelliteMode(mode);
    else openSatellite(mode);
  };

  const handleCaptureBounds = () => {
    const captured = captureCurrentSatelliteBounds();
    if (captured) {
      onNotify?.(isPt ? 'Posição da Tela 2 memorizada!' : "Position de l'Écran 2 mémorisée !");
    }
  };

  const isLivePopupOpen = isSatelliteOpen && detachedWindowManager.isPanelOpen('satellite');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map(({ id, title, desc, Icon }) => {
          const isCurrent = isSatelliteOpen && satelliteMode === id;
          return (
            <div
              key={id}
              className={`border-2 p-3.5 flex flex-col justify-between gap-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)] transition-colors ${
                isCurrent
                  ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] ring-2 ring-[var(--cordel-accent)]'
                  : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)]'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-cactus font-black text-xs uppercase flex items-center gap-1.5 text-[var(--cordel-text)]">
                    <Icon size={14} className="text-[var(--cordel-accent-readable)] shrink-0" />
                    <span>{title}</span>
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[9px] font-cactus font-bold uppercase bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">
                      {isPt ? 'Ativo' : 'Actif'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">{desc}</p>
              </div>
              <button
                type="button"
                data-testid={`oficina-launch-satellite-${id}`}
                onClick={() => handleLaunchMode(id)}
                className="w-full py-1.5 px-3 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] font-cactus font-bold text-[11px] uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors"
              >
                {isCurrent ? (isPt ? 'Focar Tela 2' : "Afficher l'Écran 2") : (isPt ? 'Abrir na Tela 2' : "Ouvrir sur l'Écran 2")}
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-cactus font-bold uppercase text-[var(--cordel-text)]">
            {isPt ? 'Posição da Tela 2 :' : "Position de l'Écran 2 :"}
          </span>
          <span className="font-mono text-[11px] px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
            {satelliteBounds
              ? `X=${satelliteBounds.x}, Y=${satelliteBounds.y} (${satelliteBounds.width}×${satelliteBounds.height})`
              : (isPt ? 'Automática (2º monitor)' : 'Automatique (2e moniteur)')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLivePopupOpen && (
            <button type="button" onClick={handleCaptureBounds} className="px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer">
              <Crosshair size={12} />
              <span>{isPt ? 'Memorizar posição atual' : 'Mémoriser la position actuelle'}</span>
            </button>
          )}
          {satelliteBounds && (
            <button type="button" onClick={() => setSatelliteBounds(null)} className="px-2.5 py-1 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer">
              <RotateCcw size={12} />
              <span>{isPt ? 'Redefinir' : 'Réinitialiser'}</span>
            </button>
          )}
          {isSatelliteOpen && (
            <button type="button" onClick={() => dockSatellite({ reanchorToScreen1: true })} className="px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer">
              <ArrowDownLeft size={12} />
              <span>{isPt ? 'Reancorar em 1 tela' : 'Ré-ancrer sur 1 écran'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
