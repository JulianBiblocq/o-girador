/**
 * SettingsSatelliteBoundsBar.tsx — Barre de mémorisation & ré-ancrage des coordonnées Écran 2 (< 130 lignes).
 * Fonctionne à l'identique depuis l'Écran 1 ou depuis A Oficina ouverte dans la fenêtre satellite (Y < 0 inclus).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, Check, Crosshair, Lock, RotateCcw } from 'lucide-react';
import { useWindow } from '../../contexts/WindowContext';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { captureCurrentSatelliteBounds, dockSatellite } from '../../utils/satelliteCoordinator';
import {
  WindowManagementPermissionState,
  subscribeWindowManagementPermission,
} from '../../utils/satelliteScreenPermission';

interface SettingsSatelliteBoundsBarProps {
  lang: string;
  onNotify?: (message: string) => void;
}

export const SettingsSatelliteBoundsBar: React.FC<SettingsSatelliteBoundsBarProps> = ({ lang, onNotify }) => {
  const hostWin = useWindow();
  const isSatelliteOpen = useDesktopWorkspaceStore((s) => s.isSatelliteOpen);
  const satelliteBounds = useDesktopWorkspaceStore((s) => s.satelliteBounds);
  const setSatelliteBounds = useDesktopWorkspaceStore((s) => s.setSatelliteBounds);
  const [justMemorized, setJustMemorized] = useState(false);
  const [permState, setPermState] = useState<WindowManagementPermissionState>('unknown');
  const timerRef = useRef<number | null>(null);
  const isPt = lang === 'pt';

  useEffect(() => {
    const unsub = subscribeWindowManagementPermission(setPermState);
    return () => {
      unsub();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCaptureBounds = () => {
    const captured = captureCurrentSatelliteBounds(hostWin);
    if (!captured) return;
    setJustMemorized(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setJustMemorized(false), 2500);
    onNotify?.(
      isPt
        ? `Posição memorizada : X=${captured.x}, Y=${captured.y} (${captured.width}×${captured.height})`
        : `Position mémorisée : X=${captured.x}, Y=${captured.y} (${captured.width}×${captured.height})`
    );
  };

  return (
    <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] p-3 flex flex-col gap-2.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-cactus font-bold uppercase text-[var(--cordel-text)]">
            {isPt ? 'Posição da Tela 2 :' : "Position de l'Écran 2 :"}
          </span>
          <span
            data-testid="satellite-bounds-readout"
            className="font-mono text-[11px] px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
          >
            {satelliteBounds
              ? `X=${satelliteBounds.x}, Y=${satelliteBounds.y} (${satelliteBounds.width}×${satelliteBounds.height})`
              : (isPt ? 'Automática (2º monitor)' : 'Automatique (2e moniteur)')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSatelliteOpen && (
            <button
              type="button"
              data-testid="memorize-satellite-bounds-btn"
              onClick={handleCaptureBounds}
              className={`px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                justMemorized ? 'bg-[var(--cordel-status-success)]' : 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)]'
              }`}
            >
              {justMemorized ? <Check size={12} /> : <Crosshair size={12} />}
              <span>
                {justMemorized
                  ? (isPt ? 'Posição memorizada' : 'Position mémorisée')
                  : (isPt ? 'Memorizar a posição atual' : 'Mémoriser la position actuelle')}
              </span>
            </button>
          )}
          {satelliteBounds && (
            <button
              type="button"
              onClick={() => { setJustMemorized(false); setSatelliteBounds(null); }}
              className="px-2.5 py-1 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{isPt ? 'Redefinir' : 'Réinitialiser'}</span>
            </button>
          )}
          {isSatelliteOpen && (
            <button
              type="button"
              onClick={() => dockSatellite({ reanchorToScreen1: true })}
              className="px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <ArrowDownLeft size={12} />
              <span>{isPt ? 'Reancorar em 1 tela' : 'Ré-ancrer sur 1 écran'}</span>
            </button>
          )}
        </div>
      </div>

      {permState === 'denied' && (
        <div
          data-testid="window-management-denied-hint"
          className="border border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] px-2.5 py-2 text-[11px] text-[var(--cordel-text)] flex items-start gap-2 leading-snug"
        >
          <Lock size={14} className="shrink-0 mt-0.5 text-[var(--cordel-accent-readable)]" />
          <span>
            {isPt
              ? 'Permissão multi-telas bloqueada no navegador : clique no ícone de cadeado/ajustes na barra de endereços do Chrome/Edge e autorize « Gerenciamento de janelas (Window management) » para permitir a abertura automática no monitor superior.'
              : "Permission multi-écrans bloquée dans le navigateur : cliquez sur l'icône de cadenas/réglages dans la barre d'adresse Chrome/Edge et autorisez « Gestion des fenêtres (Window management) » pour permettre l'ouverture automatique sur le moniteur du haut."}
          </span>
        </div>
      )}
    </div>
  );
};
