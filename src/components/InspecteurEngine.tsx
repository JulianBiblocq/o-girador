import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Square, ShieldAlert, Award, ArrowLeft, Check, X, ArrowRight } from 'lucide-react';
import { audioEngine } from '../hooks/useAudioSync';

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

const getInstrumentNameFromIdx = (idx: number) => {
  if (idx === 0) return 'alfaia';
  if (idx === 3) return 'caixa';
  if (idx === 5) return 'gongue';
  if (idx === 6) return 'agbe';
  return 'caixa'; // fallback
};

export const InspecteurEngine: React.FC<InspecteurEngineProps> = ({
  lang,
  onExit,
  onSuccess,
  exerciseData
}) => {
  // Parse Data
  const perfectAudio = exerciseData?.partition_parfaite || [];
  const sabotagedAudio = exerciseData?.piste_sabotee || [];
  const guiltyInstStr = exerciseData?.instrument_coupable || 'caixa';
  const loopStart = exerciseData?.loop_start || 0;
  const loopEnd = exerciseData?.loop_end || 0;
  const bpm = exerciseData?.bpm || 83;
  const totalMeasures = perfectAudio.length > 0 ? Math.max(...perfectAudio.map((t: any) => t.patterns?.length || 1)) : 1;

  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [selectedMeasures, setSelectedMeasures] = useState<number[]>([]);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Compute actual guilty measures
  const actualGuiltyMeasures = useMemo(() => {
    const guiltyMeasures: number[] = [];
    const perfTrack = perfectAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
    const sabTrack = sabotagedAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
    if (!perfTrack || !sabTrack) return [];
    
    for (let m = loopStart; m <= loopEnd; m++) {
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        const p = perfTrack.patterns[m]?.activeSteps?.[i];
        const s = sabTrack.patterns[m]?.activeSteps?.[i];
        const pNorm = (p === 0 || p === "0") ? null : p;
        const sNorm = (s === 0 || s === "0") ? null : s;
        if (pNorm !== sNorm) {
          isDifferent = true;
          break;
        }
      }
      if (isDifferent) guiltyMeasures.push(m);
    }
    return guiltyMeasures;
  }, [perfectAudio, sabotagedAudio, guiltyInstStr, loopStart, loopEnd]);

  const scheduleTracks = (tracks: any[]) => {
    tracks.forEach(track => {
      if (track.isMute) return;
      const patterns = track.patterns || [];
      const instName = getInstrumentNameFromIdx(track.instrumentIdx);
      
      patterns.forEach((pattern: any, m: number) => {
        const steps = pattern.activeSteps || [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (step !== 0 && step !== '0' && step !== null) {
            const beat = Math.floor(i / 4);
            const sixteenth = i % 4;
            const timeStr = `${m}:${beat}:${sixteenth}`;
            
            Tone.Transport.schedule((time) => {
              audioEngine.playNote(instName, step, time, 1.0, 1.0);
            }, timeStr);
          }
        }
      });
    });
  };

  const playInvestigation = () => {
    Tone.Transport.cancel();
    Tone.Transport.stop();
    
    // Mix perfect and sabotaged
    const mixedTracks = perfectAudio.map((track: any) => {
      if (getInstrumentNameFromIdx(track.instrumentIdx) === guiltyInstStr) {
        const sabTrack = sabotagedAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
        return sabTrack || track;
      }
      return track;
    });
    
    scheduleTracks(mixedTracks);
    
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.setLoopPoints(`${loopStart}:0:0`, `${loopEnd + 1}:0:0`);
    Tone.Transport.loop = true;
    
    // Resume context if suspended
    if (Tone.context.state !== 'running') {
      Tone.context.resume();
    }
    
    Tone.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, `${loopStart}:0:0`);
    setIsPlaying(true);
  };

  const playResolution = () => {
    Tone.Transport.cancel();
    Tone.Transport.stop();
    
    scheduleTracks(perfectAudio);
    
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.loop = false;
    
    if (Tone.context.state !== 'running') {
      Tone.context.resume();
    }
    
    Tone.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setIsPlaying(true);
    setIsResolving(true);
    
    // Wait until total measures finish
    const durationSec = (totalMeasures * 4 * 60) / bpm;
    setTimeout(() => {
      Tone.Transport.stop();
      setIsPlaying(false);
      onSuccess?.();
    }, durationSec * 1000 + 500);
  };

  const playFatras = async () => {
    Tone.Transport.cancel();
    Tone.Transport.stop();
    
    try {
      const res = await fetch('/presets/fatras.json');
      const fatras = await res.json();
      
      scheduleTracks(fatras.tracks);
      
      Tone.Transport.bpm.value = fatras.bpm || 150;
      Tone.Transport.loop = false;
      
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
      
      Tone.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
      setIsPlaying(true);
      
      const measures = fatras.totalMeasures || 1;
      const durationSec = (measures * 4 * 60) / Tone.Transport.bpm.value;
      setTimeout(() => {
        Tone.Transport.stop();
        setIsPlaying(false);
      }, durationSec * 1000 + 500);
    } catch (err) {
      console.error("Fatras error:", err);
      // Fallback
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      playInvestigation();
    }
  };

  const stopPlayback = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
    };
  }, []);

  const handleValidate = () => {
    if (validationResult === 'success') return; // Already won

    const isInstCorrect = selectedSuspect === guiltyInstStr;
    const isMeasuresCorrect = 
      selectedMeasures.length === actualGuiltyMeasures.length &&
      selectedMeasures.every(m => actualGuiltyMeasures.includes(m));

    if (isInstCorrect && isMeasuresCorrect) {
       setValidationResult('success');
       playResolution();
    } else {
       setValidationResult('failure');
       playFatras();
    }
  };

  const toggleMeasure = (m: number) => {
    if (selectedMeasures.includes(m)) {
      setSelectedMeasures(selectedMeasures.filter(x => x !== m));
    } else {
      setSelectedMeasures([...selectedMeasures, m]);
    }
  };

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
