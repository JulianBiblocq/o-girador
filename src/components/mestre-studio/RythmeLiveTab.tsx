import React from 'react';
import { TrackGroup, Language } from '../../types';

const CircleSequencer = React.lazy(() => import('../CircleSequencer').then(m => ({ default: m.CircleSequencer })));

interface RythmeLiveTabProps {
  lang: Language;
  rythmeLiveCordeCible: number;
  setRythmeLiveCordeCible: (val: number) => void;
  rythmeLiveTitle: string;
  setRythmeLiveTitle: (val: string) => void;
  rythmeLiveLoopsRequired: number;
  setRythmeLiveLoopsRequired: (val: number) => void;
  rythmeLiveToleranceMs: 30 | 80;
  setRythmeLiveToleranceMs: (val: 30 | 80) => void;
  rythmeLiveStudentInstrument: 'caixa' | 'alfaia' | 'gongue' | 'agbe';
  setRythmeLiveStudentInstrument: (val: 'caixa' | 'alfaia' | 'gongue' | 'agbe') => void;
  rythmeLiveRewardSignatory: string;
  setRythmeLiveRewardSignatory: (val: string) => void;
  
  rythmeLivePlaybackTracks: TrackGroup[];
  setRythmeLivePlaybackTracks: React.Dispatch<React.SetStateAction<TrackGroup[]>>;
  rythmeLiveTargetTracks: TrackGroup[];
  setRythmeLiveTargetTracks: React.Dispatch<React.SetStateAction<TrackGroup[]>>;
  rythmeLiveBpm: number;
  setRythmeLiveBpm: (val: number) => void;
  
  presetFiles: string[];
  localPresets: string[];
  handleLoadPresetToGame: (presetName: string, gameType: 'dictee' | 'inspecteur' | 'rythmelive' | 'sablier_mestre') => void;
  handleLoadDraft: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  
  studioPlaying: boolean;
  setStudioPlaying: (val: boolean) => void;
  handleStepChangeGeneric: (
    tracksState: TrackGroup[],
    setTracksState: React.Dispatch<React.SetStateAction<TrackGroup[]>>,
    trackId: string,
    patternId: string,
    stepIndex: number,
    newValue: number,
    layerIndex: number,
    noteIndex: number
  ) => void;
  getActivePatternMap: (tracks: TrackGroup[]) => Record<string, string>;
}

