import React from 'react';
import { ArrowRight, Layers, Cloud } from 'lucide-react';
import { GuidePoleDef, GuidePoleId } from '../../data/guide/guideTypes';
import { PANORAMA_ECOSYSTEM, PANORAMA_TRACKS } from '../../data/guide/pole0Panorama';

interface GuidePanoramaViewProps {
  isFr: boolean;
  poles: GuidePoleDef[];
  onSelectPole: (id: GuidePoleId) => void;
}

export const GuidePanoramaView: React.FC<GuidePanoramaViewProps> = ({
  isFr,
  poles,
  onSelectPole,
}) => {
  const actionPoles = poles.filter((p) => p.id !== 'panorama');

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Architecture Duale : Pratique vs Studio */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PANORAMA_TRACKS.map((tr, idx) => {
          const points = isFr ? tr.pointsFr : tr.pointsPt;
          return (
            <div
              key={idx}
              className="border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] p-4 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 border-b-2 border-[var(--cordel-border)] pb-2">
                <Layers size={15} className="text-[var(--cordel-accent-readable)] shrink-0" />
                <span className="font-cactus font-bold text-xs uppercase tracking-wider px-2 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)]">
                  {isFr ? tr.badgeFr : tr.badgePt}
                </span>
              </div>
              <h4 className="font-cactus font-bold text-sm sm:text-base text-[var(--cordel-text)] leading-snug">
                {isFr ? tr.titleFr : tr.titlePt}
              </h4>
              <ul className="flex flex-col gap-2">
                {points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--cordel-text)] leading-relaxed">
                    <span className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center font-mono font-bold text-[10px] bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] text-[var(--cordel-accent-readable)]">
                      {i + 1}
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* 2. Écosystème O Girador (100 % Cloud) */}
      <section className="border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] p-4 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--cordel-border)] pb-2">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-[var(--cordel-accent-readable)] shrink-0" />
            <h4 className="font-cactus font-bold text-sm uppercase tracking-wider text-[var(--cordel-text)]">
              {isFr
                ? 'Écosystème O Girador — Continuité 100 % Cloud (Zéro fichier local)'
                : 'Ecossistema O Girador — Continuidade 100 % em Nuvem (Zero arquivo local)'}
            </h4>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] text-[var(--cordel-text-muted)]">
            Sequenciador ↔ Cloud SSOT
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PANORAMA_ECOSYSTEM.map((app) => (
            <div key={app.appName} className="p-3 bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] flex flex-col gap-1.5">
              <div className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)]">
                {app.appName}
              </div>
              <div className="text-[10.5px] font-bold text-[var(--cordel-text)]">
                {isFr ? app.roleFr : app.rolePt}
              </div>
              <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">
                {isFr ? app.bridgeFr : app.bridgePt}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Sommaire interactif des 5 Pôles (20 Fiches-Actions) */}
      <section className="flex flex-col gap-2.5">
        <h4 className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'Explorer les 5 Pôles du Mode d’Emploi (20 Fiches autonomes) :' : 'Explorar os 5 Polos do Manual (20 Fichas autônomas) :'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actionPoles.map((pole) => (
            <button
              key={pole.id}
              type="button"
              onClick={() => onSelectPole(pole.id)}
              className="text-left p-3.5 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col justify-between gap-2 cursor-pointer transition-colors group"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)]">
                    {isFr ? `PÔLE ${pole.num}` : `POLO ${pole.num}`}
                  </span>
                  <ArrowRight size={14} className="text-[var(--cordel-accent-readable)] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
                <span className="font-cactus font-bold text-xs sm:text-sm uppercase text-[var(--cordel-text)] mt-1">
                  {isFr ? pole.titleFr : pole.titlePt}
                </span>
                <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">
                  {isFr ? pole.subtitleFr : pole.subtitlePt}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--cordel-accent-readable)]">
                {pole.cards.length} {isFr ? 'fiches détaillées' : 'fichas detalhadas'}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
