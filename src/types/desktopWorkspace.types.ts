/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DetachedPanelKey = 'mixer' | 'roda' | 'detailEditor';

export interface DesktopWindowBounds {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export interface DesktopWorkspaceLayout {
  id: string; // 'layout_' + timestamp
  name: string; // ex: "Studio 2 Écrans - Mixeur déporté"
  createdAt: number;
  detachedPanels: {
    mixer?: { detached: boolean; bounds?: DesktopWindowBounds };
    roda?: { detached: boolean; bounds?: DesktopWindowBounds };
    detailEditor?: { detached: boolean; bounds?: DesktopWindowBounds };
  };
  uiState: {
    isInspectorOpen?: boolean;
    isMixerExpanded?: boolean;
    isTracksCollapsed?: boolean;
  };
}
