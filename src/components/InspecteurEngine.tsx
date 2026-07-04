import React from 'react';
import { Play, Square, ShieldAlert, Check, X, ArrowLeft } from 'lucide-react';
import { useInspecteurGame } from '../hooks/useInspecteurGame';

interface InspecteurEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

interface Suspect {
  id: string;
  name: { fr: string; pt: string };
  icon: string;
}

const suspects: Suspect[] = [
  { id: 'alfaia', name: { fr: 'Alfaia la Lourde', pt: 'Alfaia a Pesada' }, icon: 'icones/alfaia.svg' },
  { id: 'caixa', name: { fr: 'Caixa la Tremblante', pt: 'Caixa a Trêmula' }, icon: 'icones/caixa.svg' },
  { id: 'gongue', name: { fr: 'Gonguê le Métallique', pt: 'Gonguê o Metálico' }, icon: 'icones/gongue.svg' },
  { id: 'agbe', name: { fr: 'Agbê la Perlée', pt: 'Agbê a Perlada' }, icon: 'icones/agbe.svg' }
];

export const InspecteurEngine: React.FC<InspecteurEngineProps> = ({
  lang,
  onExit,
  onSuccess,
  exerciseData
}) => {
  const {
    isPlaying,
    selectedSuspect,
    selectedMeasures,
    validationResult,
    isResolving,
    loopStart,
    loopEnd,
    guiltyInstStr,
    setSelectedSuspect,
    setValidationResult,
    togglePlayback,
    handleValidate,
    toggleMeasure,
  } = useInspecteurGame({ onSuccess, exerciseData });

  return (
    <div className="w-full h-full overflow-y-auto cordel-bg select-none font-sans flex flex-col p-4 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-4 mb-6 relative">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'fr' ? 'Retour' : 'Voltar'}
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="font-cactus text-3xl uppercase tracking-wider text-[var(--cordel-text)] font-extrabold flex items-center gap-2">
            <ShieldAlert className="w-8 h-8" />
            {exerciseData?.folheto_titre || "L'Inspecteur"}
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full max-w-6xl mx-auto w-full">
        {/* Left Column: Player & Context */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] p-6 cordel-border flex flex-col items-center justify-center gap-4 text-center">
            <ShieldAlert className="w-16 h-16 text-[var(--cordel-wood)] mb-2" />
            <h3 className="font-cactus text-xl font-bold text-[var(--cordel-wood)]">
              {lang === 'fr' ? "Écoutez la Boucle" : "Ouça o Loop"}
            </h3>
            <p className="text-sm font-semibold text-[var(--cordel-text)] opacity-80 italic">
              {exerciseData?.description || "Un intrus a saboté cette séquence. Trouvez l'erreur !"}
            </p>

            <div className="flex gap-4 mt-4">
              <button
                onClick={togglePlayback}
                disabled={isResolving}
                className={`w-16 h-16 flex items-center justify-center rounded-full border-4 border-[var(--cordel-border)] font-bold text-xl cordel-button transition-colors ${
                  isPlaying 
                    ? 'bg-[var(--cordel-wood)] text-white' 
                    : 'bg-[#fdfaf2] text-[var(--cordel-wood)] hover:bg-[var(--cordel-wood)] hover:text-white'
                } ${isResolving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
            </div>
            
            <div className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--cordel-text)]/60">
              Boucle : Mesure {loopStart + 1} à {loopEnd + 1}
            </div>
          </div>
        </div>

        {/* Right Column: Investigation Form */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <div className="border-2 border-[var(--cordel-border)] p-6 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-6">
            
            {/* Step 1: Instrument */}
            <div className="flex flex-col gap-3">
              <h3 className="font-cactus text-lg font-bold text-[var(--cordel-wood)] border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
                1. {lang === 'fr' ? 'Qui est le coupable ?' : 'Quem é o culpado?'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {suspects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!isResolving && validationResult !== 'success') {
                        setSelectedSuspect(s.id);
                        setValidationResult(null);
                      }
                    }}
                    className={`border-2 p-3 flex flex-col items-center justify-center gap-2 rounded transition-all ${
                      selectedSuspect === s.id 
                        ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 scale-105 shadow-md' 
                        : 'border-[var(--cordel-border)]/40 hover:bg-black/5'
                    }`}
                  >
                    <img src={`/${s.icon}`} alt={s.name[lang]} className="w-10 h-10 opacity-80" />
                    <span className="text-[10px] font-bold uppercase text-center">{s.name[lang]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Measures */}
            <div className="flex flex-col gap-3">
              <h3 className="font-cactus text-lg font-bold text-[var(--cordel-wood)] border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
                2. {lang === 'fr' ? "Où est l'erreur ?" : 'Onde está o erro?'}
              </h3>
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: loopEnd - loopStart + 1 }, (_, i) => loopStart + i).map(m => (
                  <label key={m} className={`flex items-center gap-2 border-2 px-4 py-2 rounded cursor-pointer transition-all ${
                    selectedMeasures.includes(m) 
                      ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10' 
                      : 'border-[var(--cordel-border)]/40 hover:bg-black/5'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedMeasures.includes(m)}
                      onChange={() => {
                        if (!isResolving && validationResult !== 'success') {
                          toggleMeasure(m);
                          setValidationResult(null);
                        }
                      }}
                    />
                    <span className="text-xs font-bold uppercase">Mesure {m + 1}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 3: Validate */}
            <div className="flex flex-col items-center mt-4">
              <button
                onClick={handleValidate}
                disabled={!selectedSuspect || selectedMeasures.length === 0 || validationResult === 'success'}
                className="w-full md:w-auto px-10 py-4 bg-[var(--cordel-wood)] text-[#fdfaf2] font-cactus text-lg font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {lang === 'fr' ? "Résoudre l'Enquête" : 'Resolver a Investigação'}
                <Check className="w-5 h-5" />
              </button>
              
              {/* Feedback */}
              {validationResult === 'failure' && (
                <div className="mt-4 p-4 border-2 border-red-500 bg-red-50 text-red-700 font-bold text-sm w-full text-center rounded flex items-center justify-center gap-2">
                  <X className="w-5 h-5" />
                  {lang === 'fr' ? 'Mauvaise déduction ! Punition !' : 'Dedução errada! Punição!'}
                </div>
              )}
              {validationResult === 'success' && (
                <div className="mt-4 p-4 border-2 border-green-500 bg-green-50 text-green-700 font-bold text-sm w-full text-center rounded flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  {lang === 'fr' ? 'Enquête Résolue ! La Roda saine reprend...' : 'Investigação Resolvida!'}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
