/**
 * satelliteBoundsNormalizer.test.ts — Tests unitaires Placement 2 Écrans Superposés (Y < 0) & Continuité Audio (< 135L).
 */
// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ScreenRectLike,
  clampBoundsToScreenWorkArea,
  findTargetScreenForBounds,
  normalizeCapturedLiveBounds,
} from '../satelliteBoundsNormalizer';
import {
  __resetScreenPermissionForTests,
  requestScreenDetailsOnUserGesture,
} from '../satelliteScreenPermission';
import { buildSatellitePopupFeatures } from '../satelliteScreenPlacement';
import { areAllStudioWindowsHidden, detachedWindowManager } from '../detachedWindowManager';
import {
  cancelAudioContextAutoSuspend,
  wakeAudioContextForNotePreview,
} from '../../audio/audioContextSuspendManager';

const STACKED_SCREENS: ScreenRectLike[] = [
  { left: 0, top: 0, width: 1920, height: 1080, availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1040 },
  { left: 0, top: -1080, width: 1920, height: 1080, availLeft: 0, availTop: -1080, availWidth: 1920, availHeight: 1080 },
];

describe('Stacked Monitors (Y < 0) Bounds Normalization, Permission Fallback & Bi-Screen Audio', () => {
  beforeEach(() => {
    __resetScreenPermissionForTests([], 'unknown');
    detachedWindowManager.unregister('satellite');
    cancelAudioContextAutoSuspend();
  });

  it('clamps Windows 10/11 maximized invisible border (-8, -1088, 1936x1096) strictly inside top monitor (-1080)', () => {
    const rawMaximized = { x: -8, y: -1088, width: 1936, height: 1096 };
    const target = findTargetScreenForBounds(rawMaximized, STACKED_SCREENS);
    expect(target).toBe(STACKED_SCREENS[1]);

    const clamped = normalizeCapturedLiveBounds(rawMaximized, null, STACKED_SCREENS);
    expect(clamped).toEqual({ x: 0, y: -1080, width: 1920, height: 1080 });
  });

  it('applies DWM -8px heuristic without ScreenDetails ONLY when raw.width > winScreen.availWidth', () => {
    const maskedWinScreen: ScreenRectLike = { availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1080 };
    const maximizedOnTop = normalizeCapturedLiveBounds(
      { x: -8, y: -1088, width: 1936, height: 1096 },
      maskedWinScreen,
      []
    );
    expect(maximizedOnTop).toEqual({ x: 0, y: -1080, width: 1920, height: 1080 });

    const freeWindowAtMinus8 = normalizeCapturedLiveBounds(
      { x: -8, y: -1080, width: 1280, height: 820 },
      maskedWinScreen,
      []
    );
    expect(freeWindowAtMinus8).toEqual({ x: -8, y: -1080, width: 1280, height: 820 });
  });

  it('rejects minimized sentinel coordinates (<= -10000) and tiny closing frames', () => {
    expect(normalizeCapturedLiveBounds({ x: -32000, y: -32000, width: 1280, height: 800 })).toBeNull();
    expect(normalizeCapturedLiveBounds({ x: 0, y: -10000, width: 1280, height: 800 })).toBeNull();
    expect(clampBoundsToScreenWorkArea({ x: 100, y: -1000, width: 1280, height: 820 }, STACKED_SCREENS[1])).toEqual({
      x: 100,
      y: -1000,
      width: 1280,
      height: 820,
    });
  });

  it('compensates windowFeatures inner width/height while keeping signed top=-1080', () => {
    __resetScreenPermissionForTests(STACKED_SCREENS, 'granted');
    const features = buildSatellitePopupFeatures({ x: -8, y: -1088, width: 1936, height: 1096 });
    expect(features).toContain('left=0');
    expect(features).toContain('top=-1080');
    expect(features).toContain('width=1904');
    expect(features).toContain('height=1040');
  });

  it('falls back to main window.getScreenDetails() when about:blank popup rejects getScreenDetails()', async () => {
    const prevWin = (globalThis as any).window;
    const getScreenDetailsMain = vi.fn().mockResolvedValue({ screens: STACKED_SCREENS, currentScreen: STACKED_SCREENS[0] });
    (globalThis as any).window = { getScreenDetails: getScreenDetailsMain };

    const getScreenDetailsPopup = vi.fn().mockRejectedValue(new Error('NotAllowedError on about:blank'));
    const fakePopupWin = { closed: false, getScreenDetails: getScreenDetailsPopup } as unknown as Window;

    const screens = await requestScreenDetailsOnUserGesture(fakePopupWin);
    expect(getScreenDetailsPopup).toHaveBeenCalledTimes(1);
    expect(getScreenDetailsMain).toHaveBeenCalledTimes(1);
    expect(screens).toEqual(STACKED_SCREENS);

    (globalThis as any).window = prevWin;
  });

  it('keeps Studio visibility alive when Screen 1 is hidden but Satellite Screen 2 is visible', () => {
    const prevDoc = (globalThis as any).document;
    const fakeDoc = { hidden: true };
    (globalThis as any).document = fakeDoc;

    expect(areAllStudioWindowsHidden()).toBe(true);

    const fakeSatWin = { closed: false, document: { hidden: false } } as unknown as Window;
    detachedWindowManager.register('satellite', fakeSatWin);
    expect(areAllStudioWindowsHidden()).toBe(false);

    (fakeSatWin.document as { hidden: boolean }).hidden = true;
    expect(areAllStudioWindowsHidden()).toBe(true);

    (globalThis as any).document = prevDoc;
  });

  it('wakes suspended AudioContext on note preview and arms 15s idle auto-suspend', () => {
    const resumeSpy = vi.fn().mockResolvedValue(undefined);
    const fakeCtx = { state: 'suspended', resume: resumeSpy } as unknown as AudioContext;
    const wasSuspended = wakeAudioContextForNotePreview(fakeCtx, 15000);
    expect(wasSuspended).toBe(true);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
    cancelAudioContextAutoSuspend();
  });
});
