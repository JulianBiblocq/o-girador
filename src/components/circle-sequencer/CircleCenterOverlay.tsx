/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CircleCenterOverlayProps {
  centerOverlayRef: React.RefObject<HTMLDivElement | null>;
  centerAfficheurRef: React.RefObject<HTMLDivElement | null>;
  centerOverlayImgRef: React.RefObject<HTMLImageElement | null>;
  centerOverlayTintRef: React.RefObject<HTMLDivElement | null>;
  centerOverlayTextRef: React.RefObject<HTMLSpanElement | null>;
  isCenterShaking: boolean;
}

export const CircleCenterOverlay: React.FC<CircleCenterOverlayProps> = ({
  centerOverlayRef,
  centerAfficheurRef,
  centerOverlayImgRef,
  centerOverlayTintRef,
  centerOverlayTextRef,
  isCenterShaking,
}) => {
  return (
    <div
      ref={centerOverlayRef}
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
      style={{
        opacity: 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      <div
        id="center-afficheur"
        ref={centerAfficheurRef}
        className={`w-[20%] aspect-square rounded-full border-4 border-[var(--cordel-border)] shadow-2xl relative overflow-hidden flex items-center justify-center text-center p-1.5 md:p-2.5 select-none ${
          isCenterShaking ? 'shake-active' : ''
        }`}
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
      >
        <img
          id="center-overlay-img"
          ref={centerOverlayImgRef}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'none' }}
        />
        <div
          id="center-overlay-tint"
          ref={centerOverlayTintRef}
          className="absolute inset-0 bg-black/30"
          style={{ display: 'none' }}
        />
        <span
          id="center-overlay-text"
          ref={centerOverlayTextRef}
          className="relative z-10 font-cactus font-bold uppercase tracking-wide select-none break-words w-full text-center px-1"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            fontSize: 'var(--dynamic-font-size, clamp(12px, 1.8vw, 15px))',
            whiteSpace: 'pre-line',
            lineHeight: 1.15,
          }}
        />
      </div>
    </div>
  );
};
