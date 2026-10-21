import React from 'react';
import { Info } from 'lucide-react';
import { SpeedTrainerMeasureSelection } from './SpeedTrainerMeasureSelection';
import { SpeedTrainerTempoSelection } from './SpeedTrainerTempoSelection';

interface MarkerItem {
  id: string;
  measure: number;
  name: string;
}

interface SpeedTrainerSpeedTabProps {
  t: (key: string) => string;
  activeTrainingSession: any;
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
  startBpm: number;
  targetBpm: number;
  setStartBpm: React.Dispatch<React.SetStateAction<number>>;
  setTargetBpm: React.Dispatch<React.SetStateAction<number>>;
  bpmStep: number;
  setBpmStep: (step: number) => void;
  loopInterval: number;
  setLoopInterval: (interval: number) => void;
}

export const SpeedTrainerSpeedTab: React.FC<SpeedTrainerSpeedTabProps> = ({
  t,
  activeTrainingSession,
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
  startBpm,
  targetBpm,
  setStartBpm,
  setTargetBpm,
  bpmStep,
  setBpmStep,
  loopInterval,
  setLoopInterval,
}) => {
  return (
    <>
      {activeTrainingSession && (
        <div className="p-3 bg-amber-500/20 border-2 border-amber-600/60 rounded-xs flex flex-col gap-1 shadow-[2px_2px_0px_#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="font-cactus font-bold text-sm text-[#1a1a1a]">
              ▸ {activeTrainingSession.title || 'Défi Mestre'} — Palier {activeTrainingSession.stageIndex}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-600 text-[#f4ecd8] rounded-xs uppercase">
              Défi
            </span>
          </div>
          <span className="text-xs text-[#555] font-sans">
            Objectif : {activeTrainingSession.startBpm} ➔ {activeTrainingSession.targetBpm} BPM ({activeTrainingSession.consolidationLaps} tour{activeTrainingSession.consolidationLaps > 1 ? 's' : ''} de maintien)
          </span>
        </div>
      )}

      <div className="p-2.5 bg-[#ebe2cb]/70 border border-[#1a1a1a]/40 rounded-xs flex items-start gap-2 text-[11px] text-[#333] leading-relaxed">
        <Info className="w-4 h-4 text-[#8b2a1a] shrink-0 mt-0.5" />
        <p>{t('speedTrainerHelp')}</p>
      </div>

      <SpeedTrainerMeasureSelection
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
        startMeasure={startMeasure}
        endMeasure={endMeasure}
        setStartMeasure={setStartMeasure}
        setEndMeasure={setEndMeasure}
        totalMeasures={totalMeasures}
        setSelectedSectionMarkerId={setSelectedSectionMarkerId}
      />

      <SpeedTrainerTempoSelection
        t={t}
        startBpm={startBpm}
        targetBpm={targetBpm}
        setStartBpm={setStartBpm}
        setTargetBpm={setTargetBpm}
        bpmStep={bpmStep}
        setBpmStep={setBpmStep}
        loopInterval={loopInterval}
        setLoopInterval={setLoopInterval}
      />
    </>
  );
};
