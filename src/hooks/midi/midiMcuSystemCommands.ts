import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';

export const MCU_ALL_NOTES = [46, 47, 48, 49, 80, 81, 86, 88, 89, 91, 92, 93, 94, 95];

let lastTransportActionTime = 0;

export function handleMcuCommand(
  note: number,
  velocity: number,
  isNoteOn: boolean,
  messageType: number,
  audio: any,
  sequencer: any
): boolean {
  if ((messageType === 0x80 || (isNoteOn && velocity === 0)) && MCU_ALL_NOTES.includes(note)) {
    return true;
  }

  if (isNoteOn && velocity > 0 && MCU_ALL_NOTES.includes(note)) {
    const now = Date.now();
    if (now - lastTransportActionTime < 250) return true;
    lastTransportActionTime = now;

    switch (note) {
      case 48:
        useSequencerStore.getState().shiftMixerBank(-1);
        return true;
      case 49:
        useSequencerStore.getState().shiftMixerBank(1);
        return true;
      case 46:
        useSequencerStore.getState().shiftMixerBank(-8);
        return true;
      case 47:
        useSequencerStore.getState().jumpMixerBank8();
        return true;
      case 80:
        window.dispatchEvent(new CustomEvent('open-save-modal'));
        return true;
      case 81:
        if (typeof useSequencerStore.getState().handleUndo === 'function') {
          useSequencerStore.getState().handleUndo();
        } else if (sequencer && typeof sequencer.handleUndo === 'function') {
          sequencer.handleUndo();
        }
        return true;
      case 88: {
        const cur = useTransportStore.getState().preRollSettings;
        useTransportStore.getState().setPreRollSettings({ enabled: !cur?.enabled });
        return true;
      }
      case 89: {
        const cur = useTransportStore.getState().isMetroOn;
        useTransportStore.getState().setIsMetroOn(!cur);
        return true;
      }
      case 94:
        audio.handleTogglePlay();
        return true;
      case 93:
        audio.handleStop();
        return true;
      case 95: {
        const seq = useSequencerStore.getState();
        if (seq.armedPatternId !== null) {
          seq.togglePatternRecording();
        } else {
          audio.handleAudioRecordingToggle();
        }
        return true;
      }
      case 92: {
        const current = useSequencerStore.getState().currentMeasure;
        const total = useSequencerStore.getState().totalMeasures;
        const nextIdx = (current + 1) % (total || 1);
        audio.handleTimelineNavigate(nextIdx, 0, 16);
        return true;
      }
      case 91: {
        const current = useSequencerStore.getState().currentMeasure;
        const total = useSequencerStore.getState().totalMeasures;
        const prevIdx = (current - 1 + total) % (total || 1);
        audio.handleTimelineNavigate(prevIdx, 0, 16);
        return true;
      }
      case 86:
        if (sequencer && typeof sequencer.setIsLooping === 'function') {
          sequencer.setIsLooping(!sequencer.isLooping);
        }
        return true;
    }
  }
  return false;
}
