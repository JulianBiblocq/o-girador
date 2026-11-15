export type SatelliteMode = 'mixer' | 'editor' | 'oficina';

export type DetachedPanelKey = 'satellite';

export type BridgeViewMode = 'roda' | 'timeline';

export interface DesktopWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWorkspaceLayout {
  id: string;
  name: string;
  createdAt: number;
  satelliteOpen: boolean;
  satelliteMode: SatelliteMode;
  satelliteBounds?: DesktopWindowBounds;
  bridgeViewMode?: BridgeViewMode;
  uiState?: {
    isTracksCollapsed?: boolean;
  };
}
