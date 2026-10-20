import React from 'react';
import { CordelWoodenPostSvg, CordelCatenaryRopeSvg } from './LandingWoodenStructures';
import { LandingBookletCard } from './LandingBookletCard';

interface LandingVaralSectionProps {
  isFr: boolean;
}

export const LandingVaralSection: React.FC<LandingVaralSectionProps> = ({ isFr }) => {
  return (
    <section className="w-full relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-0 z-20">
      {/* Desktop (>= 1024px) */}
      <div className="hidden lg:block relative w-full pt-1 pb-10">
        <div className="absolute left-[-26px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg className="w-8 sm:w-9 md:w-10 h-full" />
        </div>
        <div className="absolute top-[12px] left-[-6px] right-[-6px] z-10 pointer-events-none">
          <CordelCatenaryRopeSvg sag={14} className="w-full h-8" />
        </div>
        <div className="absolute right-[-26px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg isRight className="w-8 sm:w-9 md:w-10 h-full" />
        </div>
        <div className="grid grid-cols-4 gap-5 w-full px-5 pt-4">
          <LandingBookletCard id={1} customClass="translate-y-[2px]" isFr={isFr} />
          <LandingBookletCard id={2} customClass="translate-y-[12px]" isFr={isFr} />
          <LandingBookletCard id={3} customClass="translate-y-[12px]" isFr={isFr} />
          <LandingBookletCard id={4} customClass="translate-y-[2px]" isFr={isFr} />
        </div>
      </div>

      {/* Tablette (768px - 1023px) */}
      <div className="hidden md:flex lg:hidden relative flex-col gap-12 w-full pt-1 pb-10">
        <div className="absolute left-[-20px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg className="w-8 h-full" />
        </div>
        <div className="absolute right-[-20px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg isRight className="w-8 h-full" />
        </div>
        <div className="relative w-full">
          <div className="absolute top-[12px] left-[-4px] right-[-4px] z-10 pointer-events-none">
            <CordelCatenaryRopeSvg sag={10} className="w-full h-7" />
          </div>
          <div className="grid grid-cols-2 gap-6 w-full px-5 pt-4">
            <LandingBookletCard id={1} customClass="translate-y-[6px]" isFr={isFr} />
            <LandingBookletCard id={2} customClass="translate-y-[6px]" isFr={isFr} />
          </div>
        </div>
        <div className="relative w-full">
          <div className="absolute top-[12px] left-[-4px] right-[-4px] z-10 pointer-events-none">
            <CordelCatenaryRopeSvg sag={10} className="w-full h-7" />
          </div>
          <div className="grid grid-cols-2 gap-6 w-full px-5 pt-4">
            <LandingBookletCard id={3} customClass="translate-y-[6px]" isFr={isFr} />
            <LandingBookletCard id={4} customClass="translate-y-[6px]" isFr={isFr} />
          </div>
        </div>
      </div>

      {/* Mobile (< 768px) */}
      <div className="flex md:hidden relative flex-col gap-14 w-full pt-1 pb-10">
        <div className="absolute left-[-14px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg className="w-7 h-full" />
        </div>
        <div className="absolute right-[-14px] top-[-10px] bottom-0 z-10 pointer-events-none flex flex-col">
          <CordelWoodenPostSvg isRight className="w-7 h-full" />
        </div>
        {([1, 2, 3, 4] as const).map((id) => (
          <div key={id} className="relative w-full">
            <div className="absolute top-[12px] left-[-2px] right-[-2px] z-10 pointer-events-none">
              <CordelCatenaryRopeSvg sag={6} className="w-full h-6" />
            </div>
            <div className="w-full px-4 pt-4">
              <LandingBookletCard id={id} customClass="translate-y-[4px]" isFr={isFr} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
