
import React from 'react';

export interface HeaderBalancoControlProps {
  targetBalancoTrack: any;
  effectiveEditTrackId: number;
  balancoPresets: Array<{ id: string; name: string }>;
  handleTrackBalancoChange: (trackId: number, presetId: string, amount: number) => void;
  lang: string;
}

export const HeaderBalancoControl: React.FC<HeaderBalancoControlProps> = React.memo(({
  targetBalancoTrack,
  effectiveEditTrackId,
  balancoPresets,
  handleTrackBalancoChange,
  lang,
}) => {
  if (!targetBalancoTrack) return null;

  const currentAmount = targetBalancoTrack.balancoAmount !== undefined
    ? targetBalancoTrack.balancoAmount
    : (targetBalancoTrack.swingIntensity !== undefined ? targetBalancoTrack.swingIntensity : 100);

  return (
    <div className="flex items-center gap-2.5 bg-[#f4ecd8] px-3 py-1 rounded border-[2px] border-[#1a1a1a] text-xs font-bold select-none text-[#1a1a1a] shadow-[2px_2px_0px_0px_#1a1a1a] shrink-0 flex-shrink-0">
      <span className="whitespace-nowrap flex items-center text-sm" title={lang === 'fr' ? 'Balanço (Instrument)' : 'Balanço (Instrument)'}>
        
      </span>
      <select
        data-testid="track-balanco-preset-select"
        value={targetBalancoTrack.balancoPresetId || 'maracatu-trad'}
        onChange={(e) => {
          handleTrackBalancoChange(effectiveEditTrackId, e.target.value, currentAmount);
        }}
        className="bg-white border border-[#1a1a1a] px-1.5 py-0.5 text-[11px] font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer max-w-[130px] truncate"
        title={lang === 'fr' ? "Preset de Balanço par défaut de l'instrument" : "Preset de Balanço padrão do instrumento"}
      >
        {balancoPresets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        data-testid="track-balanco-slider"
        type="range"
        min="0"
        max="100"
        value={currentAmount}
        onChange={(e) => {
          handleTrackBalancoChange(effectiveEditTrackId, targetBalancoTrack.balancoPresetId || 'maracatu-trad', Number(e.target.value));
        }}
        className="w-20 h-2 bg-[#1a1a1a]/20 rounded-full appearance-none cursor-pointer outline-none"
        style={{ accentColor: '#8b2a1a' }}
        title={lang === 'fr' ? "Dosage du balanço pour l'instrument" : "Dosagem do balanço para o instrumento"}
      />
      <span data-testid="track-balanco-amount-label" className="w-8 text-right font-cactus text-sm">
        {currentAmount}%
      </span>
    </div>
  );
});

HeaderBalancoControl.displayName = 'HeaderBalancoControl';
