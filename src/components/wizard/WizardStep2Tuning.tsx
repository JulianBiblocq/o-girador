import React from 'react';
import * as Tone from 'tone';
import { useWizardStore } from '../../stores/useWizardStore';
import { PercussionTuningControl } from '../PercussionTuningControl';
import { audioEngine } from '../../hooks/useAudioSync';
import { AVAILABLE_INSTRUMENTS, t } from './wizardConstants';
import { Language } from '../../types';

interface WizardStep2TuningProps {
  wizardLang: Language;
}

export const WizardStep2Tuning: React.FC<WizardStep2TuningProps> = ({ wizardLang }) => {
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const alfaiaGroupingMode = useWizardStore((state) => state.alfaiaGroupingMode);
  const setAlfaiaGroupingMode = useWizardStore((state) => state.setAlfaiaGroupingMode);
  const instrumentTunings = useWizardStore((state) => state.instrumentTunings);
  const setInstrumentTuning = useWizardStore((state) => state.setInstrumentTuning);

  const hasPlacedAlfaias = placedInstruments.some(
    (i) => i.instrumentType === 'marcante' || i.instrumentType === 'meiao' || i.instrumentType === 'repique'
  );

  const handlePreviewDrum = (instrumentType: string) => {
    if (!audioEngine) return;
    const strokeSymbol = instrumentType === 'timbal' ? 'A' : 'D';
    const pitch = instrumentTunings[instrumentType] || 0;
    audioEngine.playPreview(instrumentType, strokeSymbol, pitch, 1.0);
  };

  const handlePreviewTrioAlfaias = () => {
    if (!audioEngine) return;
    const now = Tone.now();
    const alfaiasToPlay = ['marcante', 'meiao', 'repique'].filter((type) =>
      placedInstruments.some((i) => i.instrumentType === type)
    );
    alfaiasToPlay.forEach((type, idx) => {
      const pitch = instrumentTunings[type] || 0;
      audioEngine?.playPreview(type, 'D', pitch, 0.8, now + idx * 0.02);
    });
  };

  const handlePreviewCaixasSection = () => {
    if (!audioEngine) return;
    const now = Tone.now();
    const caixasToPlay = ['caixa', 'tarol'].filter((type) =>
      placedInstruments.some((i) => i.instrumentType === type)
    );
    caixasToPlay.forEach((type, idx) => {
      const pitch = instrumentTunings[type] || 0;
      audioEngine?.playPreview(type, 'D', pitch, 0.8, now + idx * 0.02);
    });
  };

  return (
    <>
      {hasPlacedAlfaias && (
        <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-3 rounded-sm">
          <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
            {t[wizardLang].jeuAlfaias}
          </h3>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] md:text-xs text-[#1a1a1a] font-cactus font-bold uppercase">
              {t[wizardLang].commentAlfaias}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => setAlfaiaGroupingMode('bloc')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] ${
                  alfaiaGroupingMode === 'bloc' ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].enBloc}</div>
                <div className={`text-[8px] leading-tight mt-1 ${alfaiaGroupingMode === 'bloc' ? 'text-[#f4ecd8]/70' : 'text-[#1a1a1a]/60'}`}>
                  {t[wizardLang].enBlocDesc}
                </div>
              </button>
              <button
                onClick={() => setAlfaiaGroupingMode('distinct')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] ${
                  alfaiaGroupingMode === 'distinct' ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].phrasesDistinctes}</div>
                <div className={`text-[8px] leading-tight mt-1 ${alfaiaGroupingMode === 'distinct' ? 'text-[#f4ecd8]/70' : 'text-[#1a1a1a]/60'}`}>
                  {t[wizardLang].phrasesDistinctesDesc}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {placedInstruments.some((i) => ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'].includes(i.instrumentType)) && (
        <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#1a1a1a]/20 pb-2">
            <div>
              <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider">{t[wizardLang].afinacaoTitle}</h3>
              <p className="text-[10px] md:text-xs text-[#1a1a1a]/70">{t[wizardLang].afinacaoDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasPlacedAlfaias && (
                <button type="button" onClick={handlePreviewTrioAlfaias} className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-[10px] md:text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all">
                  {t[wizardLang].ecouterTrio}
                </button>
              )}
              {placedInstruments.some((i) => ['caixa', 'tarol'].includes(i.instrumentType)) && (
                <button type="button" onClick={handlePreviewCaixasSection} className="px-3 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-[10px] md:text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all">
                  {t[wizardLang].ecouterCaixas}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
            {['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal']
              .filter((type) => placedInstruments.some((i) => i.instrumentType === type))
              .map((type) => (
                <div key={type} className="w-full">
                  <PercussionTuningControl
                    instrumentId={type}
                    tuning={instrumentTunings[type] || 0}
                    onChange={(semitones) => setInstrumentTuning(type, semitones)}
                    title={AVAILABLE_INSTRUMENTS.find((inst) => inst.id === type)?.label || type}
                    onPreview={() => handlePreviewDrum(type)}
                    showPreviewButton={true}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
};
