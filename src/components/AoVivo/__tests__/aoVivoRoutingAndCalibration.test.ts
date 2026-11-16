// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it, beforeEach } from 'vitest';
import {
  normalizeAoVivoFamily,
  resolveActiveAoVivoContext,
  resolveTrackAoVivoFamily,
} from '../resolveAoVivoFamily';
import { resolveAlfaiaSecondaryFamily } from '../AlfaiaSticksOverlay';
import { selectAoVivoLabInstrument } from '../aoVivoStrokeTester';
import { setIsAoVivoLabOpen, getAoVivoLabPreviewFamily } from '../../../audio/animations/aoVivoConfigStorage';
import { DEFAULT_ALFAIA_STICKS_CONFIG, resetAlfaiaSticksConfig } from '../../../audio/animations/alfaiaStickConfig';
import { DEFAULT_CAIXA_STICKS_CONFIG } from '../../../audio/animations/caixaStickConfig';
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

  it('normalizes all 7 instrument families without accents and returns null (never alfaia) for voice/apito/unknown', () => {
    expect(normalizeAoVivoFamily('marcante')).toBe('alfaia');
    expect(normalizeAoVivoFamily('Meião')).toBe('alfaia');
    expect(normalizeAoVivoFamily('alfaia_agudo')).toBe('alfaia');
    expect(normalizeAoVivoFamily('caixa')).toBe('caixa');
    expect(normalizeAoVivoFamily('tarol')).toBe('tarol');
    expect(normalizeAoVivoFamily('Gonguê')).toBe('gongue');
    expect(normalizeAoVivoFamily('Timbal')).toBe('timbal');
    expect(normalizeAoVivoFamily('Agbê')).toBe('agbe');
    expect(normalizeAoVivoFamily('Mineiro')).toBe('mineiro');
    expect(normalizeAoVivoFamily('voix')).toBeNull();
    expect(normalizeAoVivoFamily('toada')).toBeNull();
    expect(normalizeAoVivoFamily('apito')).toBeNull();
    expect(normalizeAoVivoFamily('inconnu_xyz')).toBeNull();
  });

  it('resolves master child for Bus/Link folders (ALFAIAS, CAIXAS) and null for Puxador/Apito', () => {
    const tracks = useSequencerStore.getState().tracks;
    expect(resolveTrackAoVivoFamily(tracks[0], tracks)).toMatchObject({ family: 'alfaia', instId: 'marcante' });
    expect(resolveTrackAoVivoFamily(tracks[2], tracks)).toMatchObject({ family: 'caixa', instId: 'caixa' });
    expect(resolveTrackAoVivoFamily(tracks[4], tracks)).toMatchObject({ family: 'tarol', instId: 'tarol' });
    expect(resolveTrackAoVivoFamily(tracks[7], tracks)).toMatchObject({ family: 'mineiro', instId: 'mineiro' });
    expect(resolveTrackAoVivoFamily(tracks[8], tracks).family).toBeNull();
    expect(resolveTrackAoVivoFamily(tracks[9], tracks).family).toBeNull();
  });

  it('switches activeAoVivoTrackId on Focus, Editor and Labo selection, and isolates synthetic Labo preview', () => {
    const st = useSequencerStore.getState();
    st.setActiveAoVivoTrackId(101);
    st.setFocusTrackId(107, undefined, true);
    expect(useSequencerStore.getState().activeAoVivoTrackId).toBe(107);

    useSequencerStore.getState().setEditingTrackId(105);
    expect(useSequencerStore.getState().activeAoVivoTrackId).toBe(105);

    setIsAoVivoLabOpen(true);
    selectAoVivoLabInstrument('timbal');
    expect(getAoVivoLabPreviewFamily()).toBe('timbal');
    const ctx = resolveActiveAoVivoContext(
      useSequencerStore.getState().activeAoVivoTrackId,
      useSequencerStore.getState().tracks,
      getAoVivoLabPreviewFamily()
    );
    expect(ctx).toEqual({ resolvedTrack: null, family: 'timbal', instId: 'timbal', isSyntheticPreview: true });
  });

  it('resolves Alfaia auto mode to macaneta by default, fina on A/a, and bacalhau on stroke I', () => {
    const tracks = useSequencerStore.getState().tracks;
    expect(DEFAULT_ALFAIA_STICKS_CONFIG.leftStickMode).toBe('auto');
    expect(resolveAlfaiaSecondaryFamily(tracks[1])).toBe('macaneta');

    useSequencerStore.setState({
      tracks: [{ id: 101, instrumentIdx: 0, patterns: [{ id: 1, activeSteps: ['D', ['d', 'a'], 'e', 'D'], measureAssignments: [true] }] } as any],
    });
    expect(resolveAlfaiaSecondaryFamily(useSequencerStore.getState().tracks[0])).toBe('fina');

    useSequencerStore.setState({
      tracks: [{ id: 101, instrumentIdx: 0, patterns: [{ id: 1, activeSteps: ['D', 'A', 'I', 'D'], measureAssignments: [true] }] } as any],
    });
    expect(resolveAlfaiaSecondaryFamily(useSequencerStore.getState().tracks[0])).toBe('bacalhau');
  });

  it('matches all 7 calibrated PC and Mobile default configurations', () => {
    expect(DEFAULT_ALFAIA_STICKS_CONFIG).toMatchObject({ leftStickMode: 'auto', stickAngleDeg: 33, stickSpreadPx: 168, impactReachY: -110 });
    expect(DEFAULT_CAIXA_STICKS_CONFIG).toMatchObject({ previewMode: 'auto', stickAngleDeg: 31, rimshotSkinImpactY: 46, rimshotImpactScaleZ: 0.79 });
    expect(DEFAULT_GONGUE_STICK_CONFIG).toMatchObject({ globalOffsetX: 196, strikeDurationMs: 110, metalCrushMs: 68 });
    expect(DEFAULT_TIMBAL_HANDS_CONFIG.anatomy).toMatchObject({ handScale: 2.1, handSpreadPx: 124, restOffsetY: 208 });
    expect(DEFAULT_TIMBAL_HANDS_CONFIG.strokes).toMatchObject({
      graveWindUpScaleZ: 1.28, slapImpactY: 360, slapConvergeX: -6, slapWindUpLiftY: 0, slapWindUpScaleZ: 0.78,
      slapImpactScaleZ: 1.16, slapFingerSplayDeg: 6.5, slapSnapBackMs: 80, slapThumbLift: -0.06, slapEntryOutsideX: 65,
      presoHoldMs: 100, ghostAmplitudePx: 5, clapImpactY: 226, clapConvergeX: -56, clapProfileScaleX: 0.45, clapVerticalTiltDeg: 68,
    });
    expect(DEFAULT_TIMBAL_HANDS_CONFIG.transitions.stayLowAfterStrongY).toBe(-12);
    expect(DEFAULT_AGBE_LAB_CONFIG).toMatchObject({ pivotYPercent: 27, strongTranslateX: 66, pendulumDurationMs: 260 });
    expect(DEFAULT_MINEIRO_LAB_CONFIG).toMatchObject({ pushStrongY: -26, ladoOffsetX: -66, cycleDurationMs: 380 });
    expect(DEFAULT_AO_VIVO_MOBILE_OFFSETS.timbal).toEqual({ offsetY: -36, offsetX: 0, scaleMult: 1.16, spreadDeltaPx: -120, reachDeltaY: -64 });
  });
});
