import { TimeSignature } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { i18n } from '../../data';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';

export async function handleTimeSigChange(
  selectValue: TimeSignature,
  sequencer: any,
  audioSync: any
): Promise<void> {
  const t = (key: string) => (i18n[sequencer.lang as keyof typeof i18n] as any)?.[key] || key;
  const shouldResize = await sequencer.confirmAsync(t('confirmResize'));
  if (!shouldResize) return;

  sequencer.pushUndoState();
  sequencer.setTimeSig(selectValue);
  audioSync.currentStepIndexRef.current = -1;
  audioSync.setCurrentMeasure(0);

  const geom = getRodaMeasureGeometry(selectValue);
  const targetSteps = geom.defaultSteps;
  const targetBeatRes = Array(geom.beatsCount).fill(geom.defaultSubdivisions);

  const tracks = useSequencerStore.getState().tracks;
  const resizedList = tracks.map((tr) => {
    const nextPatterns = tr.patterns.map((p) => {
      const nextStepsArr = Array(targetSteps).fill(0);
      const nextLyrics = Array(targetSteps).fill('');
      const nextNotes = Array(targetSteps).fill('');
      const nextVols = Array(targetSteps).fill(80);
      const nextDecays = Array(targetSteps).fill(100);

      for (let idx = 0; idx < Math.min(targetSteps, p.steps); idx++) {
        nextStepsArr[idx] = p.activeSteps[idx];
        nextLyrics[idx] = p.lyrics?.[idx] || '';
        nextNotes[idx] = p.notes?.[idx] || '';
        if (p.volumes && p.volumes[idx] !== undefined) nextVols[idx] = p.volumes[idx];
        if (p.decays && p.decays[idx] !== undefined) nextDecays[idx] = p.decays[idx];
      }

      return {
        ...p,
        steps: targetSteps,
        timeSignature: geom.timeSig,
        beatResolutions: [...targetBeatRes],
        activeSteps: nextStepsArr,
        lyrics: nextLyrics,
        notes: nextNotes,
        volumes: nextVols,
        decays: nextDecays,
        microtimings: Array(targetSteps).fill(0),
      };
    });
    return { ...tr, patterns: nextPatterns };
  });

  useSequencerStore.getState().setTracks(resizedList);
}
