import React from 'react';
import { i18n } from '../../data';
import { MixerHeader } from '../mixer/MixerHeader';
import { RodaCentralTopBar } from '../roda/RodaCentralTopBar';

interface DawRulerHeaderProps {
  defaultBeats?: number;
  lang: string;
}

export const DawRulerHeader: React.FC<DawRulerHeaderProps> = ({ lang }) => {
  const t = (key: string) => (i18n[lang as 'pt' | 'fr'] as any)?.[key] || key;

  return (
    <div className="flex items-center w-full shrink-0 border-b border-[var(--cordel-border,#333)] pb-2.5 mb-4 select-none justify-start relative z-30">
      <div className="w-[360px] min-w-[360px] max-w-[360px] shrink-0">
        <MixerHeader t={t} noBorder={true} className="w-[360px] min-w-[360px] max-w-[360px]" />
      </div>

      <div className="flex-grow pl-4 flex items-center justify-between">
        <RodaCentralTopBar className="w-full" />
      </div>
    </div>
  );
};
