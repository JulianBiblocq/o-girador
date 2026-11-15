/**
 * HeaderDualScreenControl.tsx — Bouton d'accès rapide Multi-Écrans + Badge de reprise `studio_dual` (< 120 lignes).
 */
import React, { useState } from 'react';
import { Columns2, Sliders, Edit3, Wrench, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import { CordelContextMenu, CordelMenuItem } from '../ui/CordelContextMenu';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { dockSatellite, openSatellite, switchSatelliteMode } from '../../utils/satelliteCoordinator';

interface HeaderDualScreenControlProps {
  lang: 'pt' | 'fr';
}

export const HeaderDualScreenControl: React.FC<HeaderDualScreenControlProps> = ({ lang }) => {
  const isSatelliteOpen = useDesktopWorkspaceStore((s) => s.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const preferredScreenMode = useDesktopWorkspaceStore((s) => s.preferredScreenMode);
  const hasDismissedDualPrompt = useDesktopWorkspaceStore((s) => s.hasDismissedDualPrompt);
  const dismissDualPrompt = useDesktopWorkspaceStore((s) => s.dismissDualPrompt);

  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const isPt = lang === 'pt';
  const showStartupPrompt = preferredScreenMode === 'dual' && !isSatelliteOpen && !hasDismissedDualPrompt;

  const activateMode = (mode: 'mixer' | 'editor' | 'oficina') => {
    if (isSatelliteOpen) switchSatelliteMode(mode);
    else openSatellite(mode);
  };

  const menuItems: CordelMenuItem[] = [
    {
      label: isPt ? 'Mixagem na 2ª tela' : 'Mixage sur 2e écran',
      icon: <Sliders size={14} />,
      onClick: () => activateMode('mixer'),
    },
    {
      label: isPt ? 'Edição na 2ª tela' : 'Édition sur 2e écran',
      icon: <Edit3 size={14} />,
      onClick: () => activateMode('editor'),
    },
    {
      label: isPt ? 'A Oficina na 2ª tela' : 'A Oficina sur 2e écran',
      icon: <Wrench size={14} />,
      onClick: () => activateMode('oficina'),
    },
    ...(isSatelliteOpen
      ? [
          { isSeparator: true },
          {
            label: isPt ? 'Reancorar em 1 tela' : 'Ré-ancrer sur 1 écran',
            icon: <ArrowDownLeft size={14} />,
            onClick: () => dockSatellite({ reanchorToScreen1: true }),
          },
        ]
      : []),
  ];

  return (
    <div className="hidden lg:flex items-center gap-1.5 shrink-0">
      {showStartupPrompt && (
        <div className="inline-flex items-stretch border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0_var(--cordel-shadow-color)] h-[34px]">
          <button
            type="button"
            data-testid="header-reopen-dual-screen-btn"
            onClick={() => openSatellite()}
            className="px-2.5 flex items-center gap-1 font-cactus font-bold text-[11px] uppercase tracking-wide hover:bg-[var(--cordel-accent)] cursor-pointer transition-colors"
            title={isPt ? 'Reabrir sua janela Studio na Tela 2' : "Rouvrir votre fenêtre Studio sur l'Écran 2"}
          >
            <span>{isPt ? 'Abrir Tela 2' : "Ouvrir l'Écran 2"}</span>
            <ArrowUpRight size={13} className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={dismissDualPrompt}
            className="px-1.5 border-l border-[var(--cordel-on-accent)]/35 hover:bg-[var(--cordel-accent)] flex items-center justify-center cursor-pointer transition-colors"
            title={isPt ? 'Ocultar lembrete' : 'Masquer ce rappel'}
            aria-label={isPt ? 'Ocultar lembrete' : 'Masquer ce rappel'}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <button
        type="button"
        data-testid="header-dual-screen-btn"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuAnchor({ x: rect.left, y: rect.bottom + 6 });
        }}
        className={`h-[34px] px-2.5 border-2 cordel-button flex items-center gap-1.5 font-cactus font-bold text-xs uppercase cursor-pointer shrink-0 transition-colors ${
          isSatelliteOpen
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface)]'
        }`}
        title={isPt ? 'Modo Studio Multi-Telas (Tela 2)' : 'Mode Studio Multi-Écrans (Écran 2)'}
      >
        <Columns2 size={15} className="shrink-0" />
        <span className="hidden 2xl:inline">
          {isSatelliteOpen
            ? (satelliteMode === 'mixer'
                ? '2 · Mix'
                : satelliteMode === 'editor'
                  ? (isPt ? '2 · Ediç.' : '2 · Édit')
                  : '2 · Oficina')
            : (isPt ? '2 TELAS' : '2 ÉCRANS')}
        </span>
      </button>

      {menuAnchor && (
        <CordelContextMenu
          x={menuAnchor.x}
          y={menuAnchor.y}
          title={isPt ? 'Modo Multi-Telas Studio' : 'Mode Multi-Écrans Studio'}
          items={menuItems}
          onClose={() => setMenuAnchor(null)}
        />
      )}
    </div>
  );
};
