/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calibrage visuel Bip & Flash à 60 FPS sans render thrashing (< 130 lignes).
 */
import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';

export const BluetoothVisualCalibration: React.FC<{ lang: 'fr' | 'pt'; onDone: () => void }> = ({ lang, onDone }) => {
  const t = btTranslations[lang];
  const { bluetoothVisualOffsetMs, setBluetoothVisualOffsetMs, activeProfileId, updateProfile, profiles } = useBluetoothLatencyStore();
  const [sliderVal, setSliderVal] = useState(bluetoothVisualOffsetMs);
  const [profileName, setProfileName] = useState(profiles.find((p) => p.id === activeProfileId)?.name || t.defaultProfileBtHeadphones);

  const targetBoxRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(sliderVal);
  offsetRef.current = sliderVal;

  useEffect(() => {
    let isCancelled = false, timerId: any = null;
    const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;

    const playBeepAndFlash = () => {
      if (isCancelled) return;
      const now = rawCtx.currentTime, beepTime = now + 0.05;
      const osc = rawCtx.createOscillator(), gain = rawCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(1000, beepTime);
      gain.gain.setValueAtTime(0, beepTime);
      gain.gain.linearRampToValueAtTime(0.7, beepTime + 0.003);
      gain.gain.linearRampToValueAtTime(0, beepTime + 0.03);
      osc.connect(gain); gain.connect(rawCtx.destination);
      osc.start(beepTime); osc.stop(beepTime + 0.035);

      const flashDelayMs = (beepTime - now) * 1000 + offsetRef.current;
      setTimeout(() => {
        if (!isCancelled && targetBoxRef.current) {
          targetBoxRef.current.animate(
            [{ opacity: 1, transform: 'scale(1.25)', backgroundColor: '#b94a2c' }, { opacity: 0.2, transform: 'scale(1)', backgroundColor: 'transparent' }],
            { duration: 160, easing: 'ease-out' }
          );
        }
      }, Math.max(0, flashDelayMs));
      timerId = setTimeout(playBeepAndFlash, 666);
    };

    playBeepAndFlash();
    return () => { isCancelled = true; if (timerId) clearTimeout(timerId); };
  }, []);

  const handleSave = () => {
    setBluetoothVisualOffsetMs(sliderVal);
    updateProfile(activeProfileId, { name: profileName, offsetMs: sliderVal });
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 text-center select-none">
      <p className="text-xs text-[var(--cordel-text)] opacity-80 leading-snug">{t.visualDesc}</p>
      <div className="flex justify-center items-center py-2">
        <div className="relative w-24 h-24 border-4 border-[var(--cordel-border)] flex items-center justify-center bg-[var(--cordel-surface)]">
          <div ref={targetBoxRef} className="w-14 h-14 border-4 border-[#b94a2c] opacity-20 transition-transform" />
          <div className="absolute inset-x-0 h-0.5 bg-[var(--cordel-border)] opacity-30" />
          <div className="absolute inset-y-0 w-0.5 bg-[var(--cordel-border)] opacity-30" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 px-2">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span>0 ms</span>
          <span className="text-base text-[#b94a2c] font-black">{sliderVal} ms</span>
          <span>600 ms</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSliderVal((v) => Math.max(0, v - 10))} className="w-8 h-8 border-2 border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-bold text-sm">-</button>
          <input type="range" min={0} max={600} step={5} value={sliderVal} onChange={(e) => setSliderVal(parseInt(e.target.value, 10))} className="flex-1 accent-[#b94a2c] cursor-pointer h-3" />
          <button type="button" onClick={() => setSliderVal((v) => Math.min(600, v + 10))} className="w-8 h-8 border-2 border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-bold text-sm">+</button>
        </div>
      </div>
      <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t.profileNamePrompt} className="w-full h-8 px-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-xs font-mono" />
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onDone} className="flex-1 h-9 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase">{t.btnCancel}</button>
        <button type="button" onClick={handleSave} className="flex-1 h-9 border-2 border-black bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0_#000] active:translate-y-0.5">{t.btnSaveProfile}</button>
      </div>
    </div>
  );
};
