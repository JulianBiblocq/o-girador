import React from 'react';
import { SpeedTrainerMarkersSelector } from './SpeedTrainerMarkersSelector';
import { SpeedTrainerMeasureSteppers } from './SpeedTrainerMeasureSteppers';

interface MarkerItem {
  id: string;
  measure: number;
  name: string;
}

interface SpeedTrainerMeasureSelectionProps {
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
  startMeasure: number;
  endMeasure: number;
  setStartMeasure: React.Dispatch<React.SetStateAction<number>>;
  setEndMeasure: React.Dispatch<React.SetStateAction<number>>;
  totalMeasures: number;
  setSelectedSectionMarkerId: (id: string) => void;
}

export const SpeedTrainerMeasureSelection: React.FC<SpeedTrainerMeasureSelectionProps> = ({
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
  startMeasure,
  endMeasure,
  setStartMeasure,
  setEndMeasure,
  totalMeasures,
  setSelectedSectionMarkerId,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
        📍 {t('speedTrainerZone')}
      </label>

      <SpeedTrainerMarkersSelector
        t={t}
        sortedMarkers={sortedMarkers}
        markerMode={markerMode}
        setMarkerMode={setMarkerMode}
        selectedSectionMarkerId={selectedSectionMarkerId}
        rangeStartMarkerId={rangeStartMarkerId}
        rangeEndMarkerId={rangeEndMarkerId}
        handleSelectSingleMarker={handleSelectSingleMarker}
        handleSelectRangeStart={handleSelectRangeStart}
        handleSelectRangeEnd={handleSelectRangeEnd}
        totalMeasures={totalMeasures}
      />

      <SpeedTrainerMeasureSteppers
        t={t}
        startMeasure={startMeasure}
        endMeasure={endMeasure}
        setStartMeasure={setStartMeasure}
        setEndMeasure={setEndMeasure}
        totalMeasures={totalMeasures}
        setSelectedSectionMarkerId={setSelectedSectionMarkerId}
      />
    </div>
  );
};
