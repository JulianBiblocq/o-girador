// @ts-ignore
import { describe, expect, it } from 'vitest';
import { getMaxSectionPlayers, isSectionEnsembleEligible } from '../../../../constants/sectionEnsembleLimits';
import { useWizardStore } from '../../../../stores/useWizardStore';
import { buildSectionPresetLayout, resizeSectionPlayers } from '../../../../utils/sectionStagePresets';
import { consolidateWizardPlacedTracks } from '../../../wizard/wizardTrackConsolidator';
import {
  buildPlacedFromFormation,
  computeSmartSinglePlacement,
  WIZARD_EXPRESS_FORMATIONS,
} from '../../../wizard/wizardFormations';
import { serializeMasterRadarTicks } from '../../master/MasterPanRadarStrip';
import { buildGlobalStagePawns, isApitoTrack } from '../globalStagePawnModel';

describe('La Place (140°) & Assistant du Mestre — Exclusion du pion flottant Apito & ancrage sur le Mestre', () => {
  it('exclut systématiquement toute piste apito des pions du cône 140° et des ticks mobiles du radar Master', () => {
    const tracks: any[] = [
      { id: 101, instrumentIdx: 3, customName: 'Caixa', panVal: -25, volumeVal: 75 },
      {
        id: 109,
        instrumentIdx: 9,
        customName: 'Apito Mestre',
        panVal: 0,
        volumeVal: 75,
        sectionPlayers: [
          { id: 'ap_1', x: 35, y: 55, panVal: -30 },
          { id: 'ap_2', x: 65, y: 55, panVal: 30 },
        ],
      },
      { id: 110, instrumentIdx: 10, customName: 'Puxador', panVal: 0, volumeVal: 75 },
    ];

    expect(isApitoTrack(tracks[1])).toBe(true);
    expect(isApitoTrack(tracks[0])).toBe(false);

    const pawns = buildGlobalStagePawns(tracks, {}, 640, 400, (id) => id);
    expect(pawns.some((p) => p.trackId === 109)).toBe(false);
    expect(pawns.map((p) => p.trackId)).toEqual([101, 110]);

    const radarKey = serializeMasterRadarTicks(tracks);
    expect(radarKey).toContain('101:-25');
    expect(radarKey).not.toContain('109:');
    expect(radarKey).not.toContain('109_');
  });

  it('verrouille l’éligibilité d’escouade et les presets spatiaux de l’apito sur (x = 50, y = 100, panVal = 0)', () => {
    expect(getMaxSectionPlayers('apito')).toBe(1);
    expect(isSectionEnsembleEligible('apito')).toBe(false);
    expect(resizeSectionPlayers([{ id: 'ap1', x: 40, y: 60 }], 3, 'apito')).toBeUndefined();
    expect(buildSectionPresetLayout('arc', 3, 'apito')).toEqual([
      { id: 'apito_p1', x: 50, y: 100, panVal: 0, detuneCents: 0 },
    ]);
  });

  it('ancre l’apito sur le repère fixe [ MESTRE ] dans l’Assistant et génère une piste centrée (panVal = 0, x = 50, y = 100)', () => {
    for (const formation of WIZARD_EXPRESS_FORMATIONS) {
      expect(formation.slots.some((s) => s.instrumentType === 'apito')).toBe(false);
      expect(buildPlacedFromFormation(formation).some((p) => p.instrumentType === 'apito')).toBe(false);
    }
    expect(computeSmartSinglePlacement('apito', [])).toEqual({ x: 50, y: 100 });

    useWizardStore.getState().resetWizard();
    expect(useWizardStore.getState().hasApito).toBe(false);

    const anchored = useWizardStore.getState().addPlacedInstrument('apito', 32, 48);
    expect(anchored).toEqual({ id: 'apito_mestre', instrumentType: 'apito', x: 50, y: 100 });
    expect(useWizardStore.getState().hasApito).toBe(true);
    expect(useWizardStore.getState().placedInstruments).toHaveLength(0);

    useWizardStore.getState().toggleApito();
    expect(useWizardStore.getState().hasApito).toBe(false);

    useWizardStore.getState().setPlacedInstruments([
      { id: 'cx1', instrumentType: 'caixa', x: 40, y: 56 },
      { id: 'legacy_ap', instrumentType: 'apito', x: 25, y: 40 },
    ]);
    expect(useWizardStore.getState().hasApito).toBe(true);
    expect(useWizardStore.getState().placedInstruments.map((i) => i.instrumentType)).toEqual(['caixa']);

    const generated = consolidateWizardPlacedTracks({
      placedInstruments: useWizardStore.getState().placedInstruments,
      hasApito: useWizardStore.getState().hasApito,
      resolveLabel: (id) => id,
      resolveSwing: () => 100,
      buildPatterns: () => [{ id: 1, name: 'Base', steps: 16, activeSteps: Array(16).fill(0), lyrics: [], notes: [], measureAssignments: [true] }],
      selectedBalancoId: 'maracatu-trad',
      instrumentTunings: {},
      instrumentDecays: {},
    });

    const apitoTrack = generated.find((tr) => tr.instrumentIdx === 9)!;
    expect(apitoTrack).toBeDefined();
    expect(apitoTrack.panVal).toBe(0);
    expect(apitoTrack.pan).toBe(0);
    expect(apitoTrack.sectionPlayers).toBeUndefined();
    expect(apitoTrack.reverbVal).toBe(8);
    useWizardStore.getState().resetWizard();
  });
});
