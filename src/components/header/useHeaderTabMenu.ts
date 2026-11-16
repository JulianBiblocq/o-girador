import { useState, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { dockSatellite, openSatellite } from '../../utils/satelliteCoordinator';
import { CordelMenuItem } from '../ui/CordelContextMenu';

export type TabKey = 'roda' | 'pistes' | 'mixer' | 'timeline' | 'editor';

export function useHeaderTabMenu(lang: string) {
  const [tabContextMenu, setTabContextMenu] = useState<{
    tabKey: TabKey;
    title: string;
    x: number;
    y: number;
  } | null>(null);

  const tabLongPressTimerRef = useRef<any>(null);
  const tabTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleOpenTabContextMenu = (tabKey: TabKey, title: string, clientX: number, clientY: number) => {
    setTabContextMenu({ tabKey, title, x: clientX, y: clientY });
  };

  const createTabTouchHandlers = (tabKey: TabKey, title: string) => ({
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleOpenTabContextMenu(tabKey, title, e.clientX, e.clientY);
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        tabTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        tabLongPressTimerRef.current = setTimeout(() => {
          handleOpenTabContextMenu(tabKey, title, touch.clientX, touch.clientY);
          tabLongPressTimerRef.current = null;
        }, 400);
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (tabLongPressTimerRef.current && tabTouchStartPosRef.current && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - tabTouchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - tabTouchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clearTimeout(tabLongPressTimerRef.current);
          tabLongPressTimerRef.current = null;
        }
      }
    },
    onTouchEnd: () => {
      if (tabLongPressTimerRef.current) {
        clearTimeout(tabLongPressTimerRef.current);
        tabLongPressTimerRef.current = null;
      }
      tabTouchStartPosRef.current = null;
    },
    onTouchCancel: () => {
      if (tabLongPressTimerRef.current) {
        clearTimeout(tabLongPressTimerRef.current);
        tabLongPressTimerRef.current = null;
      }
      tabTouchStartPosRef.current = null;
    },
  });

  const getTabMenuItems = (): CordelMenuItem[] => {
    if (!tabContextMenu) return [];
    const isPractice = useSequencerStore.getState().isPracticeMode;
    const isDesktopStudio = typeof window !== 'undefined' && window.innerWidth >= 1024 && !isPractice;
    const canSendToSatellite = isDesktopStudio && (tabContextMenu.tabKey === 'mixer' || tabContextMenu.tabKey === 'editor');
    const ws = useDesktopWorkspaceStore.getState();

    const onToggleFullscreen = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };

    return [
      {
        id: 'detach',
        label: lang === 'fr' ? "Envoyer sur l'Écran 2" : 'Enviar para a Tela 2',
        icon: '↗',
        disabled: !canSendToSatellite,
        disabledReason: !canSendToSatellite
          ? (lang === 'fr' ? 'Pont fixe sur Écran 1' : 'Ponte fixa na Tela 1')
          : undefined,
        onClick: () => {
          if (tabContextMenu.tabKey === 'mixer') openSatellite('mixer');
          else if (tabContextMenu.tabKey === 'editor') openSatellite('editor');
        },
      },
      {
        id: 'fullscreen',
        label: lang === 'fr' ? 'Plein écran' : 'Tela cheia',
        icon: '⤢',
        onClick: onToggleFullscreen,
      },
      { isSeparator: true },
      {
        id: 'reset-layout',
        label: lang === 'fr' ? 'Ré-ancrer sur 1 écran' : 'Reancorar em 1 tela',
        icon: '↙',
        disabled: !ws.isSatelliteOpen,
        onClick: () => dockSatellite({ reanchorToScreen1: true }),
      },
    ];
  };

  return {
    tabContextMenu,
    setTabContextMenu,
    createTabTouchHandlers,
    getTabMenuItems,
  };
}
