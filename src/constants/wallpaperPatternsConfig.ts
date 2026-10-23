
import { WallpaperPattern } from '../components/WallpaperCard';

export function getWallpaperPatternsConfig(isPt: boolean): {
  id: WallpaperPattern;
  title: string;
  subtitle: string;
  badge: string;
}[] {
  return [
    {
      id: 'rosace',
      title: isPt ? 'Opção A : Rosácea Azulejo' : 'Option A : Rosace Azulejo',
      subtitle: isPt
        ? 'Simetria radial D4 clássica. Alfaias no centro, Gonguês e Caixas nas extremidades.'
        : 'Symétrie radiale D4. Alfaias en fleur centrale, Gonguês et Caixas aux intersections.',
      badge: isPt ? 'Azulejo' : 'Dominoté',
    },
    {
      id: 'damas',
      title: isPt ? 'Opção B : Damasco 45°' : 'Option B : Damassé 45°',
      subtitle: isPt
        ? 'Treliça em losango diagonal. Linhas de Mineiros ritmadas com instrumentos nas células.'
        : 'Treillis géométrique en losange. Trame de Mineiros abritant les fûts de bateria.',
      badge: '45° Mesh',
    },
    {
      id: 'gravure',
      title: isPt ? 'Opção C : Gravura Cordel' : 'Option C : Gravure & Semis',
      subtitle: isPt
        ? 'Distribuição orgânica estilo xilogravura. Instrumentos soltos sem orientação fixa.'
        : 'Semis organique esprit taille-douce. Instruments flottants sans haut ni bas.',
      badge: 'Xilografia',
    },
    {
      id: 'none',
      title: isPt ? 'Sem Papel de Parede' : 'Désactivé',
      subtitle: isPt
        ? 'Fundo liso padrão do aplicativo sem textura de filigrana.'
        : "Fond uni de l'application sans filigrane vectoriel.",
      badge: 'Clean',
    },
  ];
}
