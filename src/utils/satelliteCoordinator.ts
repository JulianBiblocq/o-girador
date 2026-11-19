/**
 * satelliteCoordinator.ts — Orchestrateur Studio Multi-Écrans (Écran 1 Fixe + Satellite Écran 2) (< 135 lignes).
 */
import { DesktopWindowBounds, SatelliteMode } from '../types/desktopWorkspace.types';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { useSequencerStore, isToadaChild } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { detachedWindowManager } from './detachedWindowManager';
import { ScreenRectLike, normalizeCapturedLiveBounds } from './satelliteBoundsNormalizer';
import { requestScreenDetailsOnUserGesture } from './satelliteScreenPermission';
import { notifyToast } from './toastHelper';

export function requestMainBridgeView(viewMode: 'roda' | 'timeline' | 'console'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-change-view-mode', { detail: { viewMode } }));
}

export function ensureEditableTrackSelected(): number | null {
  const seq = useSequencerStore.getState();
  if (seq.editingTrackId !== null && seq.tracks.some((t) => t.id === seq.editingTrackId)) {
    return seq.editingTrackId;
  }
  const first =
    seq.tracks.find((tr) => !tr.isHidden && !isToadaChild(tr, seq.tracks) && (!tr.isBusFolder || tr.isLinkFolder)) ||
    seq.tracks[0];
  if (!first) return null;
  seq.setEditingTrackId(first.id);
  return first.id;
}

function applySatelliteModeEffects(mode: SatelliteMode): void {
  const ws = useDesktopWorkspaceStore.getState();
  if (mode === 'mixer') {
    const currentView = typeof window !== 'undefined' ? (window as any).__OGIRADOR_VIEW_MODE__ : 'roda';
    if (currentView === 'console') requestMainBridgeView(ws.lastBridgeViewMode || 'roda');
  } else if (mode === 'editor') {
    ensureEditableTrackSelected();
  } else if (mode === 'oficina') {
    const settings = useSequencerSettingsStore.getState();
    if (settings.isSettingsOpen) settings.setIsSettingsOpen(false);
  }
}

export function openSatellite(
  mode?: SatelliteMode,
  overrideBounds?: DesktopWindowBounds | null,
  gestureWin?: Window | null
): boolean {
  const ws = useDesktopWorkspaceStore.getState();
  const targetMode = mode ?? ws.satelliteMode ?? 'mixer';
  const boundsToUse = overrideBounds !== undefined ? overrideBounds : ws.satelliteBounds;

  const popup = detachedWindowManager.openSatellitePopup(
    boundsToUse,
    (autoBounds) => {
      useDesktopWorkspaceStore.getState().setSatelliteBounds(autoBounds);
    },
    gestureWin
  );

  if (!popup) {
    ws.setSatelliteState({ isSatelliteOpen: false });
    const lang = useSequencerStore.getState().lang;
    notifyToast(
      lang === 'pt'
        ? 'Janela bloqueada pelo navegador. Autorize pop-ups para abrir a Tela 2.'
        : "Fenêtre bloquée par le navigateur. Autorisez les pop-ups pour ouvrir l'Écran 2.",
      'error'
    );
    return false;
  }

  ws.setSatelliteState({ isSatelliteOpen: true, satelliteMode: targetMode });
  ws.setPreferredScreenMode('dual');
  applySatelliteModeEffects(targetMode);
  return true;
}

export function switchSatelliteMode(mode: SatelliteMode, gestureWin?: Window | null): void {
  const ws = useDesktopWorkspaceStore.getState();
  if (!ws.isSatelliteOpen || !detachedWindowManager.isPanelOpen('satellite')) {
    openSatellite(mode, undefined, gestureWin);
    return;
  }
  ws.setSatelliteState({ satelliteMode: mode });
  applySatelliteModeEffects(mode);
  detachedWindowManager.focusWindow('satellite');
}

export function dockSatellite(options?: { reanchorToScreen1?: boolean }): void {
  const ws = useDesktopWorkspaceStore.getState();
  const prevMode = ws.satelliteMode;

  // Protection stricte : fermer ou ré-ancrer ne doit jamais écraser satelliteBounds
  detachedWindowManager.closeWindow('satellite');
  ws.setSatelliteState({ isSatelliteOpen: false });
  if (!detachedWindowManager.isMainWindowUnloading()) {
    ws.setPreferredScreenMode('single');
  }

  if (options?.reanchorToScreen1) {
    if (prevMode === 'mixer') requestMainBridgeView('console');
    else if (prevMode === 'editor') ensureEditableTrackSelected();
    else if (prevMode === 'oficina') useSequencerSettingsStore.getState().setIsSettingsOpen(true);
  }
}

export function handleSatelliteClosedByOS(): void {
  if (detachedWindowManager.isMainWindowUnloading()) return;
  const ws = useDesktopWorkspaceStore.getState();
  const prevMode = ws.satelliteMode;
  ws.setSatelliteState({ isSatelliteOpen: false });
  ws.setPreferredScreenMode('single');
  if (prevMode === 'editor') useSequencerStore.getState().closeDetailEditor();
  else if (prevMode === 'oficina') useSequencerSettingsStore.getState().setIsSettingsOpen(false);
}

export function captureCurrentSatelliteBounds(gestureWin?: Window | null): DesktopWindowBounds | null {
  const satWin = detachedWindowManager.getWindow('satellite');
  const screensPromise = requestScreenDetailsOnUserGesture(gestureWin ?? satWin);
  const live = detachedWindowManager.getBounds('satellite');
  if (!live) return null;

  useDesktopWorkspaceStore.getState().setSatelliteBounds(live);

  void screensPromise
    .then((screens) => {
      if (!screens || screens.length === 0) return;
      const latestRaw = detachedWindowManager.getBounds('satellite') ?? live;
      const clamped = normalizeCapturedLiveBounds(
        latestRaw,
        (satWin?.screen as unknown as ScreenRectLike) ?? null,
        screens
      );
      if (clamped) {
        useDesktopWorkspaceStore.getState().setSatelliteBounds(clamped);
      }
    })
    .catch(() => {});

  return live;
}
