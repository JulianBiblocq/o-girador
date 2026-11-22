import { SHOW_DANCADOR } from '../../constants/featureFlags';
import { GuideActionCard } from './guideTypes';

export const POLE_5_SIGNALS_AND_CLOUD_CARDS: GuideActionCard[] = [
  {
    id: 'p5-3',
    poleId: 'pole-5',
    level: 'studio',
    shortcut: 'O > Signaux',
    titleFr: 'Créer, détourer & placer les Signaux Visuels du Mestre',
    titlePt: 'Criar, recortar & posicionar os Sinais Visuais do Mestre',
    goalFr: 'Annoncer visuellement les appels, viradas et paradas au centre de la Roda comme dans la rue.',
    goalPt: 'Anunciar visualmente chamadas, viradas e paradas no centro da Roda como no cortejo real.',
    contextFr: 'Dans un cortège bruyant, le Mestre dirige le Batuque autant par le geste codifié des mains et des bras que par l’Apito. Sequenciador grave ces gestes en esthétique Xilogravura au cœur de la Roda.',
    contextPt: 'No cortejo, o Mestre comanda o Batuque tanto pelos gestos codificados de mãos e braços quanto pelo Apito. O Sequenciador grava esses sinais em estilo Xilogravura no centro da Roda.',
    stepsFr: [
      'Ouvrez A Oficina [O] > Édition & Scène > Signaux du Mestre (ou l’onglet Signaux du panneau latéral droit, ou l’onglet mobile Signes du Mestre).',
      'Prenez une photo fixe ou une séquence sur 4 temps à la caméra, ou importez un cliché existant dans le Labo Photo.',
      'Activez le détourage automatique et ajustez les curseurs de gravure sur bois Cordel (Seuil Noir, Contours Sobel, Grain bois, Cadrage sur les mains) puis enregistrez dans la galerie Cloud du groupe.',
      'Dans la Timeline ou le panneau Signaux, associez chaque signe à la mesure d’appel souhaitée : il s’affichera au médaillon central juste à temps pour préparer les musiciens.',
    ],
    stepsPt: [
      'Abra A Oficina [O] > Edição & Palco > Sinais do Mestre (ou a aba Sinais no painel direito, ou a aba móvel Sinais do Mestre).',
      'Capture uma foto fixa ou sequência de 4 tempos pela câmera, ou importe uma imagem no Labo Foto.',
      'Ative o recorte automático e ajuste os controles de gravura Cordel (Limiar preto, Contornos Sobel, Veio da madeira, Enquadramento das mãos) salvando na galeria em Nuvem.',
      'Na Linha do Tempo ou no painel Sinais, vincule cada sinal ao compasso da chamada: ele surgirá no medalhão central preparando os músicos.',
    ],
    tipFr: 'Mémorisez vos réglages d’éclairage favoris dans la barre de préréglages du Labo Photo pour harmoniser en 1 clic toute la série de signes de votre groupe.',
    tipPt: 'Salve seus ajustes favoritos de luz na barra do Labo Foto para padronizar em 1 clique toda a coleção de sinais do grupo.',
  },
  {
    id: 'p5-4',
    poleId: 'pole-5',
    level: 'studio',
    shortcut: 'Sauvegarder · WAV · Cloud',
    titleFr: 'Sauvegarder 100 % Cloud, Gabarits, Export WAV & Ponts O Girador',
    titlePt: 'Salvar 100 % em Nuvem, Modelos, WAV & Pontes O Girador',
    goalFr: 'Publier ses arrangements sans aucun fichier local, exporter un master audio et alimenter l’écosystème.',
    goalPt: 'Publicar arranjos sem arquivos locais, exportar áudio master e alimentar todo o ecossistema.',
    contextFr: 'Sequenciador élimine tout échange fragile de fichiers .json sur clé ou messagerie : le catalogue Cloud centralise les versions à jour tout en maintenant un cache hors-ligne automatique pour la rue.',
    contextPt: 'O Sequenciador elimina trocas frágeis de arquivos .json avulsos: o catálogo em Nuvem centraliza as versões atualizadas mantendo cache offline automático para a rua.',
    stepsFr: [
      'Ouvrez MENU > Sauvegarder le morceau (ou Mettre à jour le morceau) pour enregistrer dans le catalogue Cloud de votre groupe ; cochez Brouillon tant que l’arrangement doit rester réservé aux Mestres/Éditeurs.',
      'Dans A Oficina [O] > Son & Balanço > Mes Gabarits, sauvegardez votre configuration favorite de pistes, liaisons Maître/Esclave, accordages et Bus pour démarrer vos futurs morceaux en 1 clic.',
      'Depuis la barre de transport, exportez un fichier audio .wav (16-bit PCM stéréo sans perte) prêt à écouter ou partager.',
      SHOW_DANCADOR
        ? 'Publiez le Cloud Bounce audio et la structure temporelle vers Organizador (fiches élèves du Varal) et Dançador (création chorégraphique calée mesure par mesure).'
        : 'Publiez le Cloud Bounce audio et la structure temporelle vers Organizador (fiches élèves du Varal) et Cantador (synchronisation des Toadas).',
    ],
    stepsPt: [
      'Abra MENU > Salvar música (ou Atualizar música) para gravar no catálogo em Nuvem do grupo; marque Rascunho enquanto o arranjo for exclusivo para Mestres/Editores.',
      'Em A Oficina [O] > Som & Balanço > Meus Modelos, salve sua disposição favorita de faixas, vínculos Mestre/Escravo, afinações e Bus para iniciar novas músicas em 1 clique.',
      'Pela barra de transporte, exporte um arquivo de áudio .wav (16-bit PCM estéreo sem perdas) pronto para audição.',
      SHOW_DANCADOR
        ? 'Publique o Cloud Bounce de áudio e o mapa de compassos para o Organizador (fichas do Varal) e para o Dançador (coreografia sincronizada compasso a compasso).'
        : 'Publique o Cloud Bounce de áudio e o mapa de compassos para o Organizador (fichas do Varal) e para o Cantador (sincronização das Toadas).',
    ],
    tipFr: 'Définissez le morceau d’accueil par défaut de votre groupe via l’étoile du sélecteur de catalogue afin que chaque membre tombe immédiatement sur le chantier du moment.',
    tipPt: 'Defina a música padrão do seu grupo pela estrela no catálogo para que cada integrante abra diretamente o repertório em estudo.',
  },
];
