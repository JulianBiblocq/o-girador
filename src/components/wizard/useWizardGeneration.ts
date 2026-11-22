import { useWizardStore, SwingIntensities } from '../../stores/useWizardStore';
import { useSequencerStore, isSequencerVisibleTrack } from '../../stores/useSequencerStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { instrumentsConfig } from '../../data';
import { TrackGroup, Language, RhythmSignal } from '../../types';
import { notifyToast } from '../../utils/toastHelper';
import { audioEngine } from '../../hooks/useAudioSync';
import { buildWizardInstrumentPatterns, buildWizardStructurePlan } from './wizardPatternBuilder';
import { buildCaixasGroup, buildSementesGroup, createToadaBusAndTracks } from './wizardBusHelpers';
import { buildAlfaiasGroup } from './wizardAlfaiasBus';
import { consolidateWizardPlacedTracks } from './wizardTrackConsolidator';
import { getDefaultWizardSigns } from './WizardStep2Signs';
import { stopAllWizardSpatialNodes } from './audio/wizardSpatialPreview';
import { t } from './wizardConstants';

function resolveFamilySwing(instType: string, s: SwingIntensities): number {
  if (instType === 'marcante' || instType === 'meiao' || instType === 'repique') return s.alfaias;
  if (instType === 'caixa' || instType === 'tarol') return s.caixas;
  if (instType === 'agbe' || instType === 'mineiro') return s.sementes;
  if (instType === 'gongue') return s.gongue;
  if (instType === 'timbal') return s.timbal;
  return 100;
}

export function useWizardGeneration(wizardLang: Language, customSignalsMap: Record<string, RhythmSignal>, sequencer: any) {
  const generateRodaFromWizard = async () => {
    stopAllWizardSpatialNodes();
    if (useSequencerStore.getState().isPlaying || sequencer?.isPlaying) sequencer?.handleStop?.();

    const st = useWizardStore.getState();
    const savedSignals = [...(useSequencerStore.getState().mestreSignals || [])];
    const defaultSigns = getDefaultWizardSigns(wizardLang);

    sequencer?.pushUndoState?.();
    sequencer?.handleClear?.();
    useSequencerStore.getState().setMestreSignals(savedSignals);

    const plan = buildWizardStructurePlan(
      st.structurePreset, st.timeSig, st.selectedCloudSectionData, st.selectedCloudSectionName, wizardLang
    );

    const resolvedSignals: RhythmSignal[] = st.selectedSignIds.map((id, idx) => {
      if (customSignalsMap[id]) return customSignalsMap[id];
      const cloudMatch = savedSignals.find((s) => (s.id || s.name) === id);
      if (cloudMatch) return { ...cloudMatch, image: cloudMatch.imageUrl || cloudMatch.image };
      const defMatch = defaultSigns.find((d) => d.id === id);
      return defMatch ? { id: defMatch.id, name: defMatch.name, image: defMatch.image } : { id, name: `Sinal ${idx + 1}`, image: id };
    });

    const title = st.songInfo.toadaName || st.songInfo.rodaName;
    sequencer?.setMetadata?.({
      toada: title, nacao: st.songInfo.nacaoName, compositor: st.songInfo.composer,
      ritmo: st.songInfo.mainRythm, youtubeUrl: st.songInfo.youtubeUrl,
      description: st.songInfo.rodaName || title, rhythmSignals: resolvedSignals,
    });

    const chosenBalanco = useBalancoStore.getState().resolvePreset(st.selectedBalancoId);
    useTransportStore.getState().setGlobalSwing({
      mode: chosenBalanco.id === 'straight' ? 'off' : 'custom',
      customOffsets: (chosenBalanco.offsets?.slice(0, 4) || [0, 0, 0, 0]) as [number, number, number, number],
      swingIntensity: 100,
    });

    const rawTracks = consolidateWizardPlacedTracks({
      placedInstruments: st.placedInstruments,
      resolveLabel: (instType) => useNomenclatureStore.getState().getInstrumentLabel(instType),
      resolveSwing: (instType) => resolveFamilySwing(instType, st.swingIntensities),
      buildPatterns: (instType) => buildWizardInstrumentPatterns(
        instType, plan, st.structurePreset, st.selectedBasePatternId, st.alfaiaGroupingMode, st.selectedCloudSectionData, wizardLang
      ),
      selectedBalancoId: st.selectedBalancoId,
      instrumentTunings: st.instrumentTunings,
      instrumentDecays: st.instrumentDecays,
      onLoadSample: (instType) => { if (audioEngine) audioEngine.loadInstrumentSamples(instType).catch(() => {}); },
    });

    const byRoles = (ids: string[]) => rawTracks.filter((tr) => ids.includes(instrumentsConfig[tr.instrumentIdx]?.id));
    const orderedTracks: TrackGroup[] = [
      ...buildAlfaiasGroup(byRoles(['marcante', 'meiao', 'repique']), st.alfaiaGroupingMode, wizardLang),
      ...byRoles(['gongue']),
      ...buildCaixasGroup(byRoles(['caixa', 'tarol']), wizardLang),
      ...buildSementesGroup(byRoles(['agbe', 'mineiro'])),
      ...byRoles(['timbal', 'apito']),
      ...(st.hasToada ? createToadaBusAndTracks(wizardLang, plan.totalMeasures, plan.stepsPerMeasure) : []),
    ];

    const rodaOrder = orderedTracks.filter((tr) => isSequencerVisibleTrack(tr, orderedTracks)).map((tr) => tr.id);
    const seq = useSequencerStore.getState();
    const cloudSigs = st.structurePreset === 'cloud_section' && st.selectedCloudSectionData?.signals?.length
      ? Array.from({ length: plan.totalMeasures }, (_, m) => st.selectedCloudSectionData!.signals[m] ?? null)
      : Array(plan.totalMeasures).fill(null);

    seq.setTotalMeasures(plan.totalMeasures, true);
    seq.setTimeSig(plan.measureTimeSigs[0] || '4/4');
    seq.setMeasureTimeSigs(plan.measureTimeSigs);
    seq.setGlobalBpm(st.bpm);
    seq.setNominalPresetTempo(st.bpm, Array(plan.totalMeasures).fill(st.bpm));
    seq.setMeasureBpms(Array(plan.totalMeasures).fill(st.bpm));
    seq.setMeasureVols(st.selectedCloudSectionData?.vols?.slice(0, plan.totalMeasures) || Array(plan.totalMeasures).fill(100));
    seq.setMeasureSignals(cloudSigs);
    seq.setSongSections(plan.songSections);
    seq.setShowLinkedTracksOnRoda(false);
    seq.setTracks(orderedTracks);
    seq.setRodaTrackOrder(rodaOrder);
    if (typeof sequencer?.setMasterVol === 'function') sequencer.setMasterVol(0);

    notifyToast(t[wizardLang].consacree, 'success');
    useWizardStore.getState().setWizardOpen(false);
    useWizardStore.getState().setIntroModalOpen(false);
    useWizardStore.getState().resetWizard();
  };

  return { generateRodaFromWizard };
}
