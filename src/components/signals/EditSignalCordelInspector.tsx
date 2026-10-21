import React, { useState } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { CordelOptions } from '../../utils/cordelEffect';
import { MobileSignalLightAccordion } from '../mobile/editor/MobileSignalLightAccordion';
import { MobileSignalFramingAccordion } from '../mobile/editor/MobileSignalFramingAccordion';

interface EditSignalCordelInspectorProps {
  options: CordelOptions;
  lang: 'fr' | 'pt';
  onOptionsChange: (patch: Partial<CordelOptions>) => void;
  onReset: () => void;
}

export const EditSignalCordelInspector: React.FC<EditSignalCordelInspectorProps> = ({
  options,
  lang,
  onOptionsChange,
  onReset,
}) => {
  const [openSection, setOpenSection] = useState<'light' | 'framing' | null>('light');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center pb-0.5">
        <span className="font-cactus font-bold uppercase text-xs text-[var(--cordel-wood)] flex items-center gap-1.5">
          <Sliders size={13} />
          <span>{lang === 'fr' ? 'Réglages de gravure Cordel' : 'Configurações de gravura Cordel'}</span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] font-cactus font-bold uppercase hover:text-[var(--cordel-wood)] cursor-pointer flex items-center gap-1 opacity-75 hover:opacity-100"
        >
          <RotateCcw size={10} />
          <span>{lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <MobileSignalLightAccordion
          isOpen={openSection === 'light'}
          onToggle={() => setOpenSection((p) => (p === 'light' ? null : 'light'))}
          options={options}
          onUpdate={onOptionsChange}
          lang={lang}
        />
        <MobileSignalFramingAccordion
          isOpen={openSection === 'framing'}
          onToggle={() => setOpenSection((p) => (p === 'framing' ? null : 'framing'))}
          options={options}
          onUpdate={onOptionsChange}
          lang={lang}
        />
      </div>
    </div>
  );
};

