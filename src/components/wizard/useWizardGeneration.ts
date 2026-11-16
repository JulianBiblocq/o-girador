import { useWizardStore, SwingIntensities } from '../../stores/useWizardStore';
import { useSequencerStore, isSequencerVisibleTrack } from '../../stores/useSequencerStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { instrumentsConfig } from '../../data';
import { TrackGroup, Language, RhythmSignal } from '../../types';
import { getDefaultSignatureTuning } from '../../utils/audio/lutherieFactoryPresets';
import { notifyToast } from '../../utils/toastHelper';
import { audioEngine } from '../../hooks/useAudioSync';
import { computeWizardSpatialMix } from './wizardSpatialMixMath';
import { allocWizardId, buildWizardInstrumentPatterns, buildWizardStructurePlan } from './wizardPatternBuilder';
import { buildCaixasGroup, buildSementesGroup, createToadaBusAndTracks, linkSameRoleDuplicates } from './wizardBusHelpers';
import { buildAlfaiasGroup } from './wizardAlfaiasBus';
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

    const roleTotals: Record<string, number> = {};
    st.placedInstruments.forEach((i) => { roleTotals[i.instrumentType] = (roleTotals[i.instrumentType] || 0) + 1; });
    const roleSeen: Record<string, number> = {};
    const rawTracks: TrackGroup[] = [];

    st.placedInstruments.forEach((inst) => {
      const instIdx = instrumentsConfig.findIndex((c) => c.id === inst.instrumentType);
      if (instIdx === -1) return;
      roleSeen[inst.instrumentType] = (roleSeen[inst.instrumentType] || 0) + 1;
      const baseLabel = useNomenclatureStore.getState().getInstrumentLabel(inst.instrumentType);
      const customName = roleTotals[inst.instrumentType] > 1 ? `${baseLabel} ${roleSeen[inst.instrumentType]}` : baseLabel;
      const mix = computeWizardSpatialMix(inst.x, inst.y, inst.instrumentType);
      const famInt = resolveFamilySwing(inst.instrumentType, st.swingIntensities);
      const patterns = buildWizardInstrumentPatterns(
        inst.instrumentType, plan, st.structurePreset, st.selectedBasePatternId, st.alfaiaGroupingMode, st.selectedCloudSectionData, wizardLang
      );

      rawTracks.push({
        id: allocWizardId(), instrumentIdx: instIdx, customName, patterns,
        isMute: false, isSolo: false, isHidden: false, volumeVal: mix.faderPos, selectedPatternId: patterns[0]?.id || 0,
        reverbVal: mix.reverbSend, panVal: mix.panPct, pan: mix.panPct, swingIntensity: famInt, balancoAmount: famInt,
        balancoPresetId: st.selectedBalancoId, tuning: st.instrumentTunings[inst.instrumentType] ?? getDefaultSignatureTuning(inst.instrumentType),
        trackDecay: st.instrumentDecays[inst.instrumentType] ?? 100, fxSends: { reverb: mix.reverbSend, distortion: 0 },
      });
      if (audioEngine) audioEngine.loadInstrumentSamples(inst.instrumentType).catch(() => {});
    });

    const byRoles = (ids: string[]) => rawTracks.filter((tr) => ids.includes(instrumentsConfig[tr.instrumentIdx]?.id));
    const timbalTracks = byRoles(['timbal']);
    linkSameRoleDuplicates(timbalTracks, 'timbal');

    const orderedTracks: TrackGroup[] = [
      ...buildAlfaiasGroup(byRoles(['marcante', 'meiao', 'repique']), st.alfaiaGroupingMode, wizardLang),
      ...byRoles(['gongue']),
      ...buildCaixasGroup(byRoles(['caixa', 'tarol']), wizardLang),
      ...buildSementesGroup(byRoles(['agbe', 'mineiro'])),
      ...timbalTracks,
      ...(st.hasToada ? createToadaBusAndTracks(wizardLang, plan.totalMeasures, plan.stepsPerMeasure) : []),
    ];

    const rodaOrder = orderedTracks.filter((tr) => isSequencerVisibleTrack(tr, orderedTracks) && !tr.isHidden).map((tr) => tr.id);
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
