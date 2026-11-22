
import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { instrumentsConfig } from '../../data';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { CordelInstrumentIcon } from '../icons/CordelInstrumentIcon';

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
        {availableInstruments.map(({ inst, idx }) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectInstrument(idx)}
            className="flex items-center gap-2.5 p-2.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] cordel-wood-shadow-sm hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] hover:border-[var(--cordel-border-strong)] active:translate-y-[1px] rounded-sm cursor-pointer transition-colors duration-150 text-left"
          >
            <CordelInstrumentIcon instrumentId={inst.id} className="w-6 h-6 shrink-0" />
            <span className="font-cactus font-bold text-xs truncate uppercase tracking-wider">
              {getInstrumentLabel(idx)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
