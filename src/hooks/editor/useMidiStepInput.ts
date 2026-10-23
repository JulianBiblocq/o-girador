
import { useEffect, useRef } from 'react';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiNoteToName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export interface UseMidiStepInputParams {
  isActive: boolean;
  isVoice: boolean;
  selectedStepIdx: number | null;
  selectedSubIndex: 0 | 1 | null;
  totalSteps?: number;
  isSplitCurrentStep?: boolean;
  onWritePercussion: (stepIdx: number, subIndex: 0 | 1 | null, stroke: string) => void;
  onWriteVoice: (stepIdx: number, noteName: string, velocity: number) => void;
  onAdvance: (nextIdx: number, nextSub: 0 | 1 | null) => void;
  playPercussionPreview?: (stroke: string) => void;
  playVoicePreview?: (noteName: string) => void;
}

export function useMidiStepInput({
  isActive, isVoice, selectedStepIdx, selectedSubIndex, totalSteps = 16,
  isSplitCurrentStep, onWritePercussion, onWriteVoice, onAdvance,
  playPercussionPreview, playVoicePreview,
}: UseMidiStepInputParams) {
  const paramsRef = useRef({
    isActive, isVoice, selectedStepIdx, selectedSubIndex, totalSteps,
    isSplitCurrentStep, onWritePercussion, onWriteVoice, onAdvance,
    playPercussionPreview, playVoicePreview,
  });

  useEffect(() => {
    paramsRef.current = {
      isActive, isVoice, selectedStepIdx, selectedSubIndex, totalSteps,
      isSplitCurrentStep, onWritePercussion, onWriteVoice, onAdvance,
      playPercussionPreview, playVoicePreview,
    };
  });

  useEffect(() => {
    if (!isActive || typeof navigator === 'undefined' || !(navigator as any).requestMIDIAccess) return;

    let midiAccess: any = null;

    const handleMidiMessage = (event: any) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const status = data[0] & 0xf0;
      const noteNumber = data[1];
      const velocity = data[2];

      // Note On with velocity > 0
      if (status === 0x90 && velocity > 0) {
        const p = paramsRef.current;
        if (p.selectedStepIdx === null) return;
        const currentIdx = p.selectedStepIdx;

        if (p.isVoice) {
          const noteName = midiNoteToName(noteNumber);
          p.onWriteVoice(currentIdx, noteName, velocity);
          p.playVoicePreview?.(noteName);
          const nextIdx = (currentIdx + 1) % p.totalSteps;
          p.onAdvance(nextIdx, null);
        } else {
          // Percussion : D/E pour forte (>= 85) ou d/e pour piano (< 85)
          const isLeftHand = noteNumber % 2 === 1;
          const stroke = velocity >= 85 ? (isLeftHand ? 'E' : 'D') : (isLeftHand ? 'e' : 'd');
          p.onWritePercussion(currentIdx, p.selectedSubIndex, stroke);
          p.playPercussionPreview?.(stroke);

          if (p.isSplitCurrentStep && p.selectedSubIndex === 0) {
            p.onAdvance(currentIdx, 1);
          } else {
            const nextIdx = (currentIdx + 1) % p.totalSteps;
            p.onAdvance(nextIdx, null);
          }
        }
      }
    };

    (navigator as any).requestMIDIAccess().then((access: any) => {
      midiAccess = access;
      access.inputs.forEach((input: any) => {
        input.onmidimessage = handleMidiMessage;
      });
      access.onstatechange = (e: any) => {
        const port = e?.port;
        if (port && port.type === 'input' && port.state === 'connected') {
          port.onmidimessage = handleMidiMessage;
        }
      };
    }).catch(() => {
      // MIDI access denied or unavailable in current environment
    });

    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach((input: any) => {
          input.onmidimessage = null;
        });
        midiAccess.onstatechange = null;
      }
    };
  }, [isActive]);
}
