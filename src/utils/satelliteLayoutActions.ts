/**
 * satelliteLayoutActions.ts — Sauvegarde et application des dispositions Multi-Écrans (< 65 lignes).
 */
import { DesktopWorkspaceLayout } from '../types/desktopWorkspace.types';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { detachedWindowManager } from './detachedWindowManager';
import { dockSatellite, openSatellite, requestMainBridgeView } from './satelliteCoordinator';

export function saveCurrentDesktopWorkspaceLayout(name: string): DesktopWorkspaceLayout {
  const ws = useDesktopWorkspaceStore.getState();
  const seq = useSequencerStore.getState();
  const liveBounds = detachedWindowManager.getBounds('satellite') ?? ws.satelliteBounds ?? undefined;
  if (liveBounds) ws.setSatelliteBounds(liveBounds);
  const currentView = typeof window !== 'undefined' ? (window as any).__OGIRADOR_VIEW_MODE__ : 'roda';

  const layout: DesktopWorkspaceLayout = {
    id: `layout_${Date.now()}`,
    name: name.trim() || `Studio ${ws.layouts.length + 1}`,
    createdAt: Date.now(),
    satelliteOpen: ws.isSatelliteOpen,
    satelliteMode: ws.satelliteMode,
    satelliteBounds: liveBounds,
    bridgeViewMode: currentView === 'timeline' ? 'timeline' : 'roda',
    uiState: { isTracksCollapsed: seq.isTracksCollapsed },
  };
  ws.addLayoutSnapshot(layout);
  return layout;
}

export function applyDesktopWorkspaceLayout(layoutId: string): boolean {
  const ws = useDesktopWorkspaceStore.getState();
  const layout = ws.layouts.find((l) => l.id === layoutId);
  if (!layout) return false;

  if (layout.uiState?.isTracksCollapsed !== undefined) {
    useSequencerStore.setState({ isTracksCollapsed: layout.uiState.isTracksCollapsed });
  }
  if (layout.bridgeViewMode) {
    ws.setLastBridgeViewMode(layout.bridgeViewMode);
    requestMainBridgeView(layout.bridgeViewMode);
  }
  if (layout.satelliteBounds) ws.setSatelliteBounds(layout.satelliteBounds);

  if (layout.satelliteOpen) {
    openSatellite(layout.satelliteMode, layout.satelliteBounds ?? ws.satelliteBounds);
  } else if (ws.isSatelliteOpen) {
    dockSatellite({ reanchorToScreen1: false });
  }
  ws.setActiveLayoutId(layoutId);
  return true;
}
