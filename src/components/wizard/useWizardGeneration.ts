import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { instrumentsConfig } from '../../data';
import { TrackGroup, Language, RhythmSignal } from '../../types';
import { dbToFaderPosition } from '../../utils/audioMath';
import { audioEngine } from '../../hooks/useAudioSync';
import { getBasePatternForInstrument } from './wizardRhythmPatterns';
import { createToadaBusAndTracks, createSementesBusTrack, createCaixasBusTrack } from './wizardBusHelpers';
import { createAlfaiasBusAndLinking } from './wizardAlfaiasBus';
import { t } from './wizardConstants';

export function useWizardGeneration(wizardLang: Language, customSignalsMap: Record<string, RhythmSignal>, sequencer: any) {
  const bpm = useWizardStore((state) => state.bpm);
  const timeSig = useWizardStore((state) => state.timeSig);
  const songInfo = useWizardStore((state) => state.songInfo);
  const selectedSignIds = useWizardStore((state) => state.selectedSignIds);
  const selectedBalancoId = useWizardStore((state) => state.selectedBalancoId);
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const selectedBasePatternId = useWizardStore((state) => state.selectedBasePatternId);
  const swingIntensities = useWizardStore((state) => state.swingIntensities);
  const alfaiaGroupingMode = useWizardStore((state) => state.alfaiaGroupingMode);
  const instrumentTunings = useWizardStore((state) => state.instrumentTunings);
  const hasToada = useWizardStore((state) => state.hasToada);

  const generateRodaFromWizard = async () => {
    sequencer.pushUndoState?.();
    sequencer.handleClear?.();
    sequencer.setBpm?.(bpm);
    if (sequencer.setTimeSig) sequencer.setTimeSig(timeSig as any);
    sequencer.setMetadata?.({
      toada: songInfo.toadaName, nacao: songInfo.nacaoName, compositor: songInfo.composer,
      ritmo: songInfo.mainRythm, youtubeUrl: songInfo.youtubeUrl, description: songInfo.rodaName,
      rhythmSignals: selectedSignIds.map((id, idx) => customSignalsMap[id] || { id, name: `Sinal ${idx + 1}`, image: id }),
    });

    const chosenBalanco = useBalancoStore.getState().resolvePreset(selectedBalancoId);
    useTransportStore.getState().setGlobalSwing({
      mode: chosenBalanco.id === 'straight' ? 'off' : 'custom',
      customOffsets: chosenBalanco.offsets as [number, number, number, number],
      swingIntensity: 100,
    });

    const tracksToAdd: TrackGroup[] = [];
    const firstMarcante = placedInstruments.find((i) => i.instrumentType === 'marcante');

    placedInstruments.forEach((inst, idx) => {
      const instIdx = instrumentsConfig.findIndex((c) => c.id === inst.instrumentType);
      if (instIdx === -1) return;
      const panPct = Math.round(((inst.x - 50) / 50) * 100);
      const volumeVal = 75;

      let intensity = 100;
      if (['marcante', 'meiao', 'repique'].includes(inst.instrumentType)) intensity = swingIntensities.alfaias;
      else if (['caixa', 'tarol'].includes(inst.instrumentType)) intensity = swingIntensities.caixas;
      else if (['agbe', 'mineiro'].includes(inst.instrumentType)) intensity = swingIntensities.sementes;
      else if (inst.instrumentType === 'gongue') intensity = swingIntensities.gongue;
      else if (inst.instrumentType === 'timbal') intensity = swingIntensities.timbal;

      const calculatedReverb = Math.round(Math.max(0, Math.min(1, (100 - inst.y) / 100)) * (inst.instrumentType === 'marcante' ? 10 : 25));
      const trackId = Date.now() + Math.floor(Math.random() * 100000) + idx;

      tracksToAdd.push({
        id: trackId, instrumentIdx: instIdx,
        patterns: [{
          id: trackId + 10000, name: wizardLang === 'fr' ? 'Motif 1' : 'Padrão 1', steps: 16,
          activeSteps: selectedBasePatternId ? getBasePatternForInstrument(selectedBasePatternId, inst.instrumentType) : Array(16).fill(0),
          lyrics: Array(16).fill(''), notes: Array(16).fill(''), measureAssignments: [true, false, false, false, false, false, false, false],
          volumes: Array(16).fill(80), decays: Array(16).fill(instrumentsConfig[instIdx]?.type === 'voice' ? 10 : 100), microtimings: Array(16).fill(0),
        }],
        isMute: false, isSolo: false, isHidden: false, volumeVal, selectedPatternId: trackId + 10000,
        reverbVal: calculatedReverb, panVal: panPct, pan: panPct, swingIntensity: intensity, balancoPresetId: selectedBalancoId,
        tuning: instrumentTunings[inst.instrumentType] || 0,
        fxSends: { reverb: calculatedReverb, distortion: 0 },
      });
      if (audioEngine) audioEngine.loadInstrumentSamples(inst.instrumentType).catch(console.error);
    });

    let finalTracks = tracksToAdd;
    if (alfaiaGroupingMode === 'bloc') {
      finalTracks = createAlfaiasBusAndLinking(finalTracks, firstMarcante?.id, wizardLang);
    }
    if (hasToada) finalTracks.push(...createToadaBusAndTracks(wizardLang));
    if (placedInstruments.some((i) => i.instrumentType === 'agbe' || i.instrumentType === 'mineiro')) {
      finalTracks.push(createSementesBusTrack(finalTracks));
    }
    if (placedInstruments.some((i) => i.instrumentType === 'caixa' || i.instrumentType === 'tarol')) {
      finalTracks.push(createCaixasBusTrack(finalTracks));
    }

    useSequencerStore.getState().setTracks(finalTracks);
    useSequencerStore.getState().setMeasureVols(Array(8).fill(100));
    if (typeof sequencer?.setMasterVol === 'function') sequencer.setMasterVol(0);
    await sequencer.alertAsync(t[wizardLang].consacree);
    useWizardStore.getState().setWizardOpen(false);
    useWizardStore.getState().setIntroModalOpen(false);
    useWizardStore.getState().resetWizard();
  };

  return { generateRodaFromWizard };
}
