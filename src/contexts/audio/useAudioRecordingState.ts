import { useState, useEffect, useCallback } from 'react';
import { startAudioRecording, stopAudioRecording } from './audioRecorderService';

export function useAudioRecordingState() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) interval = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);
    else setRecordingSeconds(0);
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  const handleAudioRecordingToggle = useCallback(async () => {
    if (!isRecording) {
      const ok = await startAudioRecording();
      if (ok) setIsRecording(true);
    } else {
      stopAudioRecording();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, recordingSeconds, handleAudioRecordingToggle };
}
