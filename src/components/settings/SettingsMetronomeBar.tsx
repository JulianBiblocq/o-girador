/**
 * SettingsMetronomeBar.tsx — Bandeau Métronome Studio en tête de l'onglet « Kit & Métronome »
 * avec pilotage linéaire sans clic ni valeur infinie via applyChannelVolumeLinear (< 125 lignes).
 */
import React, { useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX, Eye, RotateCcw } from 'lucide-react';
import { useTransportStore } from '../../stores/useTransportStore';
import { metroChannel } from '../../audio/effectsChain';
import { applyChannelVolumeLinear } from '../../utils/audio/channelFaderLinearRamp';
import { CUTOFF_FADER_POSITION, UNITY_GAIN_FADER_POSITION, faderPositionToDb } from '../../utils/audio-math/faderMath';

export interface SettingsMetronomeBarProps {
  lang: string;
}

export const SettingsMetronomeBar: React.FC<SettingsMetronomeBarProps> = React.memo(({ lang }) => {
  const isFr = lang === 'fr';
  const isMetroOn = useTransportStore((s) => s.isMetroOn);
  const setIsMetroOn = useTransportStore((s) => s.setIsMetroOn);
  const isVisualMetronomeActive = useTransportStore((s) => s.isVisualMetronomeActive);
  const toggleVisualMetronome = useTransportStore((s) => s.toggleVisualMetronome);
  const metroVolume = useTransportStore((s) => s.metroVolume);
  const setMetroVolume = useTransportStore((s) => s.setMetroVolume);
  const metroSound = useTransportStore((s) => s.metroSound);
  const setMetroSound = useTransportStore((s) => s.setMetroSound);

  const safeVol = metroVolume ?? 80;

  const syncMetroChannelLinear = useCallback((faderVal: number, enabled: boolean) => {
    const clamped = Math.max(0, Math.min(100, faderVal));
    const db = faderPositionToDb(clamped);
    const linearGain = !enabled || clamped <= CUTOFF_FADER_POSITION || !Number.isFinite(db) ? 0 : Tone.dbToGain(db);
    void linearGain;
    if (metroChannel) {
      metroChannel.mute = !enabled;
      applyChannelVolumeLinear(metroChannel, clamped, 0, !enabled);
    }
  }, []);

  useEffect(() => {
    syncMetroChannelLinear(safeVol, isMetroOn);
  }, [safeVol, isMetroOn, syncMetroChannelLinear]);

  const handleToggleMetro = () => {
    const next = !isMetroOn;
    setIsMetroOn(next);
    syncMetroChannelLinear(safeVol, next);
  };

  const handleVolumeChange = (nextVal: number) => {
    const clamped = Math.max(0, Math.min(100, nextVal));
    setMetroVolume(clamped);
    syncMetroChannelLinear(clamped, isMetroOn);
  };

  const currentDb = faderPositionToDb(safeVol);
  const dbLabel = safeVol <= CUTOFF_FADER_POSITION || !Number.isFinite(currentDb)
    ? (isFr ? 'Silencieux (0%)' : 'Mudo (0%)')
    : `${currentDb >= 0 ? '+' : ''}${currentDb.toFixed(1)} dB (${safeVol}%)`;

  const toggleBtnBase = 'px-2.5 py-1.5 font-cactus font-bold uppercase text-[10px] border-2 border-[var(--cordel-border-strong)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)]';
  const activeStyle = 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]';
  const idleStyle = 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]';

  return (
    <div data-testid="settings-metronome-bar" className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3.5 flex flex-col gap-3 shadow-[3px_3px_0px_var(--cordel-shadow-color)] text-[var(--cordel-text)] select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cordel-border)] pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-cactus font-bold uppercase text-xs md:text-sm text-[var(--cordel-accent-readable)] mr-1">
            {isFr ? 'Métronome Studio' : 'Metrônomo Estúdio'}
          </h3>
          <button type="button" data-testid="settings-metro-toggle" onClick={handleToggleMetro} className={`${toggleBtnBase} ${isMetroOn ? activeStyle : idleStyle}`}>
            {isMetroOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{isMetroOn ? (isFr ? 'Clic : Actif' : 'Clique : Ativo') : (isFr ? 'Clic : Coupé' : 'Clique : Mudo')}</span>
          </button>
          <button type="button" data-testid="settings-metro-visual-toggle" onClick={toggleVisualMetronome} className={`${toggleBtnBase} ${isVisualMetronomeActive ? activeStyle : idleStyle}`}>
            <Eye size={13} />
            <span>{isFr ? 'Flash Visuel' : 'Flash Visual'}</span>
          </button>
        </div>

        <label className="flex items-center gap-2 text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Timbre :' : 'Som :'}</span>
          <select
            data-testid="settings-metro-sound" value={metroSound}
            onChange={(e) => setMetroSound(e.target.value as 'synth' | 'clave' | 'cowbell')}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] px-2 py-1 font-cactus font-bold text-xs uppercase outline-none cursor-pointer"
          >
            <option value="synth">Synth</option>
            <option value="clave">Clave</option>
            <option value="cowbell">Cowbell</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase">
          <span>{isFr ? 'Niveau Fader Linéaire :' : 'Nível Fader Linear :'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{dbLabel}</span>
            {safeVol !== UNITY_GAIN_FADER_POSITION && (
              <button
                type="button" onClick={() => handleVolumeChange(UNITY_GAIN_FADER_POSITION)}
                title={isFr ? 'Réinitialiser à 0.0 dB (75%)' : 'Redefinir para 0.0 dB (75%)'}
                className="p-0.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] cursor-pointer transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        <input
          type="range" min={0} max={100} step={1} value={safeVol} data-testid="settings-metro-volume"
          onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
          className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
        />
      </div>
    </div>
  );
});

SettingsMetronomeBar.displayName = 'SettingsMetronomeBar';
