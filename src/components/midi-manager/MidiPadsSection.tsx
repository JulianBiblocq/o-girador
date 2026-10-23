import React from 'react';
import { useMidiStore } from '../../stores/useMidiStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { formatMidiKey } from './midiFormatters';

export const MidiPadsSection: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  const { mappings, removeMidiMapping, clearMidiMappings } = useMidiStore();
  const { confirmAsync } = useSequencer();

  const t = (fr: string, pt: string) => (lang === 'pt' ? pt : fr);

  const handleClearAll = async () => {
    const ok = await confirmAsync(t('Dissocier tous les pads ?', 'Desassociar todos os pads?'));
    if (ok) clearMidiMappings();
  };

  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
      <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center justify-between border-b border-black/10 pb-1">
        <span>{t('Mappage des Instruments (Pads)', 'Mapeamento de Instrumentos (Pads)')}</span>
        {Object.keys(mappings).length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[9px] border border-red-600 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-2 py-0.5 font-bold font-mono transition-colors rounded-sm cursor-pointer"
          >
            {t('Tout effacer', 'Limpar Tudo')}
          </button>
        )}
      </h3>

      {Object.keys(mappings).length === 0 ? (
        <p className="text-[10px] text-gray-500 italic py-2">
          {t(
            'Aucune touche MIDI n\'est associée pour le moment. Allez dans l\'Officine d\'un instrument pour assigner des touches physiques.',
            'Nenhuma tecla MIDI associada no momento. Vá na Oficina de um instrumento para associar as teclas físicas.'
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {Object.entries(mappings).map(([noteStr, target]) => {
            const note = Number(noteStr);
            return (
              <div
                key={note}
                className="flex items-center justify-between border border-black/10 bg-black/[0.01] p-1.5 rounded-sm text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-[#1a1a1a] text-[#f4ecd8] px-1.5 py-0.5 rounded-sm font-mono">
                    {formatMidiKey(note)}
                  </span>
                  <span className="text-gray-500"></span>
                  <span className="font-cactus font-bold uppercase tracking-wider text-[#8b2a1a]">
                    {target.instrumentId} ({target.symbol})
                  </span>
                </div>
                <button
                  onClick={() => removeMidiMapping(note)}
                  className="w-4 h-4 flex items-center justify-center border border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-black rounded-sm cursor-pointer transition-colors"
                  title={t('Dissocier', 'Desassociar')}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
