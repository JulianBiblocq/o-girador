import { TransportAction } from '../../stores/useMidiStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

let lastTransportActionTime = 0;

export function handleMidiTransportAction(
  note: number,
  velocity: number,
  isNoteOn: boolean,
  isCC: boolean,
  state: any,
  audio: any,
  sequencer: any
): boolean {
  if (state.waitingForTransportAction && (isNoteOn || isCC)) {
    const action = state.waitingForTransportAction;
    state.addTransportMapping(action, { type: isCC ? 'cc' : 'note', number: note });
    state.setWaitingForTransportAction(null);
    return true;
  }

  let matchedAction: TransportAction | null = null;
  for (const actionKey in state.transportMappings) {
    const mapping = state.transportMappings[actionKey as TransportAction];
    if (mapping && mapping.type === (isCC ? 'cc' : 'note') && mapping.number === note) {
      matchedAction = actionKey as TransportAction;
      break;
    }
  }

  if (matchedAction) {
    if (velocity > 0) {
      const now = Date.now();
      if (now - lastTransportActionTime < 250) return true;
      lastTransportActionTime = now;

      switch (matchedAction) {
        case 'play':
          audio.handleTogglePlay();
          break;
        case 'stop':
          audio.handleStop();
          break;
        case 'record': {
          const seq = useSequencerStore.getState();
          if (seq.armedPatternId !== null) {
            seq.togglePatternRecording();
          } else {
            audio.handleAudioRecordingToggle();
          }
          break;
        }
        case 'loop':
          if (sequencer && typeof sequencer.setIsLooping === 'function') {
            sequencer.setIsLooping(!sequencer.isLooping);
          }
          break;
        case 'nextMeasure': {
          const current = useSequencerStore.getState().currentMeasure;
          const total = useSequencerStore.getState().totalMeasures;
          const nextIdx = (current + 1) % (total || 1);
          audio.handleTimelineNavigate(nextIdx, 0, 16);
          break;
        }
        case 'prevMeasure': {
          const current = useSequencerStore.getState().currentMeasure;
          const total = useSequencerStore.getState().totalMeasures;
          const prevIdx = (current - 1 + total) % (total || 1);
          audio.handleTimelineNavigate(prevIdx, 0, 16);
          break;
        }
      }
    }
    return true;
  }

  return false;
}
