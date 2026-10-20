import React from 'react';
import { useSequencer } from '../../contexts/SequencerContext';

interface SettingsCachePurgeButtonProps {
  lang: string;
}

export const SettingsCachePurgeButton: React.FC<SettingsCachePurgeButtonProps> = ({
  lang,
}) => {
  const sequencer = useSequencer();

  const handlePurgeCache = async () => {
    const confirmText = lang === 'fr'
      ? 'Attention, vous devrez re-télécharger les sons avec une connexion internet à la prochaine ouverture. Voulez-vous continuer ?'
      : 'Atenção, você precisará baixar novamente os sons com uma conexão de internet na próxima vez que abrir. Deseja continuar ?';

    const ok = sequencer.confirmAsync ? await sequencer.confirmAsync(confirmText) : true;
    if (!ok) return;

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      const successMsg = lang === 'fr'
        ? 'Le cache a été purgé avec succès. Rechargement de la page...'
        : 'O cache foi limpo com sucesso. Recarregando a página...';
      if (sequencer.alertAsync) await sequencer.alertAsync(successMsg);
      window.location.reload();
    } catch (err) {
      console.error('Error purging cache:', err);
    }
  };

  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-[#8b2a1a] rounded-[4px_10px_6px_12px] p-4 bg-[#fbf8f0] shadow-[3px_3px_0px_#8b2a1a] flex flex-col gap-4">
      <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-[#8b2a1a]/20 pb-1 text-[#8b2a1a]">
        🧹 {lang === 'fr' ? "Purge de l'Atelier" : 'Limpeza da Oficina'}
      </h3>
      <p className="text-[10px] italic opacity-85">
        {lang === 'fr'
          ? "Si le son bégaie ou que la mémoire s'étouffe, purgez l'atelier pour repartir sur une toile vierge."
          : 'Se o som engasgar ou a memória ficar cheia, limpe a oficina para começar do zero.'}
      </p>

      <button
        onClick={handlePurgeCache}
        className="w-full px-4 py-3 text-xs bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-black hover:text-white shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
      >
        {lang === 'fr' ? 'Purger le Cache Local' : 'Limpar Cache Local'}
      </button>
    </div>
  );
};
