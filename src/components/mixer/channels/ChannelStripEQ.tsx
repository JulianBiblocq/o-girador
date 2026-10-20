import React from 'react';
import { MixerKnob } from '../../MixerKnob';
import { MixerSlantedDivider } from '../../MixerSlantedDivider';
import { eqNodes } from '../../../audio/effectsChain';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { TrackGroup } from '../../../types';

interface ChannelStripEQProps {
  track: TrackGroup;
  lang: string;
}

export const ChannelStripEQ: React.FC<ChannelStripEQProps> = ({ track, lang }) => {
  const trackId = track.id;
  const lowCut = track.lowCut ?? false;
  const eq = track.eqBands ?? {
    low: { f: 100, g: 0 },
    mid: { f: 1000, g: 0, q: 'wide' },
    high: { f: 8000, g: 0 },
  };

  const isEQModified = eq.low.g !== 0 || eq.low.f !== 100 ||
                      eq.mid.g !== 0 || eq.mid.f !== 1000 ||
                      eq.high.g !== 0 || eq.high.f !== 8000;

  const handleLowCutToggle = () => useSequencerStore.getState().handleTrackLowCutToggle(trackId);
  const handleEQChange = (bands: Partial<typeof eq>) => useSequencerStore.getState().handleTrackEQChange(trackId, bands);
  const handleEQReset = () => { if (isEQModified) useSequencerStore.getState().handleTrackEQReset(trackId); };

  const handleHFAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.high) eqNodes[trackId].high.frequency.value = val; } catch (_) {} };
  const handleHGAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.high) eqNodes[trackId].high.gain.value = val; } catch (_) {} };
  const handleMFAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.mid) eqNodes[trackId].mid.frequency.value = val; } catch (_) {} };
  const handleMGAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.mid) eqNodes[trackId].mid.gain.value = val; } catch (_) {} };
  const handleLFAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.low) eqNodes[trackId].low.frequency.value = val; } catch (_) {} };
  const handleLGAudioDrag = (val: number) => { try { if (eqNodes[trackId]?.low) eqNodes[trackId].low.gain.value = val; } catch (_) {} };

  return (
    <div className="w-full flex flex-col shrink-0">
      <div className="w-full flex flex-col gap-1 shrink px-0.5">
        <div className="flex justify-end w-full">
          <button
            onClick={handleEQReset}
            className={`w-5 h-5 flex items-center justify-center cordel-border-sm transition-colors rounded-sm cursor-pointer ${
              isEQModified ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/30 border-[var(--cordel-border)]/20 cursor-default opacity-55'
            }`}
            title={lang === 'fr' ? "Réinitialiser l'égaliseur" : 'Redefinir equalizador'}
            disabled={!isEQModified}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" /></svg>
          </button>
        </div>

        <div className="flex justify-between w-full items-start">
          <MixerKnob label="HF" min={4000} max={16000} step={100} value={eq.high.f} defaultValue={8000} unit="Hz" size={30} color="#3d8b85" onChange={(v) => handleEQChange({ high: { f: v, g: eq.high.g } })} onAudioDrag={handleHFAudioDrag} />
          <div className="pt-2"><MixerKnob label="HG" min={-15} max={15} step={1} value={eq.high.g} defaultValue={0} unit="dB" size={30} isGain={true} onChange={(v) => handleEQChange({ high: { f: eq.high.f, g: v } })} onAudioDrag={handleHGAudioDrag} /></div>
        </div>

        <MixerSlantedDivider />

        <div className="flex justify-between w-full items-start">
          <div className="flex flex-col items-center gap-1.5">
            <MixerKnob label="MF" min={250} max={4000} step={50} value={eq.mid.f} defaultValue={1000} unit="Hz" size={30} color="#d4af37" onChange={(v) => handleEQChange({ mid: { f: v, g: eq.mid.g, q: eq.mid.q } })} onAudioDrag={handleMFAudioDrag} />
            <div className="flex flex-col items-center">
              <button onClick={() => handleEQChange({ mid: { ...eq.mid, q: eq.mid.q === 'narrow' ? 'wide' : 'narrow' } })} className={`w-6 h-3.5 text-[7px] font-black cordel-border-sm flex items-center justify-center rounded-sm ${eq.mid.q === 'narrow' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`}>{eq.mid.q === 'narrow' ? 'N' : 'W'}</button>
              <span className="text-[5.5px] font-black opacity-40 uppercase tracking-wide mt-0.5">Q</span>
            </div>
          </div>
          <div className="pt-2"><MixerKnob label="MG" min={-15} max={15} step={1} value={eq.mid.g} defaultValue={0} unit="dB" size={30} isGain={true} onChange={(v) => handleEQChange({ mid: { f: eq.mid.f, g: v, q: eq.mid.q } })} onAudioDrag={handleMGAudioDrag} /></div>
        </div>

        <MixerSlantedDivider />

        <div className="flex justify-between w-full items-start">
          <MixerKnob label="LF" min={50} max={250} step={5} value={eq.low.f} defaultValue={100} unit="Hz" size={30} color="#8b2a1a" onChange={(v) => handleEQChange({ low: { f: v, g: eq.low.g } })} onAudioDrag={handleLFAudioDrag} />
          <div className="pt-2"><MixerKnob label="LG" min={-15} max={15} step={1} value={eq.low.g} defaultValue={0} unit="dB" size={30} isGain={true} onChange={(v) => handleEQChange({ low: { f: eq.low.f, g: v } })} onAudioDrag={handleLGAudioDrag} /></div>
        </div>

        <MixerSlantedDivider />

        <div className="flex justify-between w-full items-center">
          <button onClick={handleLowCutToggle} className={`w-6 h-6 cordel-border-sm flex items-center justify-center p-0.5 rounded-sm cursor-pointer ${lowCut ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`} title="Low Cut 80Hz">
            <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-95 pointer-events-none"><path d="M 2 14 L 10 3 L 22 3" /></svg>
          </button>
          <span className="text-[6.5px] font-black opacity-35 uppercase tracking-widest pr-2 select-none">80Hz</span>
        </div>
      </div>
    </div>
  );
};
