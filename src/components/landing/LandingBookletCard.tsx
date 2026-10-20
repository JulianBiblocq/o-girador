import React from 'react';
import { ClothespinSvg } from './LandingCordelIcons';
import { LandingBookletOral } from './LandingBookletOral';
import { LandingBookletSequenciador } from './LandingBookletSequenciador';
import { LandingBookletOrganizador } from './LandingBookletOrganizador';
import { LandingBookletOrquestrador } from './LandingBookletOrquestrador';

interface LandingBookletCardProps {
  id: 1 | 2 | 3 | 4;
  customClass?: string;
  isFr: boolean;
}

export const LandingBookletCard: React.FC<LandingBookletCardProps> = ({
  id,
  customClass = '',
  isFr,
}) => {
  return (
    <article className={`flex flex-col relative z-20 group ${customClass}`}>
      <div className={`cordel-booklet cordel-booklet-${id} flex-1 flex flex-col relative`}>
        <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <ClothespinSvg />
        </div>
        <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
          {id === 1 && <LandingBookletOral isFr={isFr} />}
          {id === 2 && <LandingBookletSequenciador isFr={isFr} />}
          {id === 3 && <LandingBookletOrganizador isFr={isFr} />}
          {id === 4 && <LandingBookletOrquestrador isFr={isFr} />}
        </div>
      </div>
    </article>
  );
};
