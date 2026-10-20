import React from 'react';

interface MarkerItem {
  id: string;
  measure: number;
  name: string;
}

interface SpeedTrainerMarkersSelectorProps {
  t: (key: string) => string;
  sortedMarkers: MarkerItem[];
  markerMode: 'single' | 'range';
  setMarkerMode: (mode: 'single' | 'range') => void;
  selectedSectionMarkerId: string;
  rangeStartMarkerId: string;
  rangeEndMarkerId: string;
  handleSelectSingleMarker: (id: string) => void;
  handleSelectRangeStart: (id: string) => void;
  handleSelectRangeEnd: (id: string) => void;
  totalMeasures: number;
}

export const SpeedTrainerMarkersSelector: React.FC<SpeedTrainerMarkersSelectorProps> = ({
  t,
  sortedMarkers,
  markerMode,
  setMarkerMode,
  selectedSectionMarkerId,
  rangeStartMarkerId,
  rangeEndMarkerId,
  handleSelectSingleMarker,
  handleSelectRangeStart,
  handleSelectRangeEnd,
  totalMeasures,
}) => {
  if (sortedMarkers.length === 0) return null;

  return (
    <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2.5 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#666] font-bold uppercase flex items-center gap-1">
          🏷️ {t('speedTrainerMarkersTitle')}
        </span>
        {sortedMarkers.length > 1 && (
          <div className="flex border border-[#1a1a1a] rounded-xs bg-[#ebe2cb] p-0.5 text-[10px] font-cactus">
            <button
              type="button"
              onClick={() => setMarkerMode('single')}
              className={`px-2 py-0.5 rounded-xs font-bold cursor-pointer ${
                markerMode === 'single' ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]' : 'text-[#1a1a1a] hover:bg-black/5'
              }`}
            >
              {t('speedTrainerSingleMarker')}
            </button>
            <button
              type="button"
              onClick={() => setMarkerMode('range')}
              className={`px-2 py-0.5 rounded-xs font-bold cursor-pointer ${
                markerMode === 'range' ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]' : 'text-[#1a1a1a] hover:bg-black/5'
              }`}
            >
              {t('speedTrainerRangeMarker')}
            </button>
          </div>
        )}
      </div>

      {markerMode === 'single' ? (
        <select
          value={selectedSectionMarkerId}
          onChange={(e) => handleSelectSingleMarker(e.target.value)}
          className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] cursor-pointer focus:outline-none"
        >
          <option value="">{t('speedTrainerSelectSection')}</option>
          {sortedMarkers.map((m, idx) => {
            const nextM = sortedMarkers[idx + 1];
            const endM = nextM ? Math.max(m.measure, nextM.measure - 1) : totalMeasures - 1;
            const rangeLabel = (m.measure + 1) === (endM + 1) ? `m. ${m.measure + 1}` : `m. ${m.measure + 1} - ${endM + 1}`;
            return (
              <option key={m.id} value={m.id}>
                📍 {m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${m.measure + 1}`} ({rangeLabel})
              </option>
            );
          })}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={rangeStartMarkerId}
            onChange={(e) => handleSelectRangeStart(e.target.value)}
            className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a]"
          >
            <option value="">{t('speedTrainerMarkerStartPlaceholder')}</option>
            {sortedMarkers.map((m) => (
              <option key={m.id} value={m.id}>{m.name.replace(/\n/g, ' ').trim() || `m. ${m.measure + 1}`} (m. {m.measure + 1})</option>
            ))}
          </select>
          <select
            value={rangeEndMarkerId}
            onChange={(e) => handleSelectRangeEnd(e.target.value)}
            className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a]"
          >
            <option value="">{t('speedTrainerMarkerEndPlaceholder')}</option>
            {sortedMarkers.map((m) => (
              <option key={m.id} value={m.id}>{m.name.replace(/\n/g, ' ').trim() || `m. ${m.measure + 1}`} (m. {m.measure + 1})</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
