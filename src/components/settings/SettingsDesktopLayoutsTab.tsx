/**
 * SettingsDesktopLayoutsTab.tsx — Onglet Espaces Bureau d'A Oficina (< 55 lignes).
 * Présente les 3 modes Studio (Mixage, Édition, A Oficina) et la mémorisation signée de l'Écran 2.
 */
import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { SettingsDesktopModeCards } from './SettingsDesktopModeCards';

interface SettingsDesktopLayoutsTabProps {
  lang: string;
}

export const SettingsDesktopLayoutsTab: React.FC<SettingsDesktopLayoutsTabProps> = ({ lang }) => {
  const [notification, setNotification] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const isPt = lang === 'pt';

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const notifyBanner = (msg: string) => {
    setNotification(msg);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="border-b border-[var(--cordel-border)]/35 pb-2.5">
        <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-2 text-[var(--cordel-text)]">
          <LayoutGrid size={16} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Espaços Bureau (2 Telas Studio)' : 'Espaces Bureau (2 Écrans Studio)'}</span>
        </h3>
        <p className="text-[11px] text-[var(--cordel-text-muted)] mt-0.5">
          {isPt
            ? 'Abra Mixagem, Edição ou A Oficina na Tela 2 : a posição e o tamanho do segundo monitor são memorizados automaticamente.'
            : "Ouvrez Mixage, Édition ou A Oficina sur l'Écran 2 : la position et la taille du second moniteur sont mémorisées automatiquement."}
        </p>
      </div>

      {notification && (
        <div className="bg-[var(--cordel-status-success)] border-2 border-[var(--cordel-border-strong)] text-[var(--cordel-on-accent)] px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          {notification}
        </div>
      )}

      <SettingsDesktopModeCards lang={lang} onNotify={notifyBanner} />
    </div>
  );
};
