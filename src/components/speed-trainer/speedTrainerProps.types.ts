import React from 'react';
import { TrainingProgram, TrainingStage } from '../../types/trainings';

export interface MarkerItem {
  id: string;
  measure: number;
  name: string;
}

export interface SpeedTrainerMestreTabProps {
  lang: string;
  t: (key: string) => string;
  existingTrainings: TrainingProgram[];
  isLoadingTrainings: boolean;
  editingTrainingId: string | null;
  onCancelEdit: () => void;
  onStartEdit: (tr: TrainingProgram) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isDeletingId: string | null;
  challengeTitle: string;
  setChallengeTitle: (title: string) => void;
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
  stagesCount: number;
  setStagesCount: (count: number) => void;
  startBpm: number;
  targetBpm: number;
  setStartBpm: React.Dispatch<React.SetStateAction<number>>;
  setTargetBpm: React.Dispatch<React.SetStateAction<number>>;
  bpmStep: number;
  setBpmStep: (step: number) => void;
  loopInterval: number;
  setLoopInterval: (interval: number) => void;
  consolidationLaps: number;
  setConsolidationLaps: React.Dispatch<React.SetStateAction<number>>;
  calculatedStages: TrainingStage[];
  saveSuccess: boolean;
  saveMessage: string | null;
  saveError: string | null;
}
