import React from 'react';
import { TrackGroup, Language } from '../../types';

const CircleSequencer = React.lazy(() => import('../CircleSequencer').then(m => ({ default: m.CircleSequencer })));

interface InspecteurTabProps {
  lang: Language;
  inspecteurCordeCible: number;
  setInspecteurCordeCible: (val: number) => void;
  inspecteurTitle: string;
  setInspecteurTitle: (val: string) => void;
  inspecteurDescription: string;
  setInspecteurDescription: (val: string) => void;
  inspecteurGuiltyInstrument: 'alfaia' | 'caixa' | 'gongue' | 'agbe';
  setInspecteurGuiltyInstrument: (val: 'alfaia' | 'caixa' | 'gongue' | 'agbe') => void;
  inspecteurTotalMeasures: number;
  setInspecteurTotalMeasures: (val: number) => void;
  inspecteurBpm: number;
  setInspecteurBpm: (val: number) => void;
  inspecteurCurrentMeasure: number;
  setInspecteurCurrentMeasure: React.Dispatch<React.SetStateAction<number>>;
  inspecteurPerfectTracks: TrackGroup[];
  setInspecteurPerfectTracks: React.Dispatch<React.SetStateAction<TrackGroup[]>>;
  inspecteurSabotagedTracks: TrackGroup[];
  setInspecteurSabotagedTracks: React.Dispatch<React.SetStateAction<TrackGroup[]>>;
  
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

export const InspecteurTab: React.FC<InspecteurTabProps> = ({
  lang,
  inspecteurCordeCible,
  setInspecteurCordeCible,
  inspecteurTitle,
  setInspecteurTitle,
  inspecteurDescription,
  setInspecteurDescription,
  inspecteurGuiltyInstrument,
  setInspecteurGuiltyInstrument,
  inspecteurTotalMeasures,
  setInspecteurTotalMeasures,
  inspecteurBpm,
  setInspecteurBpm,
  inspecteurCurrentMeasure,
  setInspecteurCurrentMeasure,
  inspecteurPerfectTracks,
  setInspecteurPerfectTracks,
  inspecteurSabotagedTracks,
  setInspecteurSabotagedTracks,
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
          <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'inspecteur')} className="text-[10px] cursor-pointer" />
        </label>
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>🎵 Charger la partition parfaite depuis un Preset</span>
          <select 
            onChange={(e) => {
              handleLoadPresetToGame(e.target.value, 'inspecteur');
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
          Paramètres de l'Enquête
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
            <select
              value={inspecteurCordeCible}
              onChange={(e) => setInspecteurCordeCible(Number(e.target.value))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              <option value={1}>Corde 1</option>
              <option value={2}>Corde 2</option>
              <option value={3}>Corde 3</option>
              <option value={4}>Corde 4</option>
              <option value={5}>Corde 5</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
            <input
              type="text"
              value={inspecteurTitle}
              onChange={(e) => setInspecteurTitle(e.target.value)}
              placeholder="Ex: Le Voleur de Caixa"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Description / Indice</label>
            <input
              type="text"
              value={inspecteurDescription}
              onChange={(e) => setInspecteurDescription(e.target.value)}
              placeholder="Ex: Un intrus s'est glissé dans la caisse claire..."
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Coupable</label>
            <select
              value={inspecteurGuiltyInstrument}
              onChange={(e) => setInspecteurGuiltyInstrument(e.target.value as any)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full uppercase"
            >
              <option value="caixa">Caixa (Caisse claire)</option>
              <option value="alfaia">Alfaia (Tambour)</option>
              <option value="gongue">Gonguê (Cloche)</option>
              <option value="agbe">Agbê (Shekere)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Total Mesures (Preset)</label>
            <select
              value={inspecteurTotalMeasures}
              onChange={(e) => setInspecteurTotalMeasures(Number(e.target.value))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              {[1,2,3,4,8,16].map(n => <option key={n} value={n}>{n} Mesure{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo (BPM)</label>
            <input
              type="number"
              value={inspecteurBpm}
              onChange={(e) => setInspecteurBpm(Number(e.target.value) || 83)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
        </div>
      </div>

      {/* Pagination for Inspecteur */}
      {inspecteurTotalMeasures > 1 && (
        <div className="flex justify-center items-center gap-4 py-2 bg-[var(--cordel-bg)] border-y border-dashed border-[var(--cordel-border)]/30 mt-4 mb-2">
          <button
            onClick={() => setInspecteurCurrentMeasure(prev => Math.max(0, prev - 1))}
            disabled={inspecteurCurrentMeasure === 0}
            className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
          >
            &lt;
          </button>
          <span className="font-cactus font-bold text-lg text-[var(--cordel-wood)]">Mesure Cible : {inspecteurCurrentMeasure + 1} / {inspecteurTotalMeasures}</span>
          <button
            onClick={() => setInspecteurCurrentMeasure(prev => Math.min(inspecteurTotalMeasures - 1, prev + 1))}
            disabled={inspecteurCurrentMeasure === inspecteurTotalMeasures - 1}
            className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
          >
            &gt;
          </button>
        </div>
      )}

      {/* Sequencers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sequencer 1: Perfect accompanying pattern */}
        <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center">
          <span className="font-cactus text-sm font-bold text-blue-700 uppercase">
            🎵 1. Piste d'Accompagnement (Playback)
          </span>
          <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
            <CircleSequencer
              lang={lang}
              tracks={inspecteurPerfectTracks}
              isPlaying={studioPlaying}
              currentMeasure={inspecteurCurrentMeasure}
              maxTicks={16}
              timeSig="4/4"
              totalMeasures={inspecteurTotalMeasures}
              onTogglePlay={() => setStudioPlaying(!studioPlaying)}
              onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                handleStepChangeGeneric(inspecteurPerfectTracks, setInspecteurPerfectTracks, trId, ptId, stIdx, nSt, lyr, nt);
              }}
              langPromptVoiceText=""
              activePatternIdByTrack={getActivePatternMap(inspecteurPerfectTracks)}
              bpm={inspecteurBpm}
              measureBpms={[inspecteurBpm]}
              measureVols={[80]}
              isMobile={true}
            />
          </div>
        </div>

        {/* Sequencer 2: Sabotaged track (guilty instrument only) */}
        <div className="border-2 border-red-500/80 p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center relative shadow-[0_0_8px_rgba(239,68,68,0.2)]">
          <span className="font-cactus text-sm font-bold text-red-600 uppercase">
            😈 2. Piste Sabotée (Uniquement le coupable)
          </span>
          <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
            <CircleSequencer
              lang={lang}
              tracks={inspecteurSabotagedTracks}
              isPlaying={studioPlaying}
              currentMeasure={inspecteurCurrentMeasure}
              maxTicks={16}
              timeSig="4/4"
              totalMeasures={inspecteurTotalMeasures}
              onTogglePlay={() => setStudioPlaying(!studioPlaying)}
              onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                handleStepChangeGeneric(inspecteurSabotagedTracks, setInspecteurSabotagedTracks, trId, ptId, stIdx, nSt, lyr, nt);
              }}
              langPromptVoiceText=""
              activePatternIdByTrack={getActivePatternMap(inspecteurSabotagedTracks)}
              bpm={inspecteurBpm}
              measureBpms={[inspecteurBpm]}
              measureVols={[80]}
              isMobile={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
