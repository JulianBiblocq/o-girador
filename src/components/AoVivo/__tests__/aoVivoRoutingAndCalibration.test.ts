// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it, beforeEach } from 'vitest';
import {
  normalizeAoVivoFamily,
  resolveActiveAoVivoContext,
  resolveTrackAoVivoFamily,
} from '../resolveAoVivoFamily';
import { resolveAlfaiaSecondaryFamily } from '../AlfaiaSticksOverlay';
import { selectAoVivoLabInstrument } from '../aoVivoStrokeTester';
import {
  getAoVivoLabPreviewFamily,
  setAoVivoMobileEditForced,
  setIsAoVivoLabOpen,
} from '../../../audio/animations/aoVivoConfigStorage';
import {
  buildFullMobileAoVivoExportObject,
  setActiveMobileDrumFamily,
} from '../../../audio/animations/aoVivoMobileStrokeConfigs';
import { CONFIG_ALFAIA_STICKS, DEFAULT_ALFAIA_STICKS_CONFIG, resetAlfaiaSticksConfig, updateAlfaiaSticksConfig } from '../../../audio/animations/alfaiaStickConfig';
import { CONFIG_CAIXA_STICKS, DEFAULT_CAIXA_STICKS_CONFIG, getActiveCaixaSticksConfig, resetCaixaSticksConfig, updateCaixaSticksConfig } from '../../../audio/animations/caixaStickConfig';
import { DEFAULT_GONGUE_STICK_CONFIG } from '../../../audio/animations/gongueStickConfig';
import { DEFAULT_TIMBAL_HANDS_CONFIG } from '../../../audio/animations/timbalHandConfig';
import { DEFAULT_AGBE_LAB_CONFIG } from '../../../audio/animations/agbeLabConfig';
import { DEFAULT_MINEIRO_LAB_CONFIG } from '../../../audio/animations/mineiroLabConfig';
import { DEFAULT_AO_VIVO_MOBILE_OFFSETS } from '../../../audio/animations/aoVivoMobileOffsets';
import { useSequencerStore } from '../../../stores/useSequencerStore';

