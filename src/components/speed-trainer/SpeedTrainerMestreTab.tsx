import React from 'react';
import { GraduationCap, Pencil, CheckCircle2, X } from 'lucide-react';
import { SpeedTrainerMeasureSelection } from './SpeedTrainerMeasureSelection';
import { SpeedTrainerTempoSelection } from './SpeedTrainerTempoSelection';
import { SpeedTrainerChallengesList } from './SpeedTrainerChallengesList';
import { SpeedTrainerStagesCountSelector } from './SpeedTrainerStagesCountSelector';
import { SpeedTrainerConsolidationControl } from './SpeedTrainerConsolidationControl';
import { SpeedTrainerStagesPreview } from './SpeedTrainerStagesPreview';
import { SpeedTrainerMestreTabProps } from './speedTrainerProps.types';

export const SpeedTrainerMestreTab: React.FC<SpeedTrainerMestreTabProps> = (props) => {
  const {
    lang, t, existingTrainings, isLoadingTrainings, editingTrainingId, onCancelEdit, onStartEdit, onDelete,
    confirmDeleteId, setConfirmDeleteId, isDeletingId, challengeTitle, setChallengeTitle, sortedMarkers,
    markerMode, setMarkerMode, selectedSectionMarkerId, rangeStartMarkerId, rangeEndMarkerId,
    handleSelectSingleMarker, handleSelectRangeStart, handleSelectRangeEnd, startMeasure, endMeasure,
    setStartMeasure, setEndMeasure, totalMeasures, setSelectedSectionMarkerId, stagesCount, setStagesCount,
    startBpm, targetBpm, setStartBpm, setTargetBpm, bpmStep, setBpmStep, loopInterval, setLoopInterval,
    consolidationLaps, setConsolidationLaps, calculatedStages, saveSuccess, saveMessage, saveError,
  } = props;
  return (
    <>
      <div className="p-2.5 bg-[#ebe2cb]/70 border border-[#1a1a1a]/40 rounded-xs flex items-start gap-2 text-[11px] text-[#333] leading-relaxed">
        <GraduationCap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p>
          {lang === 'fr'
            ? "Définissez un défi par paliers progressifs pour vos élèves. Ils devront maintenir le tempo cible avant de valider le défi."
            : "Defina um desafio em etapas progressivas para seus alunos. Eles deverão manter o andamento alvo para validar o desafio."}
        </p>
      </div>

      <SpeedTrainerChallengesList
        lang={lang} t={t} existingTrainings={existingTrainings}
        isLoadingTrainings={isLoadingTrainings} editingTrainingId={editingTrainingId}
        onCancelEdit={onCancelEdit} onStartEdit={onStartEdit} onDelete={onDelete}
        confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} isDeletingId={isDeletingId}
      />

      {editingTrainingId && (
        <div className="p-2 bg-amber-500/20 border-2 border-amber-600 rounded-xs flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1a1a1a]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 truncate">
            <Pencil className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>{t('speedTrainerEditingChallenge')}</span>
            <span className="truncate italic">"{challengeTitle}"</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[10px] font-bold px-2 py-0.5 bg-[#f4ecd8] border border-[#1a1a1a] rounded-xs hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer shrink-0"
          >
            {t('speedTrainerCancelEdit')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          • {t('speedTrainerChallengeTitle')}
        </label>
        <input
          type="text"
          value={challengeTitle}
          onChange={(e) => setChallengeTitle(e.target.value)}
          placeholder={t('speedTrainerChallengeTitlePlaceholder')}
          className="w-full bg-[#fcf9f2] border-2 border-[#1a1a1a] py-1.5 px-3 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] focus:outline-none"
        />
      </div>

      <SpeedTrainerMeasureSelection
        t={t} sortedMarkers={sortedMarkers} markerMode={markerMode} setMarkerMode={setMarkerMode}
        selectedSectionMarkerId={selectedSectionMarkerId} rangeStartMarkerId={rangeStartMarkerId}
        rangeEndMarkerId={rangeEndMarkerId} handleSelectSingleMarker={handleSelectSingleMarker}
        handleSelectRangeStart={handleSelectRangeStart} handleSelectRangeEnd={handleSelectRangeEnd}
        startMeasure={startMeasure} endMeasure={endMeasure} setStartMeasure={setStartMeasure}
        setEndMeasure={setEndMeasure} totalMeasures={totalMeasures} setSelectedSectionMarkerId={setSelectedSectionMarkerId}
      />

      <SpeedTrainerStagesCountSelector lang={lang} t={t} stagesCount={stagesCount} setStagesCount={setStagesCount} />

      <SpeedTrainerTempoSelection
        t={t} startBpm={startBpm} targetBpm={targetBpm} setStartBpm={setStartBpm} setTargetBpm={setTargetBpm}
        bpmStep={bpmStep} setBpmStep={setBpmStep} loopInterval={loopInterval} setLoopInterval={setLoopInterval}
      />

      <SpeedTrainerConsolidationControl t={t} consolidationLaps={consolidationLaps} setConsolidationLaps={setConsolidationLaps} />

      <SpeedTrainerStagesPreview t={t} calculatedStages={calculatedStages} consolidationLaps={consolidationLaps} targetBpm={targetBpm} />

      {saveSuccess && (
        <div className="p-2.5 bg-emerald-500/20 border-2 border-emerald-600 rounded-xs flex items-center gap-2 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{saveMessage || (editingTrainingId ? t('speedTrainerChallengeUpdated') : t('speedTrainerChallengeSaved'))}</span>
        </div>
      )}
      {saveError && (
        <div className="p-2.5 bg-red-500/20 border-2 border-red-600 rounded-xs flex items-center gap-2 text-xs font-bold text-red-900">
          <X className="w-4 h-4 text-red-700 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
    </>
  );
};
