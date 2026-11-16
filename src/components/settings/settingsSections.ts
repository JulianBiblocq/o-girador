import { OficinaSectionId } from '../../stores/useSequencerSettingsStore';

type OficinaDomainId = 'son-groove' | 'edition-scene' | 'system-hardware';

interface SettingsSectionItem {
  id: OficinaSectionId;
  title: string;
  isAction?: boolean;
}

export interface OficinaDomainGroup {
  id: OficinaDomainId;
  label: string;
  shortLabel: string;
  items: SettingsSectionItem[];
}

export function getOficinaDomains(
  lang: string,
  isDesktop: boolean,
  canSeeAoVivoLab: boolean
): OficinaDomainGroup[] {
  const isPt = lang === 'pt';

  return [
    {
      id: 'son-groove',
      label: isPt ? 'SOM & BALANÇO' : 'SON & BALANÇO',
      shortLabel: isPt ? 'Som & Balanço' : 'Son & Balanço',
      items: [
        { id: 'lutherie', title: isPt ? 'Lutheria & Peles' : 'Lutherie & Peaux' },
        { id: 'groove', title: 'Balanço' },
        { id: 'kit', title: isPt ? 'Kit & Metrônomo' : 'Kit & Métronome' },
      ],
    },
    {
      id: 'edition-scene',
      label: isPt ? 'EDIÇÃO & PALCO' : 'ÉDITION & SCÈNE',
      shortLabel: isPt ? 'Edição & Palco' : 'Édition & Scène',
      items: [
        { id: 'prensa', title: isPt ? 'A Prensa' : 'La Presse' },
        { id: 'papier', title: isPt ? 'Atelier Papel & Scan' : 'Atelier Papier & Scan' },
        { id: 'sinais', title: isPt ? 'Sinais do Mestre' : 'Signaux du Mestre' },
        { id: 'gabarits', title: isPt ? 'Meus Modelos' : 'Mes Gabarits' },
      ],
    },
    {
      id: 'system-hardware',
      label: isPt ? 'SISTEMA & HARDWARE' : 'SYSTÈME & MATÉRIEL',
      shortLabel: isPt ? 'Sistema' : 'Système',
      items: [
        { id: 'audio', title: isPt ? 'Saídas de Áudio' : 'Sorties Audio' },
        { id: 'midi', title: isPt ? 'Controladores MIDI' : 'Contrôleurs MIDI' },
        ...(isDesktop
          ? [{ id: 'desktopLayouts' as const, title: isPt ? 'Espaços Desktop' : 'Espaces Bureau' }]
          : []),
        { id: 'performance', title: isPt ? 'Modo Eco' : 'Mode Éco' },
        { id: 'ajuda', title: isPt ? 'Ajuda & Batidas' : 'Aide & Frappes' },
        ...(canSeeAoVivoLab
          ? [{ id: 'aovivo-lab' as const, title: 'Labo Ao Vivo', isAction: true }]
          : []),
      ],
    },
  ];
}
