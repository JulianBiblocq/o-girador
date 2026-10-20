import { useState, useEffect } from 'react';

export function useAudioEffectsState() {
  const [masterVol, setMasterVol] = useState<number>(0);
  const [masterEQ, setMasterEQ] = useState<{ low: number; mid: number; high: number }>({ low: 0, mid: 0, high: 0 });
  const [masterCompressor, setMasterCompressor] = useState<{ threshold: number; ratio: number }>({ threshold: -20, ratio: 4 });
  const [reverbDecay, setReverbDecay] = useState<number>(() => {
    const saved = localStorage.getItem('oGirador_reverb_decay');
    return saved ? parseFloat(saved) : 2.5;
  });
  const [masterReverbVol, setMasterReverbVol] = useState<number>(() => {
    const saved = localStorage.getItem('oGirador_master_reverb_vol');
    return saved ? parseFloat(saved) : 0;
  });
  const [activeKeyboardInstrumentId, setActiveKeyboardInstrumentId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('oGirador_reverb_decay', reverbDecay.toString()); }, [reverbDecay]);
  useEffect(() => { localStorage.setItem('oGirador_master_reverb_vol', masterReverbVol.toString()); }, [masterReverbVol]);

  return {
    masterVol, setMasterVol,
    masterEQ, setMasterEQ,
    masterCompressor, setMasterCompressor,
    reverbDecay, setReverbDecay,
    masterReverbVol, setMasterReverbVol,
    activeKeyboardInstrumentId, setActiveKeyboardInstrumentId
  };
}
