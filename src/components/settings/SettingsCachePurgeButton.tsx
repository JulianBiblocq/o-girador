import React from 'react';
import { Trash2 } from 'lucide-react';
import { clearAudioSampleCache } from '../../audio/audioSampleCache';
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
      await clearAudioSampleCache();
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
    <div className="border-2 border-[var(--cordel-border)] rounded-[4px_10px_6px_12px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-3">
      <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5 text-[var(--cordel-accent-readable)]">
        <Trash2 size={15} className="shrink-0" />
        <span>{lang === 'fr' ? "Purge de l'Atelier" : 'Limpeza da Oficina'}</span>
      </h3>
      <p className="text-[11px] italic text-[var(--cordel-text-muted)] font-semibold">
        {lang === 'fr'
          ? "Si le son bégaie ou que la mémoire s'étouffe, purgez l'atelier pour repartir sur une toile vierge."
          : 'Se o som engasgar ou a memória ficar cheia, limpe a oficina para começar do zero.'}
      </p>

      <button
        type="button"
        onClick={handlePurgeCache}
        className="w-full px-4 py-2.5 text-xs bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-status-danger)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors text-center"
      >
        {lang === 'fr' ? 'Purger le Cache Local' : 'Limpar Cache Local'}
      </button>
    </div>
  );
};
