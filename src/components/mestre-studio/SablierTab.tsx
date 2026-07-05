import React from 'react';
import { Language } from '../../types';

interface SablierTabProps {
  lang: Language;
  sablierCordeCible: number;
  setSablierCordeCible: (val: number) => void;
  sablierTitle: string;
  setSablierTitle: (val: string) => void;
  sablierMeasures: 1 | 2;
  setSablierMeasures: (val: 1 | 2) => void;
  sablierBpm: number;
  setSablierBpm: (val: number) => void;
  
  sablierSeqFondName: string;
  sablierSeqCibleName: string;
  sablierSeqPiege1Name: string;
  sablierSeqPiege2Name: string;
  sablierSeqPiege3Name: string;
  
  sablierHandImageType: 'url' | 'upload';
  setSablierHandImageType: (val: 'url' | 'upload') => void;
  sablierHandImageUrl: string;
  setSablierHandImageUrl: (val: string) => void;
  sablierHandImageFile: string;
  handleSablierImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  handleLoadSablierSequence: (e: React.ChangeEvent<HTMLInputElement>, type: 'fond' | 'cible' | 'piege1' | 'piege2' | 'piege3') => void;
  handleLoadDraft: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleLoadPresetToGame: (presetName: string, gameType: 'dictee' | 'inspecteur' | 'rythmelive' | 'sablier_mestre') => void;
  presetFiles: string[];
  localPresets: string[];
}