describe('Ao Vivo — Multi-Instrument Routing & 7 Calibrated Configs', () => {
  beforeEach(() => {
    setIsAoVivoLabOpen(false);
    resetAlfaiaSticksConfig();
    resetCaixaSticksConfig();
    useSequencerStore.setState({
      activeAoVivoTrackId: null,
      isFocusActive: false,
      focusTrackId: null,
      editingTrackId: null,
      tracks: [
        { id: 100, instrumentIdx: 0, customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: true, patterns: [] } as any,
        { id: 101, instrumentIdx: 0, customName: 'Marcante', busId: '100', linkedToTrackId: '100', isLinkMaster: true, patterns: [{ id: 1, activeSteps: ['D', 0, 'e', 'D'], measureAssignments: [true] }] } as any,
        { id: 102, instrumentIdx: 3, customName: 'CAIXAS', isBusFolder: true, isLinkFolder: true, patterns: [] } as any,
        { id: 103, instrumentIdx: 3, customName: 'Caixa', busId: '102', linkedToTrackId: '102', isLinkMaster: true, patterns: [{ id: 2, activeSteps: ['D', 'e'], measureAssignments: [true] }] } as any,
        { id: 104, instrumentIdx: 4, customName: 'Tarol', busId: '102', linkedToTrackId: '102', patterns: [{ id: 3, activeSteps: ['D', 'e'], measureAssignments: [true] }] } as any,
        { id: 105, instrumentIdx: 5, customName: 'Gonguê', patterns: [{ id: 4, activeSteps: ['G', 'A'], measureAssignments: [true] }] } as any,
        { id: 106, instrumentIdx: 6, customName: 'Agbê', patterns: [{ id: 5, activeSteps: ['D', 'e'], measureAssignments: [true] }] } as any,
        { id: 107, instrumentIdx: 7, customName: 'Mineiro', patterns: [{ id: 6, activeSteps: ['P', 'T'], measureAssignments: [true] }] } as any,
        { id: 108, instrumentIdx: 10, customName: 'Puxador', patterns: [] } as any,
        { id: 109, instrumentIdx: 9, customName: 'Apito', patterns: [] } as any,
      ],
    });
  });

  it('normalizes all 7 instrument families without accents and returns null for voice/apito/unknown', () => {
    expect(normalizeAoVivoFamily('marcante')).toBe('alfaia');
    expect(normalizeAoVivoFamily('Meião')).toBe('alfaia');
    expect(normalizeAoVivoFamily('caixa')).toBe('caixa');
    expect(normalizeAoVivoFamily('tarol')).toBe('tarol');
    expect(normalizeAoVivoFamily('Gonguê')).toBe('gongue');
    expect(normalizeAoVivoFamily('Timbal')).toBe('timbal');
    expect(normalizeAoVivoFamily('Agbê')).toBe('agbe');
    expect(normalizeAoVivoFamily('Mineiro')).toBe('mineiro');
    expect(normalizeAoVivoFamily('voix')).toBeNull();
    expect(normalizeAoVivoFamily('apito')).toBeNull();
  });

  it('resolves master child for Bus/Link folders and switches Labo preview cleanly', () => {
    const tracks = useSequencerStore.getState().tracks;
    expect(resolveTrackAoVivoFamily(tracks[0], tracks)).toMatchObject({ family: 'alfaia', instId: 'marcante' });
    expect(resolveTrackAoVivoFamily(tracks[2], tracks)).toMatchObject({ family: 'caixa', instId: 'caixa' });
    expect(resolveTrackAoVivoFamily(tracks[4], tracks)).toMatchObject({ family: 'tarol', instId: 'tarol' });
    setIsAoVivoLabOpen(true);
    selectAoVivoLabInstrument('timbal');
    expect(getAoVivoLabPreviewFamily()).toBe('timbal');
    expect(resolveActiveAoVivoContext(null, tracks, getAoVivoLabPreviewFamily())).toEqual({
      resolvedTrack: null, family: 'timbal', instId: 'timbal', isSyntheticPreview: true,
    });
  });

  it('resolves Alfaia auto mode to macaneta by default, fina on A/a, and bacalhau on stroke I', () => {
    const tracks = useSequencerStore.getState().tracks;
    expect(resolveAlfaiaSecondaryFamily(tracks[1])).toBe('macaneta');
    useSequencerStore.setState({ tracks: [{ id: 101, instrumentIdx: 0, patterns: [{ id: 1, activeSteps: ['D', ['d', 'a'], 'e', 'D'], measureAssignments: [true] }] } as any] });
    expect(resolveAlfaiaSecondaryFamily(useSequencerStore.getState().tracks[0])).toBe('fina');
    useSequencerStore.setState({ tracks: [{ id: 101, instrumentIdx: 0, patterns: [{ id: 1, activeSteps: ['D', 'A', 'I', 'D'], measureAssignments: [true] }] } as any] });
    expect(resolveAlfaiaSecondaryFamily(useSequencerStore.getState().tracks[0])).toBe('bacalhau');
  });

  it('matches all 7 calibrated PC and v4 Mobile default configurations', () => {
    expect(DEFAULT_ALFAIA_STICKS_CONFIG).toMatchObject({ leftStickMode: 'auto', stickAngleDeg: 33, stickSpreadPx: 168, impactReachY: -110 });
    expect(DEFAULT_CAIXA_STICKS_CONFIG).toMatchObject({ previewMode: 'auto', stickAngleDeg: 31, rimshotSkinImpactY: 46 });
    expect(DEFAULT_GONGUE_STICK_CONFIG).toMatchObject({ globalOffsetX: 196, strikeDurationMs: 110, metalCrushMs: 68 });
    expect(DEFAULT_TIMBAL_HANDS_CONFIG.anatomy).toMatchObject({ handScale: 2.1, handSpreadPx: 124, restOffsetY: 208 });
    expect(DEFAULT_AGBE_LAB_CONFIG).toMatchObject({ pivotYPercent: 27, strongTranslateX: 66, pendulumDurationMs: 260 });
    expect(DEFAULT_MINEIRO_LAB_CONFIG).toMatchObject({ pushStrongY: -26, ladoOffsetX: -66, cycleDurationMs: 380 });
    expect(DEFAULT_AO_VIVO_MOBILE_OFFSETS.alfaia).toEqual({ offsetY: -20, offsetX: -2, scaleMult: 1.34, spreadDeltaPx: -20, reachDeltaY: 74 });
    expect(DEFAULT_AO_VIVO_MOBILE_OFFSETS.caixa).toEqual({ offsetY: 10, offsetX: 0, scaleMult: 1.4, spreadDeltaPx: -36, reachDeltaY: 76 });
    expect(DEFAULT_AO_VIVO_MOBILE_OFFSETS.tarol).toEqual({ offsetY: 70, offsetX: 0, scaleMult: 1.4, spreadDeltaPx: 32, reachDeltaY: 0 });
    expect(DEFAULT_AO_VIVO_MOBILE_OFFSETS.timbal).toEqual({ offsetY: -36, offsetX: 0, scaleMult: 1.16, spreadDeltaPx: -120, reachDeltaY: 2 });
  });

  it('isolates Mobile per-stroke configs (including independent Caixa vs Tarol) without touching PC', () => {
    setIsAoVivoLabOpen(true);
    setAoVivoMobileEditForced(true);
    updateAlfaiaSticksConfig({ rimshotImpactY: 99 });
    setActiveMobileDrumFamily('caixa');
    updateCaixaSticksConfig({ crossClickY: 12 });
    setActiveMobileDrumFamily('tarol');
    expect(CONFIG_CAIXA_STICKS.crossClickY).toBe(58);
    updateCaixaSticksConfig({ crossClickY: 84 });
    expect(getActiveCaixaSticksConfig('caixa').crossClickY).toBe(12);
    expect(getActiveCaixaSticksConfig('tarol').crossClickY).toBe(84);

    const exported = buildFullMobileAoVivoExportObject();
    expect(exported.mobileStrokeConfigs).toMatchObject({
      alfaia: { rimshotImpactY: 99 },
      caixa: { crossClickY: 12 },
      tarol: { crossClickY: 84 },
    });

    setIsAoVivoLabOpen(false);
    expect(CONFIG_ALFAIA_STICKS.rimshotImpactY).toBe(158);
    expect(CONFIG_CAIXA_STICKS.crossClickY).toBe(58);
  });
});
