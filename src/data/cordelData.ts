export interface Folheto {
  id: string;
  title: {
    fr: string;
    pt: string;
  };
  shortDescription: {
    fr: string;
    pt: string;
  };
  culturalContent: {
    fr: string;
    pt: string;
  };
  associatedGameId: 'quiz' | 'dictee' | 'inspecteur' | 'mestre' | 'rythmelive';
}

export const folhetosData: Folheto[] = [
  {
    id: 'folheto_quiz',
    title: {
      fr: 'Origines du Maracatu Nação',
      pt: 'Origens do Maracatu Nação'
    },
    shortDescription: {
      fr: 'Découvrez les racines sacrées et historiques du Maracatu Nação.',
      pt: 'Descubra as raízes sagradas e históricas do Maracatu Nação.'
    },
    culturalContent: {
      fr: `Le Maracatu Nação (ou Maracatu de Baque Virado) est une manifestation culturelle afro-brésilienne originaire de l'État du Pernambouc, principalement à Recife et Olinda. Il est né à l'époque coloniale de la cérémonie du "Couronnement des Rois Noirs" (les Rois du Congo), une tradition autorisée par les maîtres d'esclaves pour maintenir une cohésion sociale tout en s'assurant le contrôle des populations asservies.

Derrière cette tolérance administrative se cachait une résistance culturelle et religieuse profonde. Les communautés d'esclaves y ont préservé leurs croyances ancestrales à travers le syncrétisme, mêlant les cultes des Orixás de la religion de tradition Nagô (Xangô du Pernambouc) et du Candomblé avec des figures catholiques comme Notre-Dame du Rosaire.

Aujourd'hui, chaque "Nação" est menée par une cour royale (le Roi, la Reine, la Dame de la Cour) qui défile solennellement dans la rue au son lourd et vibrant des tambours, célébrant la fierté, la mémoire et la résistance de l'identité noire brésilienne.`,
      pt: `O Maracatu Nação (ou Maracatu de Baque Virado) é uma manifestação cultural afro-brasileira originária do estado de Pernambuco, principalmente de Recife e Olinda. Nasceu no período colonial da cerimônia do "Coroamento dos Reis Negros" (Reis do Congo), uma tradição autorizada pelos senhores de escravos para manter a coesão social enquanto exerciam o controle.

Por trás desta tolerância administrativa escondia-se uma profunda resistência cultural e religiosa. As comunidades de escravizados preservaram suas crenças ancestrais através do sincretismo, fundindo os cultos dos Orixás da tradição Nagô (Xangô de Pernambuco) com figuras católicas como Nossa Senhora do Rosário.

Hoje, cada "Nação" é liderada por uma corte real (o Rei, a Rainha, a Dama do Paço) que desfila solenemente na rua ao som pesado e vibrante dos tambores, celebrando o orgulho, a memória e a resistência da identidade negra brasileira.`
    },
    associatedGameId: 'quiz'
  },
  {
    id: 'folheto_dictee',
    title: {
      fr: 'Le Rythme et le Baque',
      pt: 'O Ritmo e o Baque'
    },
    shortDescription: {
      fr: 'Apprenez les secrets du Baque et le rythme de base.',
      pt: 'Aprenda os segredos do Baque e o ritmo de base.'
    },
    culturalContent: {
      fr: `Le terme "Baque" désigne à la fois le rythme, le battement de tambour et la manière de jouer propre à chaque Nação. Le Maracatu de Baque Virado se distingue par des rythmes syncopés et un groove lourd caractérisé par le jeu des Alfaias (tambours en bois avec peaux animales).

Le rythme repose sur des polyrythmies complexes où le temps fort est souvent déplacé (d'où le terme "Baque Virado", ou "rythme retourné"). Le dialogue rythmique se fait principalement entre les Alfaias (qui jouent la basse avec des coups ouverts et étouffés) et la cloche de fer Gonguê, qui maintient la pulsation maîtresse (la ligne de temps ou "timeline").

En jouant et en écoutant les différents instruments, on ressent cette tension constante entre la rigueur de la pulsation et le balancement naturel des syncopes, qui crée la transe caractéristique du Maracatu.`,
      pt: `O termo "Baque" refere-se tanto ao ritmo, quanto à batida do tambor e ao estilo de tocar próprio de cada Nação. O Maracatu de Baque Virado se destaca por seus ritmos sincopados e um groove pesado caracterizado pelo toque das Alfaias (tambores de madeira com peles animais).

O ritmo baseia-se em polirritmias complexas onde o tempo forte é frequentemente deslocado (daí o termo "Baque Virado"). O diálogo rítmico ocorre principalmente entre as Alfaias (que tocam os graves com golpes abertos e abafados) e o Gonguê (sino de metal), que mantém a pulsação mestra.

Ao tocar e ouvir os diferentes instrumentos, sente-se a tensão constante entre o rigor da pulsação e o balanço natural das síncopas, criando o transe característico do Maracatu.`
    },
    associatedGameId: 'dictee'
  },
  {
    id: 'folheto_inspecteur',
    title: {
      fr: "Les Instruments de l'Orchestre",
      pt: 'Os Instrumentos da Orquestra'
    },
    shortDescription: {
      fr: "Explorez l'orchestre traditionnel : Alfaias, Gonguê, Agbê et Caixa.",
      pt: 'Explore a orquestra tradicional: Alfaias, Gonguê, Agbê e Caixa.'
    },
    culturalContent: {
      fr: `L'orchestre du Maracatu Nação (appelé aussi "Baque" ou "Terno") est constitué exclusivement de percussions :
- L'Alfaia : Le tambour roi, fabriqué en bois de macaíba et tendu par des cordes. Il existe plusieurs tailles : la Marcação (basse lourde), le Meião (moyen pour le contretemps) et le Dino ou Repique (aigu pour les improvisations).
- Le Gonguê : Une grande cloche métallique unique, frappée avec une baguette de fer. C'est le guide temporel de tout le groupe.
- L'Agbê : Une calebasse entourée d'un filet de perles ou de graines. Il apporte une texture métallique brillante et fluide.
- La Caixa de Guerra : Caisse claire qui assure le flux rythmique continu par ses roulements rapides et dynamiques.
- Le Mineiro : Un shaker cylindrique en métal rempli de graines, complétant la texture de l'Agbê.`,
      pt: `A orquestra do Maracatu Nação (também chamada de "Baque" ou "Terno") é composta exclusivamente por percussões:
- A Alfaia: O tambor rei, feito de madeira de macaíba e tensionado por cordas. Há vários tamanhos: a Marcação (grave pesado), o Meião (médio para o contratempo) e o Dino ou Repique (agudo para improvisos).
- O Gonguê: Um grande sino de metal, tocado com uma baqueta de ferro. É o guia temporal de todo o grupo.
- O Agbê: Uma cabaça revestida com uma rede de contas ou sementes. Traz uma textura brilhante e fluida.
- A Caixa de Guerra: Caixa clara que assegura o fluxo rítmico contínuo com seus toques rápidos.
- O Mineiro: Um chocalho cilíndrico de metal preenchido com sementes, completando a textura do Agbê.`
    },
    associatedGameId: 'inspecteur'
  },
  {
    id: 'folheto_mestre',
    title: {
      fr: 'Le Rôle du Mestre de Bateria',
      pt: 'O Papel do Mestre de Bateria'
    },
    shortDescription: {
      fr: 'Comprenez la direction et la transmission orale des signaux.',
      pt: 'Entenda a regência e a transmissão oral dos sinais.'
    },
    culturalContent: {
      fr: `Le Mestre (maître de batterie) est le chef d'orchestre du Maracatu. Dans une Nação, les signaux ne sont pas écrits mais transmis oralement et visuellement. Le Mestre utilise un sifflet (Apito) et des mouvements de bras codifiés (les signaux) pour communiquer avec les batuqueiros.

Il dirige les entrées, les coupures (Paradas), les variations rythmiques (Viradas) et gère les accélérations de tempo. Être Mestre demande non seulement une oreille absolue du rythme, mais aussi un charisme immense et une connaissance intime de l'histoire et des traditions spirituelles de la Nação.

Le dialogue entre le Mestre et la batterie est instantané : un coup de sifflet court ou un geste précis peut faire basculer instantanément 100 percussionnistes d'un rythme de base vers un rufo (roulement) ou une parade spectaculaire.`,
      pt: `O Mestre (mestre de bateria) é o regente do Maracatu. Numa Nação, os sinais não são escritos, mas transmitidos oralmente e visualmente. O Mestre usa um apito e movimentos codificados de braços (sinais) para se comunicar.

Ele comanda as entradas, cortes (Paradas), variações (Viradas) e acelerações de andamento. Ser Mestre exige ouvido absoluto do ritmo, imenso carisma e conhecimento das tradições espirituais da Nação.

O diálogo entre o Mestre e a bateria é instantâneo: um sopro de apito ou um gesto pode fazer 100 percussionistas mudarem instantaneamente do ritmo base para um rufo ou parada espetacular.`
    },
    associatedGameId: 'mestre'
  },
  {
    id: 'folheto_rythmelive',
    title: {
      fr: 'Le Défilé et la Parade de Rue',
      pt: 'O Desfile e a Parade de Rua'
    },
    shortDescription: {
      fr: "Vivez la ferveur et l'énergie du défilé pendant le Carnaval.",
      pt: 'Viva o fervor e a energia do desfile durante o Carnaval.'
    },
    culturalContent: {
      fr: `Le Maracatu Nação prend tout son sens dans le défilé de rue, en particulier lors du Carnaval de Recife et d'Olinda. C'est un spectacle total qui mêle musique sacrée, danse rituelle et costumes fastueux inspirés de la cour baroque européenne du XVIIIe siècle.

Le cortège s'organise en plusieurs sections : la cour royale ouvre la marche, entourée de gardes, de vassaux et de la célèbre Calunga (une poupée de cire, de bois ou de plastique vêtue de brocarts, qui abrite les esprits des ancêtres de la Nação et est portée par la Dame de la Cour). Derrière la cour royale vient la batterie (les batuqueiros), qui propulse le cortège avec une puissance sonore physique inouïe qui fait vibrer le sol.

Le défilé est un moment de transe collective où la musique, les danses et l'énergie spirituelle des ancêtres fusionnent dans un rituel joyeux de mémoire et d'affirmation culturelle.`,
      pt: `O Maracatu Nação ganha todo o sentido no desfile de rua, especialmente no Carnaval de Recife e Olinda. É um espetáculo total que mistura música sagrada, dança ritual e figurinos luxuosos inspirados na corte barroca europeia do século XVIII.

O cortejo tem várias seções: a corte real abre o caminho, cercada por guardas, vassalos e a famosa Calunga (boneca de cera ou madeira, vestida com brocados, que abriga os espíritos dos ancestrais e é carregada pela Dama do Paço). Atrás vem a bateria (batuqueiros), com uma força sonora incrível.

O desfile é um momento de transe coletivo onde a música, a dança e a energia espiritual dos antepassados se fundem num ritual alegre de memória e afirmação cultural.`
    },
    associatedGameId: 'rythmelive'
  }
];
