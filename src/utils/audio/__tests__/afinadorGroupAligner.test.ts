// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, col: string, id: string) => ({ col, id }));
vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => mockDoc(db, col, id),
  getDoc: (ref: unknown) => mockGetDoc(ref),
}));
vi.mock('../../../firebase/config', () => ({ db: {} }));

import {
  AFINADOR_LOCAL_STORAGE_KEY,
  computeDrumFoldedTuning,
  computeGongueAlignedTunings,
  DEFAULT_GONGUE_STUDIO_HZ,
  fetchGroupAfinadorCloudProfile,
  GONGUE_CHROMATIC_OPTIONS,
  loadLocalAfinadorProfile,
  saveLocalAfinadorProfile,
} from '../afinadorGroupAligner';
import { getDrumPitchNoteInfo } from '../drumPitchToNote';
import { DEFAULT_SIGNATURE_TUNINGS } from '../lutherieFactoryPresets';

const memStore = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => { memStore.set(k, v); },
    removeItem: (k: string) => { memStore.delete(k); },
  };
}

describe('Afinador Group Aligner & 12-Note Gonguê Harmonic Solver', () => {
  beforeEach(() => {
    globalThis.localStorage.removeItem(AFINADOR_LOCAL_STORAGE_KEY);
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  it('exposes 12 chromatic Gonguê options centered on Sol#4 (414.5 Hz) from Ré4 to Do#5', () => {
    expect(GONGUE_CHROMATIC_OPTIONS).toHaveLength(12);
    expect(GONGUE_CHROMATIC_OPTIONS[0]).toMatchObject({ midi: 62, labelFr: 'Ré4', intl: 'D4', hz: 293.7 });
    expect(GONGUE_CHROMATIC_OPTIONS[6]).toMatchObject({ midi: 68, labelFr: 'Sol#4', intl: 'G#4', hz: DEFAULT_GONGUE_STUDIO_HZ });
    expect(GONGUE_CHROMATIC_OPTIONS[11]).toMatchObject({ midi: 73, labelFr: 'Do#5', intl: 'C#5', hz: 554.4 });
  });

  it('guarantees <= 4 cents accuracy across all 12 notes x 2 modes with Gonguê [-6,+6] and Alfaias [-4.5,+4.5]', () => {
    for (const opt of GONGUE_CHROMATIC_OPTIONS) {
      for (const mode of ['major', 'minor'] as const) {
        const res = computeGongueAlignedTunings(opt.hz, mode);
        expect(Math.abs(res.tunings.gongue)).toBeLessThanOrEqual(6.0);
        const gInfo = getDrumPitchNoteInfo('gongue', res.tunings.gongue, 'fr');
        expect(Math.abs(gInfo.cents)).toBeLessThanOrEqual(4);

        const mInfo = getDrumPitchNoteInfo('marcante', res.tunings.marcante, 'fr');
        const meInfo = getDrumPitchNoteInfo('meiao', res.tunings.meiao, 'fr');
        const rInfo = getDrumPitchNoteInfo('repique', res.tunings.repique, 'fr');

        for (const role of ['marcante', 'meiao', 'repique'] as const) {
          expect(Math.abs(res.tunings[role])).toBeLessThanOrEqual(4.5);
          expect(Math.abs(getDrumPitchNoteInfo(role, res.tunings[role], 'fr').cents)).toBeLessThanOrEqual(4);
        }
        expect(mInfo.frequencyHz).toBeLessThan(meInfo.frequencyHz);
        expect(meInfo.frequencyHz).toBeLessThan(rInfo.frequencyHz);
      }
    }
  });

  it('matches flagship Maracatu keys (Sol4 -> Do Majeur, Sol#4 -> Do# Mineur, La4 -> Ré Mineur, Do5 -> Do Majeur)', () => {
    const sol4Maj = computeGongueAlignedTunings(392.0, 'major');
    expect(sol4Maj.keyLabelFr).toBe('Do Majeur');
    expect(sol4Maj.bellRelation).toBe('fifth');
    expect(sol4Maj.tunings).toEqual(DEFAULT_SIGNATURE_TUNINGS);

    const solSharpMin = computeGongueAlignedTunings(414.5, 'minor');
    expect(solSharpMin.keyLabelFr).toBe('Do# Mineur');
    expect(solSharpMin.tunings).toMatchObject({ marcante: -0.5, meiao: 0.3, repique: 1.3, gongue: 0 });

    const la4Min = computeGongueAlignedTunings(440.0, 'minor');
    expect(la4Min.keyLabelFr).toBe('Ré Mineur');
    expect(la4Min.tunings).toMatchObject({ marcante: 0.5, meiao: 1.3, repique: 2.3, gongue: 1.0 });

    const do5Maj = computeGongueAlignedTunings(523.3, 'major');
    expect(do5Maj.keyLabelFr).toBe('Do Majeur');
    expect(do5Maj.bellRelation).toBe('tonic');
    expect(do5Maj.tunings).toMatchObject({ marcante: -1.5, meiao: 0.3, repique: 0.3, gongue: 4.0 });
  });

  it('folds octaves cleanly and enforces per-family bounds in exact drumsHz mode', () => {
    expect(computeDrumFoldedTuning('gongue', 196.0)).toBe(-1.0);
    expect(computeDrumFoldedTuning('gongue', 784.0)).toBe(-1.0);

    const exact = computeGongueAlignedTunings(293.7, 'exact', {
      marcante: 105, meiao: 55, repique: 140, gongue: 293.7, timbal: 135, caixa: 500, tarol: 300,
    });
    expect(exact.bellRelation).toBe('exact');
    expect(exact.keyLabelFr).toBe('Parc Afinador');
    expect(exact.tunings.gongue).toBe(-6.0);
    expect(Math.abs(exact.tunings.marcante)).toBeLessThanOrEqual(4.5);
    expect(Math.abs(exact.tunings.meiao)).toBeLessThanOrEqual(4.5);
    expect(Math.abs(exact.tunings.repique)).toBeLessThanOrEqual(4.5);
    expect(Math.abs(exact.tunings.timbal)).toBeLessThanOrEqual(3.5);
    expect(Math.abs(exact.tunings.caixa)).toBeLessThanOrEqual(2.0);
    expect(Math.abs(exact.tunings.tarol)).toBeLessThanOrEqual(2.0);
  });

  it('persists local fallback profile and makes zero Firestore calls without groupId, reading /associations silently with groupId', async () => {
    expect(loadLocalAfinadorProfile()).toEqual({ gongueHz: 414.5, mode: 'major' });
    saveLocalAfinadorProfile({ gongueHz: 392.0, mode: 'minor' });
    expect(loadLocalAfinadorProfile()).toMatchObject({ gongueHz: 392.0, mode: 'minor' });

    expect(await fetchGroupAfinadorCloudProfile(null)).toBeNull();
    expect(await fetchGroupAfinadorCloudProfile('   ')).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();

    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ afinador: { gongueHz: 440, mode: 'minor' } }) });
    const cloud = await fetchGroupAfinadorCloudProfile('baque-nordeste');
    expect(cloud).toEqual({ gongueHz: 440, mode: 'minor' });
    expect(mockDoc.mock.calls[0]?.[1]).toBe('associations');
  });
});
