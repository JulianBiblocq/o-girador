import React, { useState } from 'react';
import { Monitor, Smartphone, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { XiloSun, XiloMoon } from '../XiloIcons';
import { isStudioPrivilegedProfile } from '../../utils/viewModeResolver';
import { resolvePracticeModeForProfile } from '../../stores/helpers/practiceModeHelpers';
import {
  DesktopStartupMode,
  MobileStartupMode,
  getStoredDesktopStartupMode,
  setStoredDesktopStartupMode,
  getStoredMobileStartupMode,
  setStoredMobileStartupMode,
} from '../../utils/userPreferencesStorage';

interface ProfileStartupComfortTabProps {
  lang: 'fr' | 'pt';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfileStartupComfortTab: React.FC<ProfileStartupComfortTabProps> = ({
  lang,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const isPt = lang === 'pt';
  const { userProfile, isAdmin } = useAuth();
  const setLang = useSequencerStore((s) => s.setLang);
  const [desktopMode, setDesktopMode] = useState<DesktopStartupMode>(getStoredDesktopStartupMode);
  const [mobileMode, setMobileMode] = useState<MobileStartupMode>(getStoredMobileStartupMode);

  const canSeeEditor =
    isStudioPrivilegedProfile(userProfile, isAdmin) ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  const handleDesktopChange = (mode: DesktopStartupMode) => {
    setDesktopMode(mode);
    setStoredDesktopStartupMode(mode);
    if (mode === 'studio_dual') useDesktopWorkspaceStore.getState().setPreferredScreenMode('dual');
    else if (mode === 'studio_single') useDesktopWorkspaceStore.getState().setPreferredScreenMode('single');
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      useSequencerStore.getState().setIsPracticeMode(resolvePracticeModeForProfile(userProfile, isAdmin));
    }
  };

  const handleMobileChange = (mode: MobileStartupMode) => {
    setMobileMode(mode);
    setStoredMobileStartupMode(mode);
    if (mode !== 'last' && typeof window !== 'undefined' && window.innerWidth < 768) {
      useSequencerStore.getState().setMobileViewMode(mode);
    }
  };

  const desktopOpts: Array<{ id: DesktopStartupMode; label: string }> = [
    { id: 'auto', label: isPt ? 'Automático conforme função (Mestre/Visitante: Studio · Aluno: Prática)' : 'Automatique selon rôle (Mestre/Visiteur : Studio · Élève : Pratique)' },
    { id: 'practice', label: isPt ? 'Sempre Modo Prática (focado na Roda)' : 'Toujours Mode Pratique (épuré sur la Roda)' },
    { id: 'studio_single', label: isPt ? 'Sempre Modo Studio — 1 tela' : 'Toujours Mode Studio — 1 écran' },
    { id: 'studio_dual', label: isPt ? 'Sempre Modo Studio — 2 telas' : 'Toujours Mode Studio — 2 écrans' },
  ];

  const mobileOpts: Array<{ id: MobileStartupMode; label: string }> = [
    { id: 'last', label: isPt ? 'Retomar última vista / padrão da função' : 'Reprendre ma dernière vue / défaut selon rôle' },
    { id: 'percussion', label: isPt ? 'Sempre Percussão / Focus' : 'Toujours Percussion / Focus' },
    { id: 'danse', label: isPt ? 'Sempre Modo Dança (Dançador)' : 'Toujours Mode Danse (Dançador)' },
    ...(canSeeEditor ? [{ id: 'editeur' as MobileStartupMode, label: isPt ? 'Atelier Scan & Sinais' : 'Atelier Scan & Signes' }] : []),
    { id: 'complet', label: isPt ? 'Sempre Modo Studio Completo' : 'Toujours Mode Studio Complet' },
  ];

  const btnCls = (active: boolean) =>
    `py-1.5 px-2.5 border-2 text-left font-cactus font-bold text-[11px] cursor-pointer transition-colors ${
      active
        ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]'
        : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
    }`;

  return (
    <div className="flex flex-col gap-3 text-left">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cordel-text-muted)]">
        {isPt ? '100% local por aparelho — links diretos (?tocarJunto, ?trainingId) têm prioridade' : '100 % local par appareil — les liens directs (?tocarJunto, ?trainingId) gardent la priorité'}
      </div>

      <section className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
          <Monitor size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Abertura no Computador (>= 768px)' : 'À l\'ouverture sur Ordinateur (>= 768px)'}</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {desktopOpts.map((o) => (
            <button key={o.id} type="button" onClick={() => handleDesktopChange(o.id)} className={btnCls(desktopMode === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
          <Smartphone size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Abertura no Celular (< 768px)' : 'À l\'ouverture sur Smartphone (< 768px)'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {mobileOpts.map((o) => (
            <button key={o.id} type="button" onClick={() => handleMobileChange(o.id)} className={btnCls(mobileMode === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 font-cactus font-bold text-[10px] uppercase text-[var(--cordel-text-muted)]">
            <Languages size={12} /> {isPt ? 'Idioma' : 'Langue'}
          </span>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => setLang('fr')} className={btnCls(!isPt) + ' text-center'}>FR</button>
            <button type="button" onClick={() => setLang('pt')} className={btnCls(isPt) + ' text-center'}>BR</button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-cactus font-bold text-[10px] uppercase text-[var(--cordel-text-muted)]">
            {isPt ? 'Tema Visual' : 'Thème d\'Affichage'}
          </span>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="py-1.5 px-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] font-cactus font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isDarkMode ? <XiloSun size={14} /> : <XiloMoon size={14} />}
            <span>{isDarkMode ? (isPt ? 'Escuro -> Claro' : 'Sombre -> Clair') : (isPt ? 'Claro -> Escuro' : 'Clair -> Sombre')}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
