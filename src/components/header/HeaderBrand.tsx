import React from 'react';

interface HeaderBrandProps {
  version?: string | number;
  isMobile?: boolean;
}

export const HeaderBrand: React.FC<HeaderBrandProps> = ({ version, isMobile }) => {
  if (isMobile) {
    return (
      <div className="header-mobile-brand flex flex-col items-end select-none cursor-default shrink-0 whitespace-nowrap">
        <span
          id="header-title-text-mobile"
          className="font-cactus text-[var(--cordel-text)] text-base font-bold tracking-wide uppercase whitespace-nowrap leading-none mt-1 lino-distressed"
        >
          O Girador
        </span>
        <span className="cordel-stamp-red-sm font-cactus font-bold text-[7.5px] uppercase px-1.5 py-0.5 mt-0.5 leading-tight select-none whitespace-nowrap">
          <span className="lino-distressed translate-x-[0.08em] whitespace-nowrap">Sequenciador</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start select-none cursor-default shrink-0">
      <div className="flex flex-col items-end leading-none shrink-0 cursor-default select-none">
        <span
          id="header-title-text"
          className="font-cactus text-[var(--cordel-text)] text-2xl lg:text-3xl font-medium tracking-widest uppercase leading-none lino-distressed"
        >
          O Girador
        </span>
        <span className="cordel-stamp-red-sm font-cactus font-bold text-[9px] uppercase px-1.5 py-0.5 mt-[-2px] leading-tight select-none self-end">
          <span className="lino-distressed translate-x-[0.08em]">Sequenciador</span>
        </span>
      </div>
      {version && <span className="text-xs lowercase opacity-50 ml-1 font-sans pt-0.5">v{version}</span>}
    </div>
  );
};
