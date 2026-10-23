import React, { useState } from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { CordelImageEditor } from '../CordelImageEditor';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { Language, RhythmSignal } from '../../types';
import { CordelOptions } from '../../utils/cordelEffect';
import { t } from './wizardConstants';
import { WizardStep2Foundation } from './WizardStep2Foundation';
import { WizardStep2Tuning } from './WizardStep2Tuning';
import { WizardStep2Balanco } from './WizardStep2Balanco';
import { WizardStep2Signs } from './WizardStep2Signs';
import { WizardStep2SongInfo } from './WizardStep2SongInfo';

interface WizardStep2IdentityProps {
  wizardLang: Language;
  onBack: () => void;
  onToggleLang: () => void;
  onGenerate: () => void;
  onSaveCustomSignal: (signal: RhythmSignal) => void;
}

export const WizardStep2Identity: React.FC<WizardStep2IdentityProps> = ({
  wizardLang,
  onBack,
  onToggleLang,
  onGenerate,
  onSaveCustomSignal,
}) => {
  const bpm = useWizardStore((state) => state.bpm);
  const toggleSignId = useWizardStore((state) => state.toggleSignId);

  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);

  const handlePhotoBoothSave = (signalData: {
    name: string;
    image: string;
    frames: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number;
    mirrorHorizontal?: boolean;
  }) => {
    toggleSignId(signalData.image);
    onSaveCustomSignal({
      id: signalData.image,
      name: signalData.name,
      image: signalData.image,
      frames: signalData.frames,
      rawFrames: signalData.rawFrames,
      cordelOptions: signalData.cordelOptions,
      frameOverrides: signalData.frameOverrides,
      beatsCount: signalData.beatsCount,
      mirrorHorizontal: signalData.mirrorHorizontal,
    });
    setIsPhotoBoothOpen(false);
  };

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setRawSignalFrames([base64]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-[#f4ecd8] z-[200] flex flex-col p-4 md:p-8 select-none font-sans overflow-y-auto">
      {rawSignalFrames.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-4 max-w-sm w-full rounded-sm shadow-[8px_8px_0_rgba(0,0,0,1)]">
            <CordelImageEditor
              frames={rawSignalFrames}
              lang={wizardLang}
              onComplete={(result) => {
                toggleSignId(result);
                setRawSignalFrames([]);
              }}
              onCancel={() => setRawSignalFrames([])}
            />
          </div>
        </div>
      )}

      <MusicalPhotoBoothModal
        isOpen={isPhotoBoothOpen}
        onClose={() => setIsPhotoBoothOpen(false)}
        onSave={handlePhotoBoothSave}
        initialBpm={bpm}
        lang={wizardLang}
      />

      <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3 mb-6 flex-shrink-0">
        <div>
          <h2 className="font-cactus text-2xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider leading-none">
            {t[wizardLang].title}
          </h2>
          <p className="text-[#1a1a1a]/70 text-[10px] md:text-xs mt-1 font-cactus font-bold tracking-wide uppercase">
            {t[wizardLang].step2Sub}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 bg-[#ece4d0] hover:bg-[#e2d7be] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] md:text-xs shrink-0 flex items-center gap-1.5 text-[#1a1a1a]"
          >
            {wizardLang === 'fr' ? 'BR' : 'FR'}
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs"
          >
            {t[wizardLang].retour}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 max-w-2xl mx-auto w-full pb-8">
        <WizardStep2Foundation wizardLang={wizardLang} />
        <WizardStep2Tuning wizardLang={wizardLang} />
        <WizardStep2Balanco wizardLang={wizardLang} />
        <WizardStep2Signs wizardLang={wizardLang} onOpenPhotoBooth={() => setIsPhotoBoothOpen(true)} onSignalFileChange={handleSignalFileChange} />
        <WizardStep2SongInfo wizardLang={wizardLang} onGenerate={onGenerate} />
      </div>
    </div>
  );
};
