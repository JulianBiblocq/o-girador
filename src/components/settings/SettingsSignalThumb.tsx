import React, { useState } from 'react';

interface SettingsSignalThumbProps {
  name: string;
  image?: string;
}

export const SettingsSignalThumb: React.FC<SettingsSignalThumbProps> = ({ name, image }) => {
  const [hasError, setHasError] = useState(false);
  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'SG';

  if (!image || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 text-[10px] font-cactus font-bold text-[var(--cordel-wood)]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      onError={() => setHasError(true)}
      className="w-full h-full object-contain"
    />
  );
};
