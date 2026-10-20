import React, { useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { CloudRhythmSignal } from '../../types';
import { SettingsSignalThumb } from './SettingsSignalThumb';

interface SettingsSignalsTabProps {
  lang: string;
  mestreSignals?: CloudRhythmSignal[];
}

export const SettingsSignalsTab: React.FC<SettingsSignalsTabProps> = ({
  lang,
  mestreSignals = [],
}) => {
  const localRhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals || []);
  const enabledSignalIds = useSequencerSettingsStore((state) => state.enabledSignalIds);
  const toggleSignalEnabled = useSequencerSettingsStore((state) => state.toggleSignalEnabled);
  const setSignalsBatch = useSequencerSettingsStore((state) => state.setSignalsBatch);

  const rhythmSignals = useMemo(() => {
    return [
      ...mestreSignals.map((s) => {
        const resolvedImage = s.frames?.[0]?.startsWith('data:')
          ? s.frames[0]
          : s.image?.startsWith('data:')
          ? s.image
          : s.imageUrl?.startsWith('data:')
          ? s.imageUrl
          : s.image || s.imageUrl || '';
        return { id: s.id, name: s.name, image: resolvedImage, isCloud: true };
      }),
      ...localRhythmSignals.map((s) => {
        const resolvedImage = s.frames?.[0]?.startsWith('data:')
          ? s.frames[0]
          : s.image?.startsWith('data:')
          ? s.image
          : s.image || '';
        return { id: s.id, name: s.name, image: resolvedImage, isCloud: false };
      }),
    ];
  }, [mestreSignals, localRhythmSignals]);

  const allSignalIds = useMemo(() => rhythmSignals.map((s) => s.id), [rhythmSignals]);

  return (
    <div className="flex flex-col gap-4 text-left">
      <p className="text-[10px] opacity-75">
        {lang === 'pt'
          ? 'Selecione os sinais que aparecerão no catálogo de sinais para os músicos.'
          : 'Sélectionnez les signaux qui apparaîtront dans le catalogue de signaux des musiciens.'}
      </p>

      {rhythmSignals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-2 border-black p-3 bg-[#eaddcf]/30 mb-2">
          <div className="flex flex-col gap-2">
            <span className="font-bold text-[10px] uppercase text-black/60">
              🌐 {lang === 'fr' ? 'Signaux Cloud' : 'Sinais Cloud'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const cloudIds = rhythmSignals.filter((s) => s.isCloud).map((s) => s.id);
                  setSignalsBatch(cloudIds, true, allSignalIds);
                }}
                className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
              >
                {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
              </button>
              <button
                onClick={() => {
                  const cloudIds = rhythmSignals.filter((s) => s.isCloud).map((s) => s.id);
                  setSignalsBatch(cloudIds, false, allSignalIds);
                }}
                className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-[#8b2a1a] hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
              >
                {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-bold text-[10px] uppercase text-black/60">
              💻 {lang === 'fr' ? 'Signaux Locaux' : 'Sinais Locais'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const localIds = rhythmSignals.filter((s) => !s.isCloud).map((s) => s.id);
                  setSignalsBatch(localIds, true, allSignalIds);
                }}
                className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
              >
                {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
              </button>
              <button
                onClick={() => {
                  const localIds = rhythmSignals.filter((s) => !s.isCloud).map((s) => s.id);
                  setSignalsBatch(localIds, false, allSignalIds);
                }}
                className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-[#8b2a1a] hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
              >
                {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rhythmSignals.length === 0 ? (
        <p className="text-[10px] italic opacity-60">
          {lang === 'fr' ? 'Aucun signal disponible dans ce projet.' : 'Nenhum sinal disponível neste projeto.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
          {rhythmSignals.map((sig) => {
            const isEnabled = enabledSignalIds === null || enabledSignalIds.includes(sig.id);
            return (
              <button
                key={sig.id}
                onClick={() => toggleSignalEnabled(sig.id, allSignalIds)}
                className={`border-2 border-black p-3 bg-white flex flex-col items-center gap-2 cursor-pointer text-center relative shadow-[3px_3px_0px_#000] hover:scale-[1.02] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                  isEnabled ? 'bg-white border-black font-bold' : 'opacity-40 grayscale bg-gray-50 border-dashed shadow-none'
                }`}
              >
                <div className="absolute top-1.5 right-1.5 w-4 h-4 border-2 border-black bg-white flex items-center justify-center font-cactus text-[9px] font-black text-black">
                  {isEnabled ? '✓' : ''}
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-black/5 border border-black/10 rounded overflow-hidden">
                  <SettingsSignalThumb name={sig.name} image={sig.image} />
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider truncate w-full">{sig.name}</span>
                <span className="text-[8px] opacity-50 font-normal">{sig.isCloud ? 'Cloud' : 'Local'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
