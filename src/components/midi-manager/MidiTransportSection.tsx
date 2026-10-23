import React from 'react';
import { useMidiStore, TransportAction } from '../../stores/useMidiStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { formatTransportMapping } from './midiFormatters';

export const MidiTransportSection: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  const {
    transportMappings,
    waitingForTransportAction,
    setWaitingForTransportAction,
    removeTransportMapping,
  } = useMidiStore();

  const t = (fr: string, pt: string) => (lang === 'pt' ? pt : fr);

  const transportActionsList: { id: TransportAction; label: string; desc: string }[] = [
    { id: 'play', label: t('Lecture / Pause', 'Reproduzir / Pausar'), desc: t('Déclenche la lecture ou la pause du séquenceur', 'Inicia ou pausa a reprodução do sequenciador') },
    { id: 'stop', label: t('Arrêt', 'Parar'), desc: t('Arrête la lecture du morceau', 'Para a reprodução da música') },
    { id: 'loop', label: t('Boucle', 'Repetição (Loop)'), desc: t('Active ou désactive la boucle de lecture', 'Ativa ou desativa o loop de reprodução') },
    { id: 'record', label: t('Enregistrer WAV', 'Gravar WAV'), desc: t('Démarre ou arrête l\'export audio WAV en direct', 'Inicia ou interrompe a exportação de áudio WAV em tempo real') },
    { id: 'nextMeasure', label: t('Mesure Suivante', 'Próximo Compasso'), desc: t('Passe à la mesure suivante de la Timeline', 'Avança para o próximo compasso na Timeline') },
    { id: 'prevMeasure', label: t('Mesure Précédente', 'Compasso Anterior'), desc: t('Revient à la mesure précédente de la Timeline', 'Volta para o compasso anterior na Timeline') },
  ];

  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
      <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
        {t('Commandes de Transport', 'Controles de Transporte')}
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
                {mapping && !isWaiting && (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[9px] bg-[#1a1a1a] text-[#f4ecd8] px-2 py-1 rounded-sm border border-black font-bold">
                      {formatTransportMapping(mapping)}
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

                <button
                  onClick={() => {
                    if (isWaiting) setWaitingForTransportAction(null);
                    else setWaitingForTransportAction(action.id);
                  }}
                  className={`border-2 border-black px-3 py-1 font-mono text-[10px] font-bold shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
                    isWaiting ? 'bg-amber-500 text-black animate-pulse' : 'bg-[#f4ecd8] text-black hover:bg-[#ebdcb9]'
                  }`}
                >
                  {isWaiting ? t('Attente signal...', 'Aguardando sinal...') : (mapping ? t('Réapprendre', 'Reaprender') : t('Apprendre', 'Aprender'))}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
