import React from 'react';
import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';

const CircleSequencer = React.lazy(() => import('../CircleSequencer').then(m => ({ default: m.CircleSequencer })));

interface DicteeTabProps {
  lang: Language;
  dicteeCordeCible: number;
  setDicteeCordeCible: (val: number) => void;
  dicteeTitle: string;
  setDicteeTitle: (val: string) => void;
  dicteeRewardVideoUrl: string;
  setDicteeRewardVideoUrl: (val: string) => void;
  dicteeTargetInstrumentId: string;
  setDicteeTargetInstrumentId: (val: string) => void;
  dicteeTracks: TrackGroup[];
  setDicteeTracks: React.Dispatch<React.SetStateAction<TrackGroup[]>>;
  dicteeTotalMeasures: number;
  setDicteeTotalMeasures: (val: number) => void;
  dicteeBpm: number;
  setDicteeBpm: (val: number) => void;
  dicteeBlocksCount: number;
  setDicteeBlocksCount: (val: 4 | 8 | 16) => void;
  dicteeMeasureIndex: number;
  setDicteeMeasureIndex: React.Dispatch<React.SetStateAction<number>>;
  
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

export const DicteeTab: React.FC<DicteeTabProps> = ({
  lang,
  dicteeCordeCible,
  setDicteeCordeCible,
  dicteeTitle,
  setDicteeTitle,
  dicteeRewardVideoUrl,
  setDicteeRewardVideoUrl,
  dicteeTargetInstrumentId,
  setDicteeTargetInstrumentId,
  dicteeTracks,
  setDicteeTracks,
  dicteeTotalMeasures,
  setDicteeTotalMeasures,
  dicteeBpm,
  setDicteeBpm,
  dicteeBlocksCount,
  setDicteeBlocksCount,
  dicteeMeasureIndex,
  setDicteeMeasureIndex,
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
          <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'dictee')} className="text-[10px] cursor-pointer" />
        </label>
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>🎵 Charger une piste depuis un Preset</span>
          <select 
            onChange={(e) => {
              handleLoadPresetToGame(e.target.value, 'dictee');
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
          Paramètres du Défi
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
            <select
              value={dicteeCordeCible}
              onChange={(e) => setDicteeCordeCible(Number(e.target.value))}
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
              value={dicteeTitle}
              onChange={(e) => setDicteeTitle(e.target.value)}
              placeholder="Ex: Le Rythme du Maracatu"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Lien Vidéo de Récompense (YouTube)</label>
            <input
              type="text"
              value={dicteeRewardVideoUrl}
              onChange={(e) => setDicteeRewardVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Cible</label>
            <select
              value={dicteeTargetInstrumentId}
              onChange={(e) => setDicteeTargetInstrumentId(e.target.value)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full border-[var(--cordel-wood)] border-2"
            >
              <option value="">Sélectionner...</option>
              {dicteeTracks.filter(t => !t.isMute && t.instrumentIdx !== -1).map(t => {
                 const instName = instrumentsConfig[t.instrumentIdx]?.name || `Inst ${t.instrumentIdx}`;
                 return <option key={t.id} value={t.id}>{instName}</option>
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Total Mesures (Preset)</label>
            <select
              value={dicteeTotalMeasures}
              onChange={(e) => setDicteeTotalMeasures(Number(e.target.value))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              {[1,2,3,4,8,16].map(n => <option key={n} value={n}>{n} Mesure{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo (BPM)</label>
            <input
              type="number"
              value={dicteeBpm}
              onChange={(e) => setDicteeBpm(Number(e.target.value) || 83)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Découpage</label>
            <select
              value={dicteeBlocksCount}
              onChange={(e) => setDicteeBlocksCount(Number(e.target.value) as 4 | 8 | 16)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              <option value={4}>4 Blocs (Standard)</option>
              <option value={8}>8 Blocs (Expert)</option>
              <option value={16}>16 Pas Vides (Saisie Clavier)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pagination for Dictée */}
      {dicteeTotalMeasures > 1 && (
        <div className="flex justify-center items-center gap-4 py-2 bg-[var(--cordel-bg)] border-y border-dashed border-[var(--cordel-border)]/30 mt-4 mb-2">
          <button
            onClick={() => setDicteeMeasureIndex(prev => Math.max(0, prev - 1))}
            disabled={dicteeMeasureIndex === 0}
            className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
          >
            &lt;
          </button>
          <span className="font-cactus font-bold text-lg text-[var(--cordel-wood)]">Mesure Cible : {dicteeMeasureIndex + 1} / {dicteeTotalMeasures}</span>
          <button
            onClick={() => setDicteeMeasureIndex(prev => Math.min(dicteeTotalMeasures - 1, prev + 1))}
            disabled={dicteeMeasureIndex === dicteeTotalMeasures - 1}
            className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
          >
            &gt;
          </button>
        </div>
      )}

      {/* Roda Sequencer for Audio Target */}
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 items-center mt-4">
        <span className="font-cactus text-base font-bold text-[var(--cordel-wood)] text-center">
          Séquence Audio<br/><span className="text-sm font-normal">La mesure sélectionnée sera automatiquement découpée en blocs.</span>
        </span>
        <div className="w-full max-w-[500px] py-4 bg-[var(--cordel-bg)]/25 rounded flex items-center justify-center">
          <CircleSequencer
            lang={lang}
            tracks={dicteeTracks}
            isPlaying={studioPlaying}
            currentMeasure={dicteeMeasureIndex}
            maxTicks={16}
            timeSig="4/4"
            totalMeasures={dicteeTotalMeasures}
            onTogglePlay={() => setStudioPlaying(!studioPlaying)}
            onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
              handleStepChangeGeneric(dicteeTracks, setDicteeTracks, trId, ptId, stIdx, nSt, lyr, nt);
            }}
            langPromptVoiceText=""
            activePatternIdByTrack={getActivePatternMap(dicteeTracks)}
            bpm={dicteeBpm}
            measureBpms={[dicteeBpm]}
            measureVols={[80]}
            isMobile={typeof window !== 'undefined' ? window.innerWidth <= 768 : true}
          />
        </div>
      </div>
    </div>
  );
};
