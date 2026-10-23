/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { notifyToast } from '../../utils/toastHelper';

interface SectionTabProps {
  selectableTracks: any[];
  tracks: any[];
  onCreateBus: (trackIds: number[], name: string) => void;
  lang: string;
  t: (key: string) => string;
}

export const AddChannelSectionTab: React.FC<SectionTabProps> = ({
  selectableTracks,
  tracks,
  onCreateBus,
  lang,
  t,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const [selectedBusTrackIds, setSelectedBusTrackIds] = useState<number[]>([]);
  const [busName, setBusName] = useState('');
  const [isBusNameEdited, setIsBusNameEdited] = useState(false);

  useEffect(() => {
    if (selectedBusTrackIds.length === 0) {
      if (!isBusNameEdited) setBusName('');
      return;
    }
    if (!isBusNameEdited) {
      const selectedTracks = tracks.filter((tr) => selectedBusTrackIds.includes(tr.id));
      const allAlfaia = selectedTracks.every((tr) => {
        const inst = instrumentsConfig[tr.instrumentIdx];
        return inst?.name.toLowerCase().includes('alfaia');
      });
      if (allAlfaia) {
        setBusName('ALFAIAS');
      } else {
        const names = selectedTracks
          .map((tr) => {
            const inst = instrumentsConfig[tr.instrumentIdx];
            return tr.customName || inst?.name || '';
          })
          .filter(Boolean);
        setBusName(names.join(' & ').toUpperCase());
      }
    }
  }, [selectedBusTrackIds, tracks, isBusNameEdited]);

  const handleToggleBusTrack = (trackId: number) => {
    setSelectedBusTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBusTrackIds.length === 0) return notifyToast(t('errorNoBusTracks'), 'error');
    if (!busName.trim()) return notifyToast(t('errorNoBusName'), 'error');
    onCreateBus(selectedBusTrackIds, busName.trim());
  };

  if (selectableTracks.length === 0) {
    return <p className="text-center py-6 text-sm text-[var(--cordel-text)]/60 italic">{t('noTracksBus')}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-3 select-none">{t('selectBusTracks')}</h4>
        <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
          {selectableTracks.map((track, index) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const isSelected = selectedBusTrackIds.includes(track.id);
            return (
              <button
                type="button"
                key={track.id}
                onClick={() => handleToggleBusTrack(track.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-[1px]'
                }`}
              >
                <img
                  src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                  alt={inst?.name}
                  className="w-4 h-4 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span>{track.isLinkFolder ? `${track.customName || 'Liaison'}` : track.customName || getInstrumentLabel(track.instrumentIdx)} ({index + 1})</span>
                {isSelected && <Check size={12} className="ml-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase font-bold text-[var(--cordel-text)]/70">{t('busNameLabel')}</label>
        <input
          type="text"
          value={busName}
          onChange={(e) => {
            setBusName(e.target.value);
            setIsBusNameEdited(true);
          }}
          className="px-3 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
          placeholder={lang === 'pt' ? 'ex.: CAIXAS & TAROLS' : 'ex. : CAIXAS & TAROLS'}
        />
      </div>

      <button
        type="submit"
        className="w-full mt-4 py-2.5 bg-[var(--cordel-wood)] text-white font-bold uppercase tracking-wider border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_var(--cordel-border)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-xs"
      >
        {t('btnCreateBus')}
      </button>
    </form>
  );
};
