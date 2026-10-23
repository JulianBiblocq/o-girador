
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '../data';
import { useSpeedTrainerLogic } from './speed-trainer/useSpeedTrainerLogic';
import { useMestreTrainingLogic } from './speed-trainer/useMestreTrainingLogic';
import { SpeedTrainerHeader } from './speed-trainer/SpeedTrainerHeader';
import { SpeedTrainerSpeedTab } from './speed-trainer/SpeedTrainerSpeedTab';
import { SpeedTrainerMestreTab } from './speed-trainer/SpeedTrainerMestreTab';
import { SpeedTrainerFooter } from './speed-trainer/SpeedTrainerFooter';

interface SpeedTrainerModalProps {
  changeViewMode?: (mode: 'roda' | 'console' | 'timeline' | 'admin' | 'landing') => void;
}

export const SpeedTrainerModal: React.FC<SpeedTrainerModalProps> = ({ changeViewMode }) => {
  const logic = useSpeedTrainerLogic(changeViewMode);
  const t = (key: string) => (i18n[logic.lang] as any)?.[key] || (i18n['pt'] as any)?.[key] || key;

  const mestre = useMestreTrainingLogic(
    logic.isOpen, logic.activeTab, logic.audio.activePresetName, logic.sequencer.metadata?.toada,
    logic.startMeasure, logic.endMeasure, logic.startBpm, logic.targetBpm, logic.bpmStep,
    logic.loopInterval, logic.consolidationLaps, t,
    (tr) => {
      if (tr.startMeasure !== undefined) logic.setStartMeasure(tr.startMeasure);
      if (tr.endMeasure !== undefined) logic.setEndMeasure(tr.endMeasure);
      if (tr.stages && tr.stages.length > 0) {
        logic.setStartBpm(tr.stages[0].targetBpm);
        logic.setTargetBpm(tr.stages[tr.stages.length - 1].targetBpm);
      }
      if (tr.consolidationLaps !== undefined) logic.setConsolidationLaps(tr.consolidationLaps);
    }
  );

  useEffect(() => {
    if (!logic.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        logic.handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [logic.isOpen, logic.handleClose]);

  if (!logic.isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs pt-16 sm:pt-20 pb-4 px-4 select-none">
      <div className="w-full max-w-[500px] max-h-[calc(100dvh-5rem)] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] flex flex-col overflow-hidden text-[#1a1a1a]">
        <SpeedTrainerHeader
          lang={logic.lang}
          t={t}
          activeTab={logic.activeTab}
          setActiveTab={logic.setActiveTab}
          isMestre={mestre.isMestre}
          isActive={logic.isActive}
          currentTour={logic.currentTour}
          currentBpm={logic.currentBpm}
          targetBpm={logic.targetBpm}
          onClose={logic.handleClose}
        />
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {logic.activeTab === 'speedTrainer' ? (
            <SpeedTrainerSpeedTab
              t={t} activeTrainingSession={logic.activeTrainingSession} sortedMarkers={logic.sortedMarkers}
              markerMode={logic.markerMode} setMarkerMode={logic.setMarkerMode}
              selectedSectionMarkerId={logic.selectedSectionMarkerId}
              rangeStartMarkerId={logic.rangeStartMarkerId} rangeEndMarkerId={logic.rangeEndMarkerId}
              handleSelectSingleMarker={(id) => logic.setSelectedSectionMarkerId(id)}
              handleSelectRangeStart={(id) => logic.setRangeStartMarkerId(id)}
              handleSelectRangeEnd={(id) => logic.setRangeEndMarkerId(id)}
              startMeasure={logic.startMeasure} endMeasure={logic.endMeasure}
              setStartMeasure={logic.setStartMeasure} setEndMeasure={logic.setEndMeasure}
              totalMeasures={logic.totalMeasures} setSelectedSectionMarkerId={logic.setSelectedSectionMarkerId}
              startBpm={logic.startBpm} targetBpm={logic.targetBpm} setStartBpm={logic.setStartBpm}
              setTargetBpm={logic.setTargetBpm} bpmStep={logic.bpmStep} setBpmStep={logic.setBpmStep}
              loopInterval={logic.loopInterval} setLoopInterval={logic.setLoopInterval}
            />
          ) : (
            <SpeedTrainerMestreTab
              lang={logic.lang} t={t} existingTrainings={mestre.existingTrainings}
              isLoadingTrainings={mestre.isLoadingTrainings} editingTrainingId={mestre.editingTrainingId}
              onCancelEdit={mestre.handleCancelEdit} onStartEdit={mestre.handleStartEditTraining}
              onDelete={mestre.handleDeleteTraining} confirmDeleteId={mestre.confirmDeleteId}
              setConfirmDeleteId={mestre.setConfirmDeleteId} isDeletingId={mestre.isDeletingId}
              challengeTitle={mestre.challengeTitle} setChallengeTitle={mestre.setChallengeTitle}
              sortedMarkers={logic.sortedMarkers} markerMode={logic.markerMode} setMarkerMode={logic.setMarkerMode}
              selectedSectionMarkerId={logic.selectedSectionMarkerId} rangeStartMarkerId={logic.rangeStartMarkerId}
              rangeEndMarkerId={logic.rangeEndMarkerId} handleSelectSingleMarker={(id) => logic.setSelectedSectionMarkerId(id)}
              handleSelectRangeStart={(id) => logic.setRangeStartMarkerId(id)} handleSelectRangeEnd={(id) => logic.setRangeEndMarkerId(id)}
              startMeasure={logic.startMeasure} endMeasure={logic.endMeasure}
              setStartMeasure={logic.setStartMeasure} setEndMeasure={logic.setEndMeasure}
              totalMeasures={logic.totalMeasures} setSelectedSectionMarkerId={logic.setSelectedSectionMarkerId}
              stagesCount={mestre.stagesCount} setStagesCount={mestre.setStagesCount}
              startBpm={logic.startBpm} targetBpm={logic.targetBpm} setStartBpm={logic.setStartBpm}
              setTargetBpm={logic.setTargetBpm} bpmStep={logic.bpmStep} setBpmStep={logic.setBpmStep}
              loopInterval={logic.loopInterval} setLoopInterval={logic.setLoopInterval}
              consolidationLaps={logic.consolidationLaps} setConsolidationLaps={logic.setConsolidationLaps}
              calculatedStages={mestre.calculatedStages} saveSuccess={mestre.saveSuccess}
              saveMessage={mestre.saveMessage} saveError={mestre.saveError}
            />
          )}
        </div>
        <SpeedTrainerFooter
          activeTab={logic.activeTab}
          t={t}
          isActive={logic.isActive}
          onStopAndRestore={logic.audio.stopSpeedTrainerAudio}
          onLaunch={logic.handleLaunch}
          activeTrainingSession={logic.activeTrainingSession}
          startBpm={logic.startBpm}
          targetBpm={logic.targetBpm}
          isSaving={mestre.isSaving}
          onSaveTraining={mestre.handleSaveTraining}
          editingTrainingId={mestre.editingTrainingId}
        />
      </div>
    </div>,
    document.body
  );
};
