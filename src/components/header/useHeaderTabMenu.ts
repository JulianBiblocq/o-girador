import { useState, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CordelMenuItem } from '../ui/CordelContextMenu';

export type TabKey = 'roda' | 'pistes' | 'mixer' | 'timeline' | 'editor';

export function useHeaderTabMenu(lang: string, onToggleDetachInstrumentEditor?: () => void) {
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
    }
  });

  const getTabMenuItems = (): CordelMenuItem[] => {
    if (!tabContextMenu) return [];

    const onToggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };

    const onResetLayout = () => {
      useSequencerStore.getState().setDetachedPanelsState({
        mixer: false,
        roda: false,
        detailEditor: false,
        linearDaw: false,
        timeline: false,
      });
    };

    return [
      {
        id: 'detach',
        label: lang === 'fr' ? 'Détacher dans une fenêtre' : 'Separar em uma janela',
        icon: '⇗',
        disabled: true,
        disabledReason: lang === 'fr' ? '[ Bêta — Bientôt disponible ]' : '[ Beta — Em breve ]',
        onClick: () => {},
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
        label: lang === 'fr' ? 'Réinitialiser la disposition' : 'Redefinir layout',
        icon: '↺',
        onClick: onResetLayout,
      }
    ];
  };

  return {
    tabContextMenu,
    setTabContextMenu,
    createTabTouchHandlers,
    getTabMenuItems,
  };
}
