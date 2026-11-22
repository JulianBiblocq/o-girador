/**
 * ExportFullSongBounceButton.tsx — Bouton Cordel [ Exporter le Morceau Complet (.wav) ] (~1-2 s Offline) (< 95 lignes).
 * Protégé par `userAccessPolicy` (Mestres actifs, abonnés ou essai actif).
 */
import React, { useState } from 'react';
import { Disc3, Lock } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { renderFullSongBounceOffline } from '../utils/bounce/fullSongBounceExporter';
import { guardFeatureWithModal } from '../utils/cloudWriteGuard';
import { resolveUserAccessPolicy } from '../utils/userAccessPolicy';

interface ExportFullSongBounceButtonProps {
  lang?: 'fr' | 'pt';
  className?: string;
}

export const ExportFullSongBounceButton: React.FC<ExportFullSongBounceButtonProps> = ({
  lang = 'fr',
  className = '',
}) => {
  const { userProfile, isAdmin } = useAuth();
  const audio = useAudio();
  const [isExporting, setIsExporting] = useState(false);

  const hasAuthUser = Boolean(auth.currentUser || userProfile?.uid);
  const policy = resolveUserAccessPolicy(userProfile, { hasAuthUser, isAdminFlag: isAdmin });
  const canExportFullWav = policy.canUploadVocalCloud;

  const handleExportFullSong = async () => {
    if (isExporting) return;
    if (!guardFeatureWithModal('vocal_cloud', userProfile, hasAuthUser)) return;

    setIsExporting(true);
    try {
      const { wavBlob, filename } = await renderFullSongBounceOffline({
        masterVol: audio.masterVol,
        masterEQ: audio.masterEQ,
        masterCompressor: audio.masterCompressor,
      });
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const msg = lang === 'fr'
        ? `Morceau complet exporté : ${filename}`
        : `Música completa exportada : ${filename}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
    } catch (err: any) {
      console.error('[ExportFullSongBounceButton] Erreur export WAV complet:', err);
      const errMsg = lang === 'fr'
        ? `Échec export audio : ${err?.message || 'erreur'}`
        : `Falha ao exportar áudio : ${err?.message || 'erro'}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
    } finally {
      setIsExporting(false);
    }
  };

  const label = isExporting
    ? (lang === 'fr' ? 'Rendu du morceau en cours...' : 'Renderizando música completa...')
    : (lang === 'fr' ? 'Exporter le Morceau Complet (.wav)' : 'Exportar Música Completa (.wav)');

  const tooltip = lang === 'fr'
    ? 'Rendu studio hors-ligne rapide (~2 s) du morceau complet avec Batuque, Toada et Mastering (-14 LUFS)'
    : 'Renderização offline rápida (~2 s) da música completa com Batuque, Toada e Masterização (-14 LUFS)';

  return (
    <button
      type="button"
      data-testid="export-full-song-wav-btn"
      disabled={isExporting}
      onClick={handleExportFullSong}
      title={tooltip}
      className={`px-2.5 py-2 text-xs font-cactus font-bold flex items-center justify-center gap-2 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:brightness-110 transition-all cursor-pointer select-none active:translate-y-[1px] active:shadow-none disabled:opacity-60 ${className}`}
    >
      <Disc3 className={`w-4 h-4 shrink-0 ${isExporting ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {!canExportFullWav && <Lock className="w-3.5 h-3.5 shrink-0 opacity-85" />}
    </button>
  );
};
