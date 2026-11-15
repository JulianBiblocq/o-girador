/**
 * satelliteDualScreen.test.ts — Tests unitaires du Store Satellite Multi-Écrans & Passerelles Écran 2 (< 125L).
 */
// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it } from 'vitest';
import { useDesktopWorkspaceStore } from '../../useDesktopWorkspaceStore';
import { useSequencerStore } from '../../useSequencerStore';
import { useSequencerSettingsStore } from '../../useSequencerSettingsStore';
import { isDetailEditorOpen } from '../../../components/controls/vuMeterTicker';
import { detachedWindowManager } from '../../../utils/detachedWindowManager';
import { dockSatellite, handleSatelliteClosedByOS } from '../../../utils/satelliteCoordinator';
import { isEditableTarget } from '../../../utils/crossRealmDom';

describe('Studio Satellite Dual-Screen Store, Signed Coordinates & Gateways', () => {
  beforeEach(() => {
    detachedWindowManager.setMainWindowUnloading(false);
    useDesktopWorkspaceStore.setState({
      isSatelliteOpen: false,
      satelliteMode: 'mixer',
      satelliteBounds: null,
      preferredScreenMode: 'single',
      hasDismissedDualPrompt: false,
      lastBridgeViewMode: 'roda',
    });
    useSequencerSettingsStore.setState({
      isSettingsOpen: false,
      activeSection: 'lutherie',
      oficinaFocus: null,
      returnEditorContext: null,
    });
    useSequencerStore.getState().closeDetailEditor();
  });

  it('persists negative monitor coordinates (left/top secondary screens) without clamping to >= 0', () => {
    const ws = useDesktopWorkspaceStore.getState();
    ws.setSatelliteBounds({ x: -1920, y: -240, width: 1440, height: 900 });
    const updated = useDesktopWorkspaceStore.getState().satelliteBounds;
    expect(updated).toEqual({ x: -1920, y: -240, width: 1440, height: 900 });
  });

  it('preserves preferredScreenMode="dual" during main window unload and resets on explicit dock/close', () => {
    const ws = useDesktopWorkspaceStore.getState();
    ws.setSatelliteState({ isSatelliteOpen: true, satelliteMode: 'editor' });
    ws.setPreferredScreenMode('dual');
    expect(useDesktopWorkspaceStore.getState().preferredScreenMode).toBe('dual');

    detachedWindowManager.setMainWindowUnloading(true);
    handleSatelliteClosedByOS();
    expect(useDesktopWorkspaceStore.getState().preferredScreenMode).toBe('dual');

    detachedWindowManager.setMainWindowUnloading(false);
    dockSatellite({ reanchorToScreen1: false });
    expect(useDesktopWorkspaceStore.getState().preferredScreenMode).toBe('single');
  });

  it('routes Editor <-> A Oficina bridges inside Satellite without opening modal on Screen 1', () => {
    useDesktopWorkspaceStore.getState().setSatelliteState({ isSatelliteOpen: true, satelliteMode: 'editor' });
    useSequencerStore.getState().setEditingTrackId(0);

    useSequencerSettingsStore.getState().openOficinaSection('lutherie', {
      focus: { trackId: 0, instrumentId: 'marcante' },
      returnContext: { trackId: 0, trackLabel: 'Marcante', patternId: 0, stepIdx: 0 },
    });

    expect(useSequencerSettingsStore.getState().isSettingsOpen).toBe(false);
    expect(useSequencerSettingsStore.getState().activeSection).toBe('lutherie');
    expect(useDesktopWorkspaceStore.getState().satelliteMode).toBe('oficina');
    expect(useSequencerStore.getState().editingTrackId).toBe(0);

    useSequencerStore.getState().openInstrumentDetailAt({ trackId: 0, patternId: 0, stepIdx: 0, expandTuning: true });
    expect(useDesktopWorkspaceStore.getState().satelliteMode).toBe('editor');
    expect(useSequencerSettingsStore.getState().isSettingsOpen).toBe(false);
    expect(useSequencerStore.getState().editingTrackId).toBe(0);
  });

  it('keeps Screen 1 Roda/VU-meters unblocked when InstrumentDetailEditor is embedded on Screen 2', () => {
    useSequencerStore.getState().setEditingTrackId(2);
    expect(isDetailEditorOpen()).toBe(true);

    useDesktopWorkspaceStore.getState().setSatelliteState({ isSatelliteOpen: true, satelliteMode: 'editor' });
    expect(isDetailEditorOpen()).toBe(false);
  });

  it('identifies editable DOM elements across Window realms via duck-typing without instanceof', () => {
    const fakePopupInput = { nodeType: 1, tagName: 'input', type: 'text' };
    const fakePopupButton = { nodeType: 1, tagName: 'BUTTON', isContentEditable: false };
    expect(isEditableTarget(fakePopupInput)).toBe(true);
    expect(isEditableTarget(fakePopupButton)).toBe(false);
  });
});
