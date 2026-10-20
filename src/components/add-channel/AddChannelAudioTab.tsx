/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';

interface AudioTabProps {
  onSelectInstrument: (idx: number) => void;
  searchPlaceholder: string;
}

export const AddChannelAudioTab: React.FC<AudioTabProps> = ({
  onSelectInstrument,
  searchPlaceholder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const getInstrumentLabel = useInstrumentLabel();

  const availableInstruments = useMemo(() => {
    const list = instrumentsConfig
      .map((inst, idx) => ({ inst, idx }))
      .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');
    const apitoItem = list.find((item) => item.inst.id === 'apito');
    const rest = list.filter((item) => item.inst.id !== 'apito');
    const sorted = apitoItem ? [...rest, apitoItem] : list;

    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(({ inst, idx }) =>
      getInstrumentLabel(idx).toLowerCase().includes(query) ||
      inst.name.toLowerCase().includes(query)
    );
  }, [searchQuery, getInstrumentLabel]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="relative flex items-center w-full mb-4">
        <Search className="absolute left-3 text-[var(--cordel-text)]/50" size={16} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-4 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] placeholder-[var(--cordel-text)]/40 w-full focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
        {availableInstruments.map(({ inst, idx }) => (
          <div
            key={idx}
            onClick={() => onSelectInstrument(idx)}
            className="flex items-center gap-2.5 p-2.5 border-2 border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] hover:bg-[var(--cordel-text)]/10 rounded-sm cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            <img
              src={`${ASSETS_BASE_URL}${inst.iconImg}`}
              alt={inst.name}
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-cactus font-bold text-xs truncate uppercase tracking-wider">
              {getInstrumentLabel(idx)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
