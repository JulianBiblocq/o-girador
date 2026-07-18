import React from 'react';
import { useMidiStore, MidiTarget, TransportAction, TransportMapping } from '../stores/useMidiStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

const midiNoteToName = (note: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${notes[note % 12]}${octave}`;
};

const formatMidiKey = (keyNum: number): string => {
  if (keyNum >= 1000) {
    return `CC ${keyNum - 1000}`;
  }
  return `Note ${keyNum} (${midiNoteToName(keyNum)})`;
};

const formatTransportMapping = (mapping: TransportMapping): string => {
  if (mapping.type === 'cc') {
    return `CC ${mapping.number}`;
  }
  return `Note ${mapping.number} (${midiNoteToName(mapping.number)})`;
};

export const MidiManagerPanel: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  
  const {
    mappings,
    removeMidiMapping,
    clearMidiMappings,
    transportMappings,
    waitingForTransportAction,
    setWaitingForTransportAction,
    removeTransportMapping,
  } = useMidiStore();

  const t = (fr: string, pt: string) => (lang === 'pt' ? pt : fr);

  const transportActionsList: { id: TransportAction; label: string; desc: string }[] = [
    { 
      id: 'play', 
      label: t('Lecture / Pause', 'Reproduzir / Pausar'), 
      desc: t('Déclenche la lecture ou la pause du séquenceur', 'Inicia ou pausa a reprodução do sequenciador') 
    },
    { 
      id: 'stop', 
      label: t('Arrêt', 'Parar'), 
      desc: t('Arrête la lecture du morceau', 'Para a reprodução da música') 
    },
    { 
      id: 'loop', 
      label: t('Boucle', 'Repetição (Loop)'), 
      desc: t('Active ou désactive la boucle de lecture', 'Ativa ou desativa o loop de reprodução') 
    },
    { 
      id: 'record', 
      label: t('Enregistrer WAV', 'Gravar WAV'), 
      desc: t('Démarre ou arrête l\'export audio WAV en direct', 'Inicia ou interrompe a exportação de áudio WAV em tempo real') 
    },
    { 
      id: 'nextMeasure', 
      label: t('Mesure Suivante', 'Próximo Compasso'), 
      desc: t('Passe à la mesure suivante de la Timeline', 'Avança para o próximo compasso na Timeline') 
    },
    { 
      id: 'prevMeasure', 
      label: t('Mesure Précédente', 'Compasso Anterior'), 
      desc: t('Revient à la mesure précédente de la Timeline', 'Volta para o compasso anterior na Timeline') 
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-left font-sans">
      
      {/* SECTION 1: INSTRUMENTS / PADS */}
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center justify-between border-b border-black/10 pb-1">
          <span>🥁 {t('Mappage des Instruments (Pads)', 'Mapeamento de Instrumentos (Pads)')}</span>
          {Object.keys(mappings).length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(t('Dissocier tous les pads ?', 'Desassociar todos os pads?'))) {
                  clearMidiMappings();
                }
              }}
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
                      🎹 {formatMidiKey(note)}
                    </span>
                    <span className="text-gray-500">➔</span>
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

      {/* SECTION 2: COMMANDES DE TRANSPORT */}
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
          🎛️ {t('Commandes de Transport', 'Controles de Transporte')}
        </h3>

        <div className="flex flex-col gap-2.5">
          {transportActionsList.map((action) => {
            const mapping = transportMappings[action.id];
            const isWaiting = waitingForTransportAction === action.id;

            return (
              <div 
                key={action.id} 
                className="flex flex-col md:flex-row md:items-center justify-between border border-black/10 bg-[#fbf8f0] p-2 rounded-sm gap-2"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-[#1a1a1a]">{action.label}</span>
                  <span className="text-[9px] text-gray-500">{action.desc}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Mapped Key Badge */}
                  {mapping && !isWaiting && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[9px] bg-[#1a1a1a] text-[#f4ecd8] px-2 py-1 rounded-sm border border-black font-bold">
                        🎹 {formatTransportMapping(mapping)}
                      </span>
                      <button
                        onClick={() => removeTransportMapping(action.id)}
                        className="w-5 h-5 flex items-center justify-center border border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-black rounded-sm cursor-pointer transition-colors text-[10px]"
                        title={t('Effacer l\'assignation', 'Limpar associação')}
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Learn Trigger button */}
                  <button
                    onClick={() => {
                      if (isWaiting) {
                        setWaitingForTransportAction(null);
                      } else {
                        setWaitingForTransportAction(action.id);
                      }
                    }}
                    className={`border-2 border-black px-3 py-1 font-mono text-[10px] font-bold shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
                      isWaiting 
                        ? 'bg-amber-500 text-black animate-pulse' 
                        : 'bg-[#f4ecd8] text-black hover:bg-[#ebdcb9]'
                    }`}
                  >
                    {isWaiting 
                      ? t('Attente signal...', 'Aguardando sinal...') 
                      : (mapping ? t('Réapprendre', 'Reaprender') : t('Apprendre', 'Aprender'))
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
