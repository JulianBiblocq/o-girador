import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { CloudRhythmSignal, PresetMetadata } from '../../types';
import { SettingsSignalThumb } from './SettingsSignalThumb';
import { SettingsSignalsBatchBar } from './SettingsSignalsBatchBar';

interface SettingsSignalsTabProps {
  lang: string;
  mestreSignals?: CloudRhythmSignal[];
}

const EMPTY_SIGNALS: NonNullable<PresetMetadata['rhythmSignals']> = [];

export const SettingsSignalsTab: React.FC<SettingsSignalsTabProps> = ({
  lang,
  mestreSignals = [],
}) => {
  const localRhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals ?? EMPTY_SIGNALS);
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
      <p className="text-[11px] text-[var(--cordel-text-muted)] font-semibold">
        {lang === 'pt'
          ? 'Selecione os sinais que aparecerão no catálogo de sinais para os músicos.'
          : 'Sélectionnez les signaux qui apparaîtront dans le catalogue de signaux des musiciens.'}
      </p>

      {rhythmSignals.length > 0 && (
        <SettingsSignalsBatchBar
          lang={lang}
          rhythmSignals={rhythmSignals}
          allSignalIds={allSignalIds}
          setSignalsBatch={setSignalsBatch}
        />
      )}

      {rhythmSignals.length === 0 ? (
        <p className="text-[11px] italic text-[var(--cordel-text-muted)]">
          {lang === 'fr' ? 'Aucun signal disponible dans ce projet.' : 'Nenhum sinal disponível neste projeto.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-1">
          {rhythmSignals.map((sig) => {
            const isEnabled = enabledSignalIds === null || enabledSignalIds.includes(sig.id);
            return (
              <button
                key={sig.id}
                type="button"
                onClick={() => toggleSignalEnabled(sig.id, allSignalIds)}
                className={`p-3 flex flex-col items-center gap-2 cursor-pointer text-center relative active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform select-none ${
                  isEnabled
                    ? 'border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] font-bold shadow-[3px_3px_0px_var(--cordel-shadow-color)] hover:scale-[1.01]'
                    : 'border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] opacity-50 grayscale shadow-none'
                }`}
              >
                <div
                  className={`absolute top-1.5 right-1.5 w-4 h-4 border-2 border-[var(--cordel-border-strong)] flex items-center justify-center ${
                    isEnabled
                      ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                      : 'bg-[var(--cordel-surface-elevated)] text-transparent'
                  }`}
                >
                  <Check size={10} className="stroke-[3]" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] border border-[var(--cordel-border)] rounded overflow-hidden">
                  <SettingsSignalThumb name={sig.name} image={sig.image} />
                </div>
                <span className="text-[10px] text-[var(--cordel-text)] uppercase font-bold tracking-wider truncate w-full">{sig.name}</span>
                <span className="text-[9px] text-[var(--cordel-text-muted)] font-semibold">{sig.isCloud ? 'Cloud' : 'Local'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
