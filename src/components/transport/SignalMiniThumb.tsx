/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const SignalMiniThumb: React.FC<{ name: string; image?: string }> = ({ name, image }) => {
  const [hasError, setHasError] = React.useState(false);
  const initials = name
    ? name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('')
    : 'SG';

  if (!image || hasError) {
    return (
      <span className="w-5 h-5 flex items-center justify-center bg-black/10 border border-black/20 text-[8px] font-bold font-cactus text-[var(--cordel-wood)] leading-none rounded-none">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      onError={() => setHasError(true)}
      className="w-5 h-5 object-contain bg-white/80 border border-black/20"
    />
  );
};
