import React, { useState, useEffect, startTransition } from 'react';
import * as Tone from 'tone';
import { channels, reverbSends, masterVolumeNode, masterEQNode, masterCompressorNode, metroChannel, masterReverbVolumeNode } from '../hooks/useAudioSync';

interface AudioFaderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (val: number) => void;
  audioTarget?: 'trackVolume' | 'trackPan' | 'trackReverb' | 'masterVolume' | 'metroVolume' | 'eqLow' | 'eqMid' | 'eqHigh' | 'compThreshold' | 'compRatio' | 'masterReverbVol';
  trackId?: number;
}

export const AudioFader: React.FC<AudioFaderProps> = ({ value, onChange, audioTarget, trackId, ...props }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalVal(val);

    // Direct Tone.js smoothing without hitting the global store
    if (audioTarget === 'trackVolume' && trackId !== undefined && channels[trackId]) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : Tone.gainToDb(gain);
      channels[trackId].volume.rampTo(db, 0.05);
    } else if (audioTarget === 'trackPan' && trackId !== undefined && channels[trackId]) {
      channels[trackId].pan.rampTo(val / 100, 0.05);
    } else if (audioTarget === 'trackReverb' && trackId !== undefined && reverbSends[trackId]) {
      const gain = Math.max(0.00001, val / 100);
      // reverbSends is a Tone.Gain node that we send audio to, its value is 0-1
      reverbSends[trackId].gain.rampTo(val === 0 ? 0 : Tone.dbToGain(Tone.gainToDb(gain)), 0.05);
    } else if (audioTarget === 'masterVolume' && masterVolumeNode) {
      masterVolumeNode.gain.rampTo(Tone.dbToGain(val === -40 ? -Infinity : val), 0.05);
    } else if (audioTarget === 'metroVolume' && metroChannel) {
      const gain = Math.max(0.00001, val / 100);
      metroChannel.volume.rampTo(val === 0 ? -Infinity : Tone.gainToDb(gain), 0.05);
    } else if (audioTarget === 'eqLow' && masterEQNode) {
      masterEQNode.low.rampTo(val, 0.05);
    } else if (audioTarget === 'eqMid' && masterEQNode) {
      masterEQNode.mid.rampTo(val, 0.05);
    } else if (audioTarget === 'eqHigh' && masterEQNode) {
      masterEQNode.high.rampTo(val, 0.05);
    } else if (audioTarget === 'compThreshold' && masterCompressorNode) {
      masterCompressorNode.threshold.rampTo(val, 0.05);
    } else if (audioTarget === 'compRatio' && masterCompressorNode) {
      masterCompressorNode.ratio.rampTo(val, 0.05);
    } else if (audioTarget === 'masterReverbVol' && masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(Tone.dbToGain(val === -40 ? -Infinity : val), 0.05);
    }
  };

  const handleCommit = () => {
    if (localVal !== value) {
      startTransition(() => {
        onChange(localVal);
      });
    }
  };

  return (
    <input
      type="range"
      value={localVal}
      onChange={handleDrag}
      onMouseUp={handleCommit}
      onTouchEnd={handleCommit}
      {...props}
    />
  );
};
