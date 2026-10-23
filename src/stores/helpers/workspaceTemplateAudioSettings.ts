import { WorkspaceTemplate } from '../../types';

export const applyWorkspaceTemplateAudioSettings = (
  template: WorkspaceTemplate,
  audio?: {
    setMasterEQ?: (eq: { low: number; mid: number; high: number }) => void;
    setMasterCompressor?: (comp: { threshold: number; ratio: number }) => void;
    setMasterVol?: (vol: number) => void;
    setReverbDecay?: (decay: number) => void;
    setMasterReverbVol?: (vol: number) => void;
  }
) => {
  if (!template.masterSettings || !audio) return;
  const { options, masterSettings } = template;
  if (options.includeEQ && masterSettings.masterEQ && audio.setMasterEQ) {
    audio.setMasterEQ(masterSettings.masterEQ);
  }
  if (options.includeStructure && masterSettings.masterCompressor && audio.setMasterCompressor) {
    audio.setMasterCompressor(masterSettings.masterCompressor);
  }
  if (options.includeVolumePan && masterSettings.masterVol !== undefined && audio.setMasterVol) {
    audio.setMasterVol(masterSettings.masterVol);
  }
  if (options.includeFX) {
    if (masterSettings.reverbDecay !== undefined && audio.setReverbDecay) {
      audio.setReverbDecay(masterSettings.reverbDecay);
    }
    if (masterSettings.masterReverbVol !== undefined && audio.setMasterReverbVol) {
      audio.setMasterReverbVol(masterSettings.masterReverbVol);
    }
  }
};
