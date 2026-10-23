/**
 * Outil de calibrage par 3 bips acoustiques (< 135 lignes).
 */
import React, { useState, useEffect } from 'react';
import { runAcousticPingCalibration } from '../../audio/btAcousticPing';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';

interface Props {
  lang: 'fr' | 'pt';
  onDone: () => void;
}

export const BluetoothPingCalibration: React.FC<Props> = ({ lang, onDone }) => {
  const t = btTranslations[lang];
  const { setBluetoothVisualOffsetMs, activeProfileId, updateProfile, profiles } = useBluetoothLatencyStore();

  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [stepText, setStepText] = useState(t.pingStarting);
  const [measuredMs, setMeasuredMs] = useState(240);
  const [profileName, setProfileName] = useState(
    profiles.find((p) => p.id === activeProfileId)?.name || t.defaultProfileBtSpeaker
  );

  const startPing = async () => {
    setStatus('running');
    setStepText(t.pingStarting);

    const res = await runAcousticPingCalibration((cur, tot) => {
      setStepText(t.pingBeepCount(cur));
    });

    if (res.success) {
      setMeasuredMs(res.offsetMs);
      setStatus('success');
    } else {
      setStatus('failed');
    }
  };

  useEffect(() => {
    startPing();
  }, []);

  const handleSave = () => {
    setBluetoothVisualOffsetMs(measuredMs);
    updateProfile(activeProfileId, { name: profileName, offsetMs: measuredMs });
    onDone();
  };

  return (
    <div className="flex flex-col gap-4 text-center select-none">
      <p className="text-xs text-[var(--cordel-text)] opacity-80 leading-snug">{t.pingDesc}</p>

      <div className="min-h-[110px] border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col items-center justify-center p-3 gap-2">
        {status === 'running' && (
          <>
            <div className="w-8 h-8 border-4 border-[#b94a2c] border-t-transparent animate-spin" />
            <span className="text-sm font-cactus font-bold tracking-wider">{stepText}</span>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="text-2xl font-black text-[#2a9d8f] font-mono">{measuredMs} ms</span>
            <span className="text-xs font-cactus font-bold text-[#2a9d8f]">{t.pingSuccess(measuredMs)}</span>
          </>
        )}

        {status === 'failed' && (
          <>
            <span className="text-xs text-[#b94a2c] font-bold">{t.pingFailed}</span>
            <button
              type="button"
              onClick={startPing}
              className="mt-1 h-7 px-3 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-cactus font-bold text-xs uppercase"
            >
              {t.pingRetry}
            </button>
          </>
        )}
      </div>

      {status === 'success' && (
        <input
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder={t.profileNamePrompt}
          className="w-full h-8 px-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-xs font-mono"
        />
      )}

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 h-9 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase"
        >
          {t.btnCancel}
        </button>
        {status === 'success' && (
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-9 border-2 border-black bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0_#000] active:translate-y-0.5"
          >
            {t.btnSaveProfile}
          </button>
        )}
      </div>
    </div>
  );
};