export const SablierTab: React.FC<SablierTabProps> = ({
  lang,
  sablierCordeCible,
  setSablierCordeCible,
  sablierTitle,
  setSablierTitle,
  sablierMeasures,
  setSablierMeasures,
  sablierBpm,
  setSablierBpm,
  sablierSeqFondName,
  sablierSeqCibleName,
  sablierSeqPiege1Name,
  sablierSeqPiege2Name,
  sablierSeqPiege3Name,
  sablierHandImageType,
  setSablierHandImageType,
  sablierHandImageUrl,
  setSablierHandImageUrl,
  sablierHandImageFile,
  handleSablierImageUpload,
  handleLoadSablierSequence,
  handleLoadDraft,
  handleLoadPresetToGame,
  presetFiles,
  localPresets,
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>📂 Charger un exercice pour le modifier (.json)</span>
          <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'sablier_mestre')} className="text-[10px] cursor-pointer" />
        </label>
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>🎵 Charger la Roda depuis un Preset</span>
          <select 
            onChange={(e) => {
              handleLoadPresetToGame(e.target.value, 'sablier_mestre');
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
          Configuration du Sablier
        </span>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
            <select
              value={sablierCordeCible}
              onChange={(e) => setSablierCordeCible(Number(e.target.value))}
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
              value={sablierTitle}
              onChange={(e) => setSablierTitle(e.target.value)}
              placeholder="Ex: Le Sablier du Mestre"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Durée du Sablier (Mesures)</label>
            <select
              value={sablierMeasures}
              onChange={(e) => setSablierMeasures(Number(e.target.value) as 1 | 2)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            >
              <option value={1}>1 Mesure</option>
              <option value={2}>2 Mesures (Standard)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo BPM</label>
            <input
              type="number"
              value={sablierBpm}
              min={50}
              max={200}
              onChange={(e) => setSablierBpm(Math.max(50, Math.min(200, Number(e.target.value) || 83)))}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
        </div>
      </div>

      {/* Mestre Sign/Image selection */}
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2 flex flex-col gap-3">
          <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
            Signe Gestuel du Mestre (Image)
          </span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer">
              <input
                type="radio"
                checked={sablierHandImageType === 'url'}
                onChange={() => setSablierHandImageType('url')}
                className="accent-[var(--cordel-wood)]"
              />
              URL de l'image
            </label>
            <label className="flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer">
              <input
                type="radio"
                checked={sablierHandImageType === 'upload'}
                onChange={() => setSablierHandImageType('upload')}
                className="accent-[var(--cordel-wood)]"
              />
              Upload Fichier
            </label>
          </div>
          {sablierHandImageType === 'url' ? (
            <input
              type="text"
              value={sablierHandImageUrl}
              onChange={(e) => setSablierHandImageUrl(e.target.value)}
              placeholder="https://exemple.com/signe.jpg"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs focus:outline-none w-full"
            />
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleSablierImageUpload}
              className="text-xs font-bold text-[var(--cordel-text)] cursor-pointer"
            />
          )}
        </div>
        <div className="flex flex-col items-center justify-center border-2 border-[var(--cordel-border)] p-2 bg-white text-black min-h-[100px] rounded">
          <span className="text-[8px] font-bold uppercase text-gray-400 mb-1">Aperçu Xilo</span>
          {(sablierHandImageType === 'url' ? sablierHandImageUrl : sablierHandImageFile) ? (
            <img
              src={sablierHandImageType === 'url' ? sablierHandImageUrl : sablierHandImageFile}
              alt="mestre sign preview"
              style={{ filter: 'contrast(300%) grayscale(100%)' }}
              className="max-h-[70px] object-contain border border-black p-0.5"
            />
          ) : (
            <span className="text-[9px] text-gray-300">Aucun signe</span>
          )}
        </div>
      </div>

      {/* Roda Base & Target Sequence Import */}
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
        <span className="font-cactus text-base font-bold text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
          Partitions de la Roda (Fond + Cible)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Base Accompagnement (Fond) */}
          <div className="flex flex-col gap-2 p-3 border border-[var(--cordel-border)]/30 bg-[var(--cordel-bg)]/20 rounded">
             <span className="text-xs font-bold text-blue-900 uppercase text-center">1. Base Accompagnement (Fond)</span>
             <p className="text-[9px] text-[var(--cordel-text)]/60 text-center mb-2">Partition jouée par le reste de la Roda pour accompagner l'élève.</p>
             <label className="text-[10px] font-bold bg-[var(--cordel-wood)] text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
               Importer JSON
               <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'fond')} />
             </label>
             {sablierSeqFondName && <span className="text-[10px] font-bold text-[var(--cordel-text)] text-center">✓ {sablierSeqFondName}</span>}
          </div>

          {/* Sequence to play (Cible) */}
          <div className="flex flex-col gap-2 p-3 border border-[var(--cordel-border)]/30 bg-[var(--cordel-bg)]/20 rounded">
             <span className="text-xs font-bold text-green-900 uppercase text-center">2. Phrase Cible (À Reproduire)</span>
             <p className="text-[9px] text-[var(--cordel-text)]/60 text-center mb-2">Partition exacte que l'élève devra rejouer avant la fin du sablier.</p>
             <label className="text-[10px] font-bold bg-green-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
               Importer JSON
               <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'cible')} />
             </label>
             {sablierSeqCibleName && <span className="text-[10px] font-bold text-green-800 text-center">✓ {sablierSeqCibleName}</span>}
          </div>
        </div>
      </div>

      {/* Traps (Errors) Sequences */}
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 mt-2">
        <span className="font-cactus text-base font-bold text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
          Séquences Pièges (Erreurs)
        </span>
        <p className="text-[10px] text-[var(--cordel-text)]/70">Chargez les 3 JSON contenant les mauvaises réponses qui s'afficheront à l'élève pour le piéger.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
             <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 1</span>
             <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
               Importer JSON
               <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege1')} />
             </label>
             {sablierSeqPiege1Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege1Name}</span>}
          </div>
          
          <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
             <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 2</span>
             <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
               Importer JSON
               <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege2')} />
             </label>
             {sablierSeqPiege2Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege2Name}</span>}
          </div>

          <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
             <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 3</span>
             <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
               Importer JSON
               <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege3')} />
             </label>
             {sablierSeqPiege3Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege3Name}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
