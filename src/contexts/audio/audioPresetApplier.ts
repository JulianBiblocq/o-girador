import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { invalidateAudioParamsCache } from '../../hooks/useAudioSync';
import { CURRENT_AUDIO_SCALE_VERSION } from '../../utils/audioMath';
import { migrateAndSanitizePresetTracks } from './audioPresetTracksMigrator';
import { restorePresetVocalRecordings } from './audioPresetVocalRestorer';
import { restoreMasterFxFromPreset } from './audioMasterFxRestorer';
import { restorePresetAutomationsAndVocal, restorePresetVigilancePoints } from './presetSerializationHelpers';

export async function executeApplyPreset(
  p: any,
  sequencer: any,
  audioSync: any,
  setters: {
    setMasterEQ: (eq: any) => void;
    setMasterCompressor: (comp: any) => void;
    setMasterVol: (vol: number) => void;
    setMasterReverbVol: (vol: number) => void;
    setReverbDecay: (decay: number) => void;
  }
): Promise<void> {
  vocalEngineService.disposeAllVocalPlayers();
  useSequencerStore.getState().resetFirstPassRegistry();
  sequencer.clearHistory();
  sequencer.setMetadata({
    toada: p.metadata?.toada || '',
    nacao: p.metadata?.nacao || '',
    compositor: p.metadata?.compositor || '',
    ritmo: p.metadata?.ritmo || '',
    rhythmSignals: p.metadata?.rhythmSignals || [],
    ...(p.metadata || {})
  });

  const loadedMeasures = p.totalMeasures || 8;
  const isAudioV2 = p.audioScaleVersion === CURRENT_AUDIO_SCALE_VERSION;
  const loadedTracks = migrateAndSanitizePresetTracks(p, loadedMeasures);
  await restorePresetVocalRecordings(loadedTracks);

  const loadedTrackIds = new Set(loadedTracks.map(t => t.id));
  const rawRodaOrder = Array.isArray(p.rodaTrackOrder) ? p.rodaTrackOrder : [];
  const validExisting = rawRodaOrder.filter((id: any) => typeof id === 'number' && loadedTrackIds.has(id));
  const missing = loadedTracks.map(t => t.id).filter(id => !validExisting.includes(id));
  const finalRodaOrder = [...validExisting, ...missing];

  useSequencerStore.setState({
    rodaTrackOrder: finalRodaOrder,
    totalMeasures: loadedMeasures,
    tracksVersion: useSequencerStore.getState().tracksVersion + 1,
    isLetraActive: false
  });
  useSequencerStore.getState().setTracks(loadedTracks);
  useSequencerStore.getState().setRodaTrackOrder(finalRodaOrder);
  useSequencerStore.getState().resetSpeedTrainerConfig();

  try {
    await vocalEngineService.rehydrateVocalBuffers(loadedTracks);
  } catch (err) {
    console.error("[VOCAL REHYDRATE] Error during applyPreset:", err);
  }

  const defaultBpm = Math.round(p.bpm || 90);
  const defaultTimeSig = p.timeSig || '4/4';
  const loadedBpms = p.measureBpms && Array.isArray(p.measureBpms) ? p.measureBpms.map((b: number) => Math.round(b)) : Array(loadedMeasures).fill(defaultBpm);
  const loadedTimeSigs = p.measureTimeSigs && Array.isArray(p.measureTimeSigs) ? p.measureTimeSigs : Array(loadedMeasures).fill(defaultTimeSig);
  const loadedBpmTransitions = p.measureBpmTransitions && Array.isArray(p.measureBpmTransitions) ? p.measureBpmTransitions : Array(loadedMeasures).fill('immediate');
  const loadedVols = p.measureVols && Array.isArray(p.measureVols) ? p.measureVols.map((v: number) => {
    const rounded = Math.round(v);
    return !isAudioV2 ? (rounded === 100 ? 75 : Math.round(rounded * 0.75)) : rounded;
  }) : Array(loadedMeasures).fill(75);
  const loadedVolTransitions = p.measureVolTransitions && Array.isArray(p.measureVolTransitions) ? p.measureVolTransitions : Array(loadedMeasures).fill('immediate');

  sequencer.setTotalMeasures(loadedMeasures, true);
  sequencer.setBpmRaw(defaultBpm);
  sequencer.setTimeSig(defaultTimeSig);
  useSequencerStore.getState().setNominalPresetTempo(defaultBpm, loadedBpms);
  useSequencerStore.setState({ bpm: defaultBpm, measureBpms: loadedBpms });
  sequencer.setMeasureBpms(loadedBpms); sequencer.setMeasureTimeSigs(loadedTimeSigs);
  sequencer.setMeasureBpmTransitions(loadedBpmTransitions); sequencer.setMeasureVols(loadedVols); sequencer.setMeasureVolTransitions(loadedVolTransitions);

  useSequencerStore.getState().clearLoopExitRequest();
  useSequencerStore.getState().setIsLoopBypassed(false);
  useSequencerStore.getState().setCurrentLoopIteration(1);
  useSequencerStore.getState().setLoopMode(p.loopMode !== undefined ? p.loopMode : 'infinite');
  sequencer.setLoopStartMeasure(p.loopStartMeasure !== undefined ? p.loopStartMeasure : null);
  sequencer.setLoopEndMeasure(p.loopEndMeasure !== undefined ? p.loopEndMeasure : null);
  sequencer.setIsLoopRegionActive(p.isLoopRegionActive !== undefined ? p.isLoopRegionActive : true);
  if (p.isLooping !== undefined) sequencer.setIsLooping(p.isLooping);

  const loadedSections = (p.songSections && Array.isArray(p.songSections)) ? JSON.parse(JSON.stringify(p.songSections)) : [];
  const loadedMarkers = (p.songMarkers && Array.isArray(p.songMarkers)) ? JSON.parse(JSON.stringify(p.songMarkers)) : [];
  const loadedSignals = (p.measureSignals && Array.isArray(p.measureSignals)) ? JSON.parse(JSON.stringify(p.measureSignals)) : Array(loadedMeasures).fill(null);
  useSequencerStore.setState({ songSections: loadedSections, songMarkers: loadedMarkers, measureSignals: loadedSignals });
  sequencer.setSongSections(loadedSections); sequencer.setSongMarkers(loadedMarkers); sequencer.setMeasureSignals(loadedSignals);
  if (sequencer.songSectionsRef) sequencer.songSectionsRef.current = loadedSections;
  if (sequencer.songMarkersRef) sequencer.songMarkersRef.current = loadedMarkers;
  if (sequencer.measureSignalsRef) sequencer.measureSignalsRef.current = loadedSignals;

  restoreMasterFxFromPreset(p, setters.setMasterEQ, setters.setMasterCompressor, setters.setMasterVol, setters.setMasterReverbVol, setters.setReverbDecay);

  if (p.globalSwing) audioSync.setGlobalSwing(p.globalSwing);
  else if (p.isSwingOn !== undefined) audioSync.setGlobalSwing(p.isSwingOn ? { mode: 'maracatu', customOffsets: [0, 8, -29, -58] } : { mode: 'off', customOffsets: [0, 8, -29, -58] });
  else audioSync.setGlobalSwing({ mode: 'maracatu', customOffsets: [0, 8, -29, -58] });

  sequencer.totalMeasuresRef.current = loadedMeasures; sequencer.measureBpmsRef.current = loadedBpms;
  sequencer.measureTimeSigsRef.current = loadedTimeSigs; sequencer.measureBpmTransitionsRef.current = loadedBpmTransitions;
  sequencer.measureVolsRef.current = loadedVols; sequencer.measureVolTransitionsRef.current = loadedVolTransitions;
  if (p.metadata?.preRollSettings || p.preRollSettings) {
    useTransportStore.getState().setPreRollSettings(p.metadata?.preRollSettings || p.preRollSettings);
  }

  const targetVocalPreset = p.vocalPreset || p.metadata?.vocalPreset;
  if (targetVocalPreset) useAudioStore.getState().setVocalPreset(targetVocalPreset as any);

  restorePresetAutomationsAndVocal(p);
  restorePresetVigilancePoints(p);

  sequencer.measureCountRef.current = 0;
  sequencer.tracksRef.current = loadedTracks;
  invalidateAudioParamsCache();
  audioSync.setCurrentMeasure(0);
  audioSync.setIsLoading(false);
}
