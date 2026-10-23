
import React, { useState, useEffect } from 'react';
import { instrumentsConfig } from '../../data';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { TrackSelectorButton } from './TrackSelectorButton';
import { notifyToast } from '../../utils/toastHelper';

interface LinkTabProps {
  individualTracks: any[];
  tracks: any[];
  onCreateLink: (masterId: number, slaveIds: number[], name: string) => void;
  lang: string;
  t: (key: string) => string;
}

export const AddChannelLinkTab: React.FC<LinkTabProps> = ({
  individualTracks,
  tracks,
  onCreateLink,
  lang,
  t,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const [masterTrackId, setMasterTrackId] = useState<number | null>(null);
  const [selectedSlaveTrackIds, setSelectedSlaveTrackIds] = useState<number[]>([]);
  const [linkGroupName, setLinkGroupName] = useState('');
  const [isLinkNameEdited, setIsLinkNameEdited] = useState(false);

  useEffect(() => {
    if (masterTrackId === null) {
      if (!isLinkNameEdited) setLinkGroupName('');
      return;
    }
    if (!isLinkNameEdited) {
      const masterTrack = tracks.find((tr) => tr.id === masterTrackId);
      if (masterTrack) {
        const inst = instrumentsConfig[masterTrack.instrumentIdx];
        const name = masterTrack.customName || inst?.name || '';
        const isAlfaia = name.toLowerCase().includes('alfaia');
        setLinkGroupName(isAlfaia ? 'ALFAIAS' : `${name.toUpperCase()}S`);
      }
    }
  }, [masterTrackId, tracks, isLinkNameEdited]);

  const handleToggleSlaveTrack = (trackId: number) => {
    setSelectedSlaveTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterTrackId === null) return notifyToast(t('errorNoMaster'), 'error');
    if (selectedSlaveTrackIds.length === 0) return notifyToast(t('errorNoSlaves'), 'error');
    if (!linkGroupName.trim()) return notifyToast(t('errorNoLinkName'), 'error');
    onCreateLink(masterTrackId, selectedSlaveTrackIds, linkGroupName.trim());
  };

  if (individualTracks.length === 0) {
    return <p className="text-center py-6 text-sm text-[var(--cordel-text)]/60 italic">{t('noTracksLink')}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-2 select-none">{t('selectMaster')}</h4>
        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
          {individualTracks.map((track, index) => (
            <TrackSelectorButton
              key={track.id}
              track={track}
              isSelected={masterTrackId === track.id}
              onClick={() => {
                setMasterTrackId(track.id);
                setSelectedSlaveTrackIds((prev) => prev.filter((id) => id !== track.id));
              }}
              label={track.customName || getInstrumentLabel(track.instrumentIdx)}
              orderNumber={index + 1}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-2 select-none">{t('selectSlaves')}</h4>
        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
          {individualTracks
            .filter((tr) => tr.id !== masterTrackId)
            .map((track) => (
              <TrackSelectorButton
                key={track.id}
                track={track}
                isSelected={selectedSlaveTrackIds.includes(track.id)}
                onClick={() => handleToggleSlaveTrack(track.id)}
                label={track.customName || getInstrumentLabel(track.instrumentIdx)}
                orderNumber={tracks.findIndex((t) => t.id === track.id) + 1}
              />
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase font-bold text-[var(--cordel-text)]/70">{t('linkGroupNameLabel')}</label>
        <input
          type="text"
          value={linkGroupName}
          onChange={(e) => {
            setLinkGroupName(e.target.value);
            setIsLinkNameEdited(true);
          }}
          className="px-3 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
          placeholder={lang === 'pt' ? 'ex.: CAIXAS VINCULADAS' : 'ex. : CAIXAS LIÉES'}
        />
      </div>

      <button
        type="submit"
        className="w-full mt-4 py-2.5 bg-[var(--cordel-wood)] text-white font-bold uppercase tracking-wider border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_var(--cordel-border)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-xs"
      >
        {t('btnCreateLink')}
      </button>
    </form>
  );
};
