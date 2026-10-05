/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CordelTargetProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Icône Cible Cordel (style gravure sur bois / Xilogravura)
 * Deux cercles concentriques facettés aux traits bruts, réticule 4 axes et point franc central.
 * Utilise currentColor pour s'adapter dynamiquement à toutes les teintes et thèmes.
 */
export const CordelTarget: React.FC<CordelTargetProps> = ({
  size,
  className = 'w-4 h-4',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Cercle extérieur facetté brut style gravure sur bois */}
      <path d="M12 2.5 L16.8 4.2 L20.5 7.8 L22 12.5 L20.2 17.2 L16.5 20.8 L11.8 22 L7.2 20.5 L3.5 16.8 L2 11.8 L3.8 7.2 L7.5 3.5 Z" />

      {/* Cercle intérieur facetté */}
      <path d="M12 6.8 L15.2 8 L17.5 10.8 L17.8 13.8 L15.5 16.8 L12.2 17.8 L8.8 16.5 L6.5 13.5 L6.8 10.2 L9.5 7.5 Z" />

      {/* Réticule 4 axes Xilo */}
      <path d="M12 1.5 L12 5.5" strokeWidth="2.2" />
      <path d="M12 18.5 L12 22.5" strokeWidth="2.2" />
      <path d="M1.5 12 L5.5 12" strokeWidth="2.2" />
      <path d="M18.5 12 L22.5 12" strokeWidth="2.2" />

      {/* Disque franc au cœur */}
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
};
