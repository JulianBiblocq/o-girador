import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MasterMonoCheckButton } from './MasterMonoCheckButton';
import { STUDIO_COMPRESSOR_PRESETS } from '../../audio/effects/studioFxPresets';

interface MasterPresetAndMonoBarProps {
  lang: string;
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
}

const MACRO_FX_PRESETS = [
  {
    id: 'studio_natural',
    labelFr: 'Studio Bois & Colle',
    labelPt: 'Estúdio Madeira & Cola',
    reverb: 'studio_bois',
    saturation: 'warm_triode',
    compressor: 'natural_glue',
  },
  {
    id: 'cortejo_street',
    labelFr: 'Cortège de Rue',
    labelPt: 'Cortejo de Rua',
    reverb: 'parvis_recife',
    saturation: 'caixa_bite',
    compressor: 'street_punch',
  },
  {
    id: 'hall_dense',
    labelFr: 'Grande Halle Dense',
    labelPt: 'Grande Salão Denso',
    reverb: 'grande_halle',
    saturation: 'baque_grit',
    compressor: 'parallel_smash',
  },
] as const;

export const MasterPresetAndMonoBar: React.FC<MasterPresetAndMonoBarProps> = ({
  lang,
  onMasterCompressorChange,
}) => {
  const isMasterMono = useSequencerStore(s => s.isMasterMono);
  const toggleMasterMono = useSequencerStore(s => s.toggleMasterMono);
  const applyStudioFxPreset = useSequencerStore(s => s.applyStudioFxPreset);
  const [selectedMacro, setSelectedMacro] = useState<string>('');

  const handleSelectMacro = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedMacro(id);
    const macro = MACRO_FX_PRESETS.find(m => m.id === id);
    if (!macro) return;

    applyStudioFxPreset('reverb', macro.reverb);
    applyStudioFxPreset('saturation', macro.saturation);
    applyStudioFxPreset('compressor', macro.compressor);

    const compPreset = STUDIO_COMPRESSOR_PRESETS.find(p => p.id === macro.compressor);
    if (compPreset) {
      onMasterCompressorChange({
        threshold: compPreset.settings.threshold,
        ratio: compPreset.settings.ratio,
      });
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 w-full pt-0.5 shrink-0">
      <select
        data-testid="master-fx-preset-select"
        value={selectedMacro}
        onChange={handleSelectMacro}
        aria-label="Preset FX"
        className="flex-1 min-w-0 py-1 px-1.5 font-cactus font-bold text-[9.5px] uppercase tracking-wider bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] rounded-[2px] cursor-pointer outline-none truncate"
      >
        <option value="" disabled>
          {lang === 'fr' ? 'PRESET FX ▾' : 'PRESET FX ▾'}
        </option>
        {MACRO_FX_PRESETS.map(p => (
          <option key={p.id} value={p.id}>
            {lang === 'fr' ? p.labelFr : p.labelPt}
          </option>
        ))}
      </select>

      <MasterMonoCheckButton
        isMasterMono={isMasterMono}
        onToggle={toggleMasterMono}
        lang={lang}
      />
    </div>
  );
};

