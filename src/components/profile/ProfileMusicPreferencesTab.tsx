import React, { useState } from 'react';
import { Hand, Drum, Cloud } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  WORKING_INSTRUMENT_OPTIONS,
  WorkingInstrumentChoice,
  getStoredWorkingInstrument,
  setStoredWorkingInstrument,
  getEffectiveWorkingInstrument,
  setStoredLeftHanded,
} from '../../utils/userPreferencesStorage';

interface ProfileMusicPreferencesTabProps {
  lang: 'fr' | 'pt';
}

export const ProfileMusicPreferencesTab: React.FC<ProfileMusicPreferencesTabProps> = ({ lang }) => {
  const isPt = lang === 'pt';
  const { userProfile, updateUserPreference, updateUserProfileField } = useAuth();
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const [workingChoice, setWorkingChoice] = useState<WorkingInstrumentChoice>(() => getStoredWorkingInstrument());

  const orgInst = (userProfile?.instrument || '').trim();

  const handleSelectHandedness = (left: boolean) => {
    setStoredLeftHanded(left);
    useSequencerStore.getState().setIsLeftHanded(left);
    if (userProfile) void updateUserPreference('isLeftHanded', left);
  };

  const handleSelectInstrument = (choice: WorkingInstrumentChoice) => {
    setWorkingChoice(choice);
    setStoredWorkingInstrument(choice);
    const nextEffective = choice === 'auto' ? (orgInst || null) : choice;
    const store = useSequencerStore.getState();
    store.setPreferredInstrumentName(nextEffective, userProfile);
    store.syncFocusWithTracks(store.tracks, userProfile);
    if (userProfile) void updateUserProfileField('preferredInstrument', choice === 'auto' ? null : choice);
  };

  const activeEffective = getEffectiveWorkingInstrument(userProfile);

  return (
    <div className="flex flex-col gap-3.5 text-left">
      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cordel-text-muted)]">
        <Cloud size={12} className="shrink-0 text-[var(--cordel-accent-readable)]" />
        <span>{isPt ? 'Sincronizado com sua conta + salvo neste aparelho' : 'Synchronisé avec votre compte + mémorisé sur cet appareil'}</span>
      </div>

      {/* Latéralité */}
      <section className="p-3 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-2">
        <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
          <Hand size={14} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Lateralidade das Baquetas (Ao Vivo)' : 'Latéralité des Baguettes (Ao Vivo)'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { left: false, label: isPt ? 'Destro' : 'Droitier' },
            { left: true, label: isPt ? 'Canhoto' : 'Gaucher' },
          ].map((opt) => {
            const active = isLeftHanded === opt.left;
            return (
              <button
                key={String(opt.left)}
                type="button"
                onClick={() => handleSelectHandedness(opt.left)}
                className={`py-2 px-3 border-2 font-cactus font-bold text-xs uppercase cursor-pointer transition-colors ${
                  active
                    ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0_var(--cordel-shadow-color)]'
                    : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Instrument de travail */}
      <section className="p-3 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
            <Drum size={14} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>{isPt ? 'Meu Instrumento de Estudo Atual' : 'Mon Instrument de Travail Actuel'}</span>
          </div>
          {activeEffective && (
            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)]">
              {activeEffective}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">
          {isPt ? 'Define o naipe pré-selecionado no Modo Focus e no Tocar Junto ao abrir cada música.' : 'Définit le pupitre ciblé par défaut dans le Mode Focus et Tocar Junto à chaque morceau.'}
        </p>

        <button
          type="button"
          onClick={() => handleSelectInstrument('auto')}
          className={`w-full py-2 px-2.5 border-2 text-left font-cactus font-bold text-xs cursor-pointer transition-colors ${
            workingChoice === 'auto'
              ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0_var(--cordel-shadow-color)]'
              : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
          }`}
        >
          {isPt
            ? `Automático — perfil Organizador (${orgInst || 'Marcante'})`
            : `Automatique — profil Organizador (${orgInst || 'Marcante'})`}
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
          {WORKING_INSTRUMENT_OPTIONS.map((opt) => {
            const active = workingChoice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectInstrument(opt.id)}
                className={`py-1.5 px-2 border text-left font-cactus font-bold text-[11px] truncate cursor-pointer transition-colors ${
                  active
                    ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]'
                    : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                {isPt ? opt.labelPt : opt.labelFr}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
