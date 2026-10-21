/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sliders tactiles Cordel pour Signes du Mestre Mobile (< 80 lignes).
 */

import React from 'react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  options: CordelOptions;
  setOptions: React.Dispatch<React.SetStateAction<CordelOptions>>;
  lang: 'fr' | 'pt';
}

export const MobileMestreCordelSliders: React.FC<Props> = ({ options, setOptions, lang }) => (
  <div className="flex flex-col gap-2 p-2 bg-[var(--cordel-bg)] rounded border border-[var(--cordel-border)] text-xs font-mono">
    <label className="flex justify-between">
      <span>{tMobile(lang, 'brightness')}</span>
      <span className="text-[10px] opacity-75">{options.brightness}</span>
    </label>
    <input
      type="range"
      min={-50}
      max={50}
      value={options.brightness ?? 0}
      onChange={(e) => setOptions((o) => ({ ...o, brightness: Number(e.target.value) }))}
      className="w-full accent-[var(--cordel-accent)]"
    />

    <label className="flex justify-between">
      <span>{tMobile(lang, 'sobelThreshold')}</span>
      <span className="text-[10px] opacity-75">{options.threshold}</span>
    </label>
    <input
      type="range"
      min={20}
      max={220}
      value={options.threshold ?? 128}
      onChange={(e) => setOptions((o) => ({ ...o, threshold: Number(e.target.value) }))}
      className="w-full accent-[var(--cordel-accent)]"
    />

    <label className="flex justify-between">
      <span>{tMobile(lang, 'woodgrain')}</span>
      <span className="text-[10px] opacity-75">{options.woodGrain}%</span>
    </label>
    <input
      type="range"
      min={0}
      max={100}
      value={options.woodGrain ?? 10}
      onChange={(e) => setOptions((o) => ({ ...o, woodGrain: Number(e.target.value) }))}
      className="w-full accent-[var(--cordel-accent)]"
    />

    <div className="flex justify-between pt-1 text-[11px]">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={options.isMirror}
          onChange={(e) => setOptions((o) => ({ ...o, isMirror: e.target.checked }))}
          className="accent-[var(--cordel-accent)]"
        />
        {tMobile(lang, 'mirror')}
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={options.lockFraming}
          onChange={(e) => setOptions((o) => ({ ...o, lockFraming: e.target.checked }))}
          className="accent-[var(--cordel-accent)]"
        />
        {tMobile(lang, 'lockFraming')}
      </label>
    </div>
  </div>
);