export const RythmeLiveTab: React.FC<RythmeLiveTabProps> = ({
  lang,
  rythmeLiveCordeCible,
  setRythmeLiveCordeCible,
  rythmeLiveTitle,
  setRythmeLiveTitle,
  rythmeLiveLoopsRequired,
  setRythmeLiveLoopsRequired,
  rythmeLiveToleranceMs,
  setRythmeLiveToleranceMs,
  rythmeLiveStudentInstrument,
  setRythmeLiveStudentInstrument,
  rythmeLiveRewardSignatory,
  setRythmeLiveRewardSignatory,
  rythmeLivePlaybackTracks,
  setRythmeLivePlaybackTracks,
  rythmeLiveTargetTracks,
  setRythmeLiveTargetTracks,
  rythmeLiveBpm,
  setRythmeLiveBpm,
  presetFiles,
  localPresets,
  handleLoadPresetToGame,
  handleLoadDraft,
  studioPlaying,
  setStudioPlaying,
  handleStepChangeGeneric,
  getActivePatternMap,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>📂 Charger un exercice pour le modifier (.json)</span>
          <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'rythme_live')} className="text-[10px] cursor-pointer" />
        </label>
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>🎵 Charger la base musicale depuis un Preset</span>
          <select 
            onChange={(e) => {
              handleLoadPresetToGame(e.target.value, 'rythme_live');
              e.target.value = '';
            }} 
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
          >
            <option value="">Sélectionner un preset...</option>
            {presetFiles.map(p => <option key={p} value={p}>Catalogue: {p.replace('.json', '')}</option>)}
            {localPresets.map(p => <option key={p} value={p}>Local: {p}</option>)}
          </select>
        </label>
      </div>
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
        <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
          Paramètres de l'Examen Rythmique
        </span>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
            <select
              value={rythmeLiveCordeCible}
              onChange={(e) => setRythmeLiveCordeCible(Number(e.target.value))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              <option value={1}>Corde 1</option>
              <option value={2}>Corde 2</option>
              <option value={3}>Corde 3</option>
              <option value={4}>Corde 4</option>
              <option value={5}>Corde 5</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
            <input
              type="text"
              value={rythmeLiveTitle}
              onChange={(e) => setRythmeLiveTitle(e.target.value)}
              placeholder="Ex: L'Examen Final du Mestre"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Boucles Requises</label>
            <input
              type="number"
              min={1}
              value={rythmeLiveLoopsRequired}
              onChange={(e) => setRythmeLiveLoopsRequired(Math.max(1, Number(e.target.value) || 2))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tolérance (Précision)</label>
            <select
              value={rythmeLiveToleranceMs}
              onChange={(e) => setRythmeLiveToleranceMs(Number(e.target.value) as 30 | 80)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              <option value={80}>Moyen (+/- 80ms)</option>
              <option value={30}>Parfait (+/- 30ms)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Joué</label>
            <select
              value={rythmeLiveStudentInstrument}
              onChange={(e) => setRythmeLiveStudentInstrument(e.target.value as any)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full uppercase"
            >
              <option value="caixa">Caixa</option>
              <option value="alfaia">Alfaia</option>
              <option value="gongue">Gonguê</option>
              <option value="agbe">Agbê</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-1 border-t border-dashed border-[var(--cordel-border)]/20 pt-3">
          <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Signataire du Diplôme (Récompense)</label>
          <input
            type="text"
            value={rythmeLiveRewardSignatory}
            onChange={(e) => setRythmeLiveRewardSignatory(e.target.value)}
            placeholder="Ex: Mestre Vicente de Paula"
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
          />
        </div>
      </div>

      {/* Double Circle Sequencer layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sequencer 1: Playback Accompagnement */}
        <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center">
          <span className="font-cactus text-sm font-bold text-blue-700 uppercase">
            🎵 1. Piste d'Accompagnement (Playback)
          </span>
          <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
            <CircleSequencer
              lang={lang}
              tracks={rythmeLivePlaybackTracks}
              isPlaying={studioPlaying}
              currentMeasure={0}
              maxTicks={16}
              timeSig="4/4"
              totalMeasures={1}
              onTogglePlay={() => setStudioPlaying(!studioPlaying)}
              onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                handleStepChangeGeneric(rythmeLivePlaybackTracks, setRythmeLivePlaybackTracks, trId, ptId, stIdx, nSt, lyr, nt);
              }}
              langPromptVoiceText=""
              bpm={rythmeLiveBpm}
              measureBpms={[rythmeLiveBpm]}
              measureVols={[80]}
              isMobile={true}
            />
          </div>
        </div>

        {/* Sequencer 2: Target Partition required from student */}
        <div className="border-2 border-green-600/80 p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center relative shadow-[0_0_8px_rgba(34,197,94,0.15)]">
          <span className="font-cactus text-sm font-bold text-green-700 uppercase">
            🎯 2. Partition Cible de l'Élève
          </span>
          <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
            <CircleSequencer
              lang={lang}
              tracks={rythmeLiveTargetTracks}
              isPlaying={studioPlaying}
              currentMeasure={0}
              maxTicks={16}
              timeSig="4/4"
              totalMeasures={1}
              onTogglePlay={() => setStudioPlaying(!studioPlaying)}
              onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                handleStepChangeGeneric(rythmeLiveTargetTracks, setRythmeLiveTargetTracks, trId, ptId, stIdx, nSt, lyr, nt);
              }}
              langPromptVoiceText=""
              bpm={rythmeLiveBpm}
              measureBpms={[rythmeLiveBpm]}
              measureVols={[80]}
              isMobile={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
