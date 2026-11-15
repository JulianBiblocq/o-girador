import { Language } from '../types';

export interface PedagogyEntryText {
  title: string;
  description: string;
}

const pair = (isFr: boolean, fr: [string, string], pt: [string, string]): PedagogyEntryText => ({
  title: isFr ? fr[0] : pt[0],
  description: isFr ? fr[1] : pt[1],
});

/**
 * Textes explicatifs officiels des peaux (droitier de référence ; l'inversion `Droite <-> Gauche` /
 * `Direita <-> Esquerda` sur titre + description est appliquée par `resolveStrokePedagogy`).
 */
export function resolveDrumStrokePedagogy(
  instId: string,
  semanticStroke: string,
  lang: Language
): PedagogyEntryText | null {
  const isFr = lang === 'fr';

  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    switch (semanticStroke) {
      case 'D': return pair(isFr, ['Main droite (Coup fort)', 'Frappe pleine de la grosse mailloche (maçaneta) au centre de la peau pour déployer toute la fondamentale grave du tambour.'], ['Mão direita (Golpe forte)', 'Pancada cheia da maçaneta no centro da pele para abrir todo o grave fundamental do tambor.']);
      case 'd': return pair(isFr, ['Main droite (Coup faible)', 'Coup léger joué près de la peau sans remonter haut, qui entretient le rebond tout en laissant résonner le grave.'], ['Mão direita (Golpe fraco)', 'Toque leve perto da pele sem subir muito a mão, mantendo o balanço enquanto o grave continua soando.']);
      case 'E': return pair(isFr, ['Main gauche (Coup fort)', 'Frappe accentuée de la baguette gauche au centre de la peau.'], ['Mão esquerda (Golpe forte)', 'Toque acentuado da baqueta esquerda no centro da pele.']);
      case 'e': return pair(isFr, ['Main gauche (Coup faible)', "Frappe légère de la baguette gauche qui met déjà la peau en vibration, souvent juste avant d'appuyer et d'ouvrir le coup fort de la main droite."], ['Mão esquerda (Golpe fraco)', 'Toque leve da baqueta esquerda que já coloca a pele em vibração, preparando a chegada do golpe forte da mão direita.']);
      case 'A': case 'a': return pair(isFr, ['Étouffé (Abafado)', 'Baguette gauche plaquée contre la peau pour couper net la résonance du coup précédent, avant de se décoller juste avant la frappe suivante.'], ['Abafado', 'Baqueta esquerda apoiada na pele para cortar a ressonância do golpe anterior, desencostando logo antes da batida seguinte.']);
      case 'I': return pair(isFr, ['Bacalhau (Igarassu)', "Frappe fouettée jouée avec une baguette fine et souple (bacalhau) en main gauche, signature du jeu d'Igarassu."], ['Bacalhau (Igarassu)', 'Toque estalado tocado com a vareta fina e flexível (bacalhau) na mão esquerda, assinatura do baque de Igarassu.']);
      case 'C': return pair(isFr, ['Clic de baguettes', "Choc sec des deux baguettes entrechoquées en l'air au-dessus du fût, sans toucher la peau."], ['Clique de baquetas', 'Estalo seco das duas baquetas batidas no ar acima do tambor, sem tocar a pele.']);
      case 'X': return pair(isFr, ['Cerclage (Aro)', "Coup sec du bois de la baguette directement sur l'arceau en bois du tambour."], ['Aro', 'Toque seco da madeira da baqueta diretamente no aro de madeira da alfaia.']);
      case 'B': return pair(isFr, ['Barulho (Grondement)', 'Roulement continu alterné des deux baguettes faisant gronder et vibrer longuement la peau du fût.'], ['Barulho (Vibração)', 'Rulo contínuo alternado das duas baquetas fazendo a pele vibrar profundamente.']);
      case 'b': return pair(isFr, ['Barulho doux (Fade-In)', 'Entrée progressive du roulement continu des deux baguettes sans attaque initiale marquée.'], ['Barulho suave (Fade-In)', 'Entrada progressiva do rulo contínuo das duas baquetas sem ataque inicial acentuado.']);
      case '/': return pair(isFr, ['Extinction Barulho (Fade-Out)', "Décroissance contrôlée du roulement continu jusqu'à l'extinction."], ['Extinção do Barulho (Fade-Out)', 'Decaimento controlado do rulo contínuo até silenciar.']);
      case '.': return pair(isFr, ['Fin du Barulho', 'Arrêt franc et immédiat du roulement continu pour libérer le silence.'], ['Fim do Barulho', 'Corte imediato do rulo contínuo abrindo espaço para o silêncio.']);
      default: return null;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    const isUpper = semanticStroke === semanticStroke.toUpperCase();
    const handFr = isUpper ? 'Main droite' : 'Main gauche';
    const handPt = isUpper ? 'Mão direita' : 'Mão esquerda';
    const sideFr = isUpper ? 'Droite' : 'Gauche';
    const sidePt = isUpper ? 'Direita' : 'Esquerda';
    switch (semanticStroke) {
      case 'D': case 'E': return pair(isFr, [`${handFr} (Coup fort)`, 'Frappe franche au centre de la peau mettant pleinement en vibration le timbre métallique.'], [`${handPt} (Golpe forte)`, 'Toque firme no centro da pele colocando a esteira metálica em plena vibração.']);
      case 'd': case 'e': return pair(isFr, [`${handFr} (Coup faible)`, 'Frappe légère qui tisse le tapis continu (malha) en doubles-croches entre les accents.'], [`${handPt} (Golpe fraco)`, 'Toque leve que tece a malha contínua de semicolcheias entre os acentos.']);
      case 'R': case 'r': return pair(isFr, [`Rufada (Roulement court — ${sideFr})`, 'Roulé pressé très serré au centre de la peau qui densifie le grain du timbre sur un pas.'], [`Rufada (Rulo curto — ${sidePt})`, 'Rulo pressionado bem fechado no centro da pele que adensa a esteira em um passo.']);
      case 'F': case 'f': return pair(isFr, [`Fla (${sideFr})`, "Double attaque très rapprochée où une petite note précède d'un éclair le coup principal de l'autre main pour élargir l'impact."], [`Fla (${sidePt})`, 'Ataque duplo bem próximo em que uma nota curta antecede o golpe principal da outra mão para encorpar o impacto.']);
      case 'A': case 'a': return pair(isFr, [`Rimshot / Pele e Aro (${sideFr})`, "Coup surpuissant frappé près du bord en percutant simultanément la peau avec l'olive et le cerclage avec le col de la baguette."], [`Ataque Pele e Aro / Rimshot (${sidePt})`, 'Golpe potente perto da borda atingindo simultaneamente a pele com a ponta e o aro com o pescoço da baqueta.']);
      case 'C': return pair(isFr, ['Clic de baguettes', "Choc sec des deux baguettes entrechoquées en l'air."], ['Clique de baquetas', 'Estalo seco das duas baquetas batidas no ar.']);
      case 'X': return pair(isFr, ['Cerclage (Aro)', 'Coup sec frappé uniquement sur le cerclage, sans toucher la peau.'], ['Aro', 'Toque seco batido apenas no aro, sem tocar a pele.']);
      case 'B': case 'b': return pair(isFr, ['Barulho (Roulement continu)', "Roulement tenu faisant vibrer le timbre sur toute la durée de l'appel."], ['Barulho (Rulo contínuo)', 'Rulo sustentado fazendo vibrar a esteira durante toda a chamada.']);
      default: return null;
    }
  }

  if (instId === 'timbal') {
    const isRight = semanticStroke === semanticStroke.toUpperCase();
    const sideFr = isRight ? 'Droite' : 'Gauche';
    const sidePt = isRight ? 'Direita' : 'Esquerda';
    switch (semanticStroke) {
      case 'G': case 'g': return pair(isFr, [`Grave / Basse (${sideFr} ${semanticStroke})`, 'Frappe paume pleine et doigts joints vers le centre de la peau, main aussitôt relevée pour libérer la basse ronde.'], [`Grave (${sidePt} ${semanticStroke})`, 'Golpe de palma cheia e dedos unidos rumo ao centro da pele, soltando logo a mão para abrir o grave redondo.']);
      case 'A': case 'a': return pair(isFr, [`Ton ouvert / Aberto (${sideFr} ${semanticStroke})`, "Frappe franche des doigts joints sur le bord de la peau laissant chanter l'harmonique claire du fût."], [`Aberto (${sidePt} ${semanticStroke})`, 'Toque firme dos dedos unidos na borda da pele deixando cantar o harmônico aberto do timbal.']);
      case 'S': case 's': return pair(isFr, [`Claqué / Slap (${sideFr} ${semanticStroke})`, "Fouetté explosif des doigts légèrement ouverts entre le bord et le centre avec retrait réflexe pour faire claquer l'aigu."], [`Slap / Estalo (${sidePt} ${semanticStroke})`, 'Chicoteada explosiva dos dedos levemente abertos entre a borda e o centro para estalar o agudo.']);
      case 'D': case 'd': return pair(isFr, [`Doigts / Fantôme (${sideFr} ${semanticStroke})`, 'Toucher léger du bout des doigts (ponta de dedos) au ras de la peau pour garnir le groove.'], [`Ponta de dedos / Fantasma (${sidePt} ${semanticStroke})`, 'Toque leve da ponta dos dedos rente à pele para preencher a levada.']);
      case 'P': case 'p': return pair(isFr, [`Pressé / Fermé (${sideFr} ${semanticStroke})`, 'Frappe mate où la main reste appuyée sur la peau pour étouffer net la résonance ouverte.'], [`Preso / Fechado (${sidePt} ${semanticStroke})`, 'Toque seco em que a mão permanece apoiada na pele para abafar a ressonância.']);
      case 'F': case 'f': return pair(isFr, [`Fla ouvert (${sideFr} ${semanticStroke})`, 'Appoggiature rapide des deux mains débouchant sur un ton ouvert Aberto.'], [`Fla aberto (${sidePt} ${semanticStroke})`, 'Apogiatura rápida das duas mãos desembocando num toque Aberto.']);
      case 'V': case 'v': return pair(isFr, [`Fla claqué (${sideFr} ${semanticStroke})`, 'Appoggiature rapide des deux mains débouchant sur un Slap tranchant.'], [`Fla slap (${sidePt} ${semanticStroke})`, 'Apogiatura rápida das duas mãos desembocando num Slap cortante.']);
      case 'C': return pair(isFr, ['Clap', 'Claquement sec des mains.'], ['Palma (Clap)', 'Palma seca das mãos.']);
      case 'B': case 'b': return pair(isFr, ['Barulho (Roulement continu)', 'Roulement rapide alterné des deux mains faisant gronder la peau en continu.'], ['Barulho (Rulo contínuo)', 'Rulo rápido alternado das duas mãos fazendo vibrar a pele continuamente.']);
      default: return null;
    }
  }

  return null;
}
