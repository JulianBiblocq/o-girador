import React from 'react';
import { Layers } from 'lucide-react';
import { useWizardStore, WizardStructurePreset } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep3StructureSelectorProps {
  wizardLang: Language;
}

export const WizardStep3StructureSelector: React.FC<WizardStep3StructureSelectorProps> = ({
  wizardLang,
}) => {
  const structurePreset = useWizardStore((s) => s.structurePreset);
  const setStructurePreset = useWizardStore((s) => s.setStructurePreset);
  const cloudName = useWizardStore((s) => s.selectedCloudSectionName);
  const cloudData = useWizardStore((s) => s.selectedCloudSectionData);
  const isPt = wizardLang === 'pt';

  const cards: { id: WizardStructurePreset; title: string; desc: string }[] = [
    {
      id: 'loop1',
      title: isPt ? '1 Compasso em loop' : '1 Mesure en boucle',
      desc: isPt ? 'Ideal para estudar o baque base continuamente.' : 'Idéal pour faire tourner le groove de base en continu.',
    },
    {
      id: 'bars4',
      title: isPt ? 'Quadratura 4 Compassos' : 'Carrure 4 Mesures',
      desc: isPt ? 'Bloco de 4 compassos pronto para variações.' : 'Bloc de 4 mesures prêt à accueillir vos réponses.',
    },
    {
      id: 'trad6',
      title: isPt ? 'Esqueleto Tradicional (6 Comp.)' : 'Squelette Traditionnel (6 Mes.)',
      desc: isPt ? 'Chamada (1) • Base (4) • Virada (1) com seções.' : 'Appel (1) • Base (4) • Virada (1) avec sections.',
    },
  ];

  if (cloudData) {
    cards.unshift({
      id: 'cloud_section',
      title: `${cloudName || 'Cloud'} (${cloudData.numMeasures} ${isPt ? 'comp.' : 'mes.'})`,
      desc: isPt ? 'Estrutura fiel à Seção da Nuvem selecionada.' : 'Structure fidèle à la Section Cloud sélectionnée.',
    });
  }

  return (
    <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3 rounded-sm">
      <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider border-b border-[var(--cordel-border)] pb-1 flex items-center gap-2">
        <Layers size={16} />
        <span>{t[wizardLang].structureTitle}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => {
          const isActive = structurePreset === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setStructurePreset(card.id)}
              className={`p-3 text-left border-2 font-cactus cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex flex-col justify-between gap-1 ${
                isActive
                  ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                  : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-[var(--cordel-border-strong)] hover:border-[var(--cordel-accent-readable)]'
              }`}
            >
              <span className="font-bold text-xs uppercase tracking-wide">{card.title}</span>
              <span className="font-sans text-[10px] leading-snug opacity-85">{card.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
