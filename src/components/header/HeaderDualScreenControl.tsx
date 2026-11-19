/**
 * HeaderDualScreenControl.tsx — Bouton unique évolutif à 3 états « 2 Écrans / 2 Telas » (< 130 lignes).
 * 1) Repos : contour sobre [ 2 ÉCRANS ] -> menu des modes.
 * 2) Amorce `dual` : accentué [ 2 ÉCRANS ] -> clic gauche ouvre en 1 clic, clic droit ouvre le menu.
 * 3) Connecté : bois + pastille active [ 2 ÉCRANS ] -> bascule de mode, premier plan ou ré-ancrage.
 */
import React, { useState } from 'react';
import { Columns2, Sliders, Edit3, Wrench, ArrowDownLeft, ArrowUpRight, ChevronDown, ExternalLink } from 'lucide-react';
import { CordelContextMenu, CordelMenuItem } from '../ui/CordelContextMenu';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { detachedWindowManager } from '../../utils/detachedWindowManager';
import { dockSatellite, openSatellite, switchSatelliteMode } from '../../utils/satelliteCoordinator';

interface HeaderDualScreenControlProps {
  lang: 'pt' | 'fr';
}

export const HeaderDualScreenControl: React.FC<HeaderDualScreenControlProps> = ({ lang }) => {
  const isSatelliteOpen = useDesktopWorkspaceStore((s) => s.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const preferredScreenMode = useDesktopWorkspaceStore((s) => s.preferredScreenMode);

  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const isPt = lang === 'pt';
  const isDualPrimed = !isSatelliteOpen && preferredScreenMode === 'dual';

  const openMenuAtButton = (btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    setMenuAnchor({ x: rect.left, y: rect.bottom + 6 });
  };

  const activateMode = (mode: 'mixer' | 'editor' | 'oficina') => {
    if (isSatelliteOpen) switchSatelliteMode(mode, window);
    else openSatellite(mode, undefined, window);
  };

  const menuItems: CordelMenuItem[] = [
    {
      label: isPt ? 'Mixagem na 2ª tela' : 'Mixage sur 2e écran',
      icon: <Sliders size={14} />,
      isActive: isSatelliteOpen && satelliteMode === 'mixer',
      onClick: () => activateMode('mixer'),
    },
    {
      label: isPt ? 'Edição na 2ª tela' : 'Édition sur 2e écran',
      icon: <Edit3 size={14} />,
      isActive: isSatelliteOpen && satelliteMode === 'editor',
      onClick: () => activateMode('editor'),
    },
    {
      label: isPt ? 'A Oficina na 2ª tela' : 'A Oficina sur 2e écran',
      icon: <Wrench size={14} />,
      isActive: isSatelliteOpen && satelliteMode === 'oficina',
      onClick: () => activateMode('oficina'),
    },
    ...(isSatelliteOpen
      ? [
          { isSeparator: true },
          {
            label: isPt ? 'Trazer a Tela 2 para frente' : "Afficher l'Écran 2 au premier plan",
            icon: <ExternalLink size={14} />,
            onClick: () => detachedWindowManager.focusWindow('satellite'),
          },
          {
            label: isPt ? 'Reancorar em 1 tela' : 'Ré-ancrer sur 1 écran',
            icon: <ArrowDownLeft size={14} />,
            onClick: () => dockSatellite({ reanchorToScreen1: true }),
          },
        ]
      : []),
  ];

  const buttonStateClass = isSatelliteOpen
    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] hover:bg-[var(--cordel-accent)]'
    : isDualPrimed
      ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] hover:bg-[var(--cordel-wood)]'
      : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface)]';

  const tooltip = isSatelliteOpen
    ? (isPt ? 'Tela 2 ativa — clique para mudar de modo ou reancorar' : 'Écran 2 actif — cliquez pour changer de mode ou ré-ancrer')
    : isDualPrimed
      ? (isPt ? 'Abrir a Tela 2 em 1 clique (clique direito : escolher o modo)' : "Ouvrir l'Écran 2 en 1 clic (clic droit : choisir le mode)")
      : (isPt ? 'Modo Studio Multi-Telas (Tela 2)' : 'Mode Studio Multi-Écrans (Écran 2)');

  return (
    <div className="hidden lg:flex items-center shrink-0">
      <button
        type="button"
        data-testid="header-dual-screen-btn"
        data-tour-id="header-dual-screen"
        onClick={(e) => {
          if (isDualPrimed) openSatellite(satelliteMode, undefined, e.currentTarget.ownerDocument?.defaultView ?? window);
          else openMenuAtButton(e.currentTarget);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenuAtButton(e.currentTarget);
        }}
        className={`h-[34px] px-2 xl:px-2.5 border-2 cordel-button flex items-center gap-1.5 font-cactus font-bold text-[11px] xl:text-xs uppercase cursor-pointer shrink-0 whitespace-nowrap transition-colors ${buttonStateClass}`}
        title={tooltip}
      >
        {isSatelliteOpen && (
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[var(--cordel-status-success)] border border-[var(--cordel-on-accent)]/75 shrink-0" />
        )}
        <Columns2 size={14} className="shrink-0" />
        <span>{isPt ? '2 TELAS' : '2 ÉCRANS'}</span>
        {isDualPrimed ? <ArrowUpRight size={13} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0 opacity-85" />}
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
