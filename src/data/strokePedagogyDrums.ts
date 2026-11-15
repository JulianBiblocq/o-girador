import { Language } from '../types';

export interface PedagogyEntryText {
  title: string;
  description: string;
}

const pair = (isFr: boolean, fr: [string, string], pt: [string, string]): PedagogyEntryText => ({
  title: isFr ? fr[0] : pt[0],
  description: isFr ? fr[1] : pt[1],
});

export function resolveDrumStrokePedagogy(
  instId: string,
  semanticStroke: string,
  isLeftHanded: boolean,
  lang: Language
): PedagogyEntryText | null {
  const isFr = lang === 'fr';
  const domHand = isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita');
  const secHand = isFr ? (isLeftHanded ? 'Main Droite' : 'Main Gauche') : (isLeftHanded ? 'Mão Direita' : 'Mão Esquerda');

  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    const stickFr = instId === 'repique' ? 'la batte fine' : 'la maçaneta lourde';
    const stickPt = instId === 'repique' ? 'a baqueta fina' : 'a maçaneta pesada';
    switch (semanticStroke) {
      case 'D': return pair(isFr, [`Maçaneta Forte (${domHand})`, `Frappe pleine au centre de la peau avec ${stickFr}, projetant le grave fondamental du baque.`], [`Maçaneta Forte (${domHand})`, `Golpe cheio no centro da pele com ${stickPt}, projetando o grave fundamental do baque.`]);
      case 'd': return pair(isFr, [`Maçaneta Douce (${domHand})`, `Frappe retenue au centre avec ${stickFr} pour préparer un appel ou nuancer la pulsation.`], [`Maçaneta Fraca (${domHand})`, `Golpe contido no centro com ${stickPt} para preparar uma chamada ou suavizar a pulsação.`]);
      case 'E': return pair(isFr, [`Bacalhau Fort (${secHand})`, 'Frappe vive de la baguette fine sur la peau assurant la réponse rythmique et le repique.'], [`Bacalhau Forte (${secHand})`, 'Golpe vivo do bacalhau na pele sustentando a resposta rítmica e o repique.']);
      case 'e': return pair(isFr, [`Bacalhau Doux (${secHand})`, 'Touche légère du bacalhau remplissant la subdivision sans alourdir le grave.'], [`Bacalhau Fraco (${secHand})`, 'Toque leve do bacalhau preenchendo a subdivisão sem pesar sobre o grave.']);
      case 'A':
      case 'a': return pair(isFr, [`Abafado — Étouffé (${secHand})`, 'Baguette secondaire plaquée contre la peau pour couper net la résonance précédente avant de se décoller à la frappe suivante.'], [`Abafado Seco (${secHand})`, 'Baqueta secundária apoiada contra a pele para estancar a ressonância anterior antes de desencostar no toque seguinte.']);
      case 'I': return pair(isFr, ["Bacalhau d'Igarassu", 'Coup de bacalhau fouetté et incisif typique de la frappe traditionnelle sèche.'], ['Bacalhau de Igarassu', 'Golpe estalado e incisivo de bacalhau característico do sotaque tradicional seco.']);
      case 'C': return pair(isFr, ['Clic de Baguettes', "Entrechoquement sec de la maçaneta et du bacalhau en l'air au-dessus du fût."], ['Click de Baquetas', 'Toque seco entre a maçaneta e o bacalhau no ar acima do tambor.']);
      case 'X': return pair(isFr, ['Cerclage (Aro)', "Frappe boisée et sèche directement sur l'arceau supérieur de l'alfaia."], ['Toque no Aro', 'Golpe amadeirado e seco diretamente no aro superior da alfaia.']);
      case 'B': return pair(isFr, ['Barulho (Appel + Tenue)', "Roulement continu puissant remplissant l'espace sonore lors des appels et coupures."], ['Barulho (Chamada + Sustentação)', 'Rulo contínuo e cheio preenchendo o espaço sonoro nas chamadas e convenções.']);
      case 'b': return pair(isFr, ['Barulho Doux (Fade-In)', 'Entrée progressive du roulement continu sans attaque initiale marquée.'], ['Barulho Suave (Fade-In)', 'Entrada progressiva do rulo contínuo sem ataque inicial acentuado.']);
      case '/': return pair(isFr, ['Extinction Barulho (Fade-Out)', "Décroissance contrôlée du roulement continu jusqu'à l'extinction."], ['Extinção do Barulho (Fade-Out)', 'Decaimento controlado do rulo contínuo até silenciar.']);
      case '.': return pair(isFr, ['Fin du Barulho', 'Arrêt franc et immédiat du roulement continu pour libérer le silence.'], ['Fim do Barulho', 'Corte imediato do rulo contínuo abrindo espaço para o silêncio.']);
      default: return null;
    }
  }

  if (instId === 'caixa' || instId === 'tarol') {
    switch (semanticStroke) {
      case 'D': return pair(isFr, [`Frappe Forte (${domHand})`, 'Coup franc au centre de la peau faisant claquer pleinement le timbre métallique (esteira).'], [`Toque Forte (${domHand})`, 'Golpe firme no centro da pele acionando com brilho toda a esteira.']);
      case 'd': return pair(isFr, [`Ghost Note (${domHand})`, 'Rebond rasant à faible hauteur entretenant le tapis continu de doubles-croches.'], [`Ghost Note (${domHand})`, 'Toque baixo e leve sustentando a malha contínua de semicolcheias.']);
      case 'E': return pair(isFr, [`Frappe Forte (${secHand})`, 'Accent plein au centre de la peau équilibrant le dialogue des deux mains.'], [`Toque Forte (${secHand})`, 'Acento cheio no centro da pele equilibrando a alternância das mãos.']);
      case 'e': return pair(isFr, [`Ghost Note (${secHand})`, "Note fantôme souple nourrissant le grain serré de l'accompagnement."], [`Ghost Note (${secHand})`, 'Nota fantasma macia alimentando o preenchimento contínuo da levada.']);
      case 'A': return pair(isFr, [`Rimshot (${domHand} — Peau & Cerclage)`, "Coup puissant frappé simultanément près du bord de la peau avec l'olive et sur le cerclage avec le col de la baguette."], [`Rimshot (${domHand} — Ataque Pele e Aro)`, 'Golpe potente tocado simultaneamente perto da borda da pele com a ponta e no aro com o pescoço da baqueta.']);
      case 'a': return pair(isFr, [`Rimshot (${secHand} — Peau & Cerclage)`, "Coup tranchant frappé simultanément près du bord de la peau avec l'olive et sur le cerclage avec le col de la baguette."], [`Rimshot (${secHand} — Ataque Pele e Aro)`, 'Golpe cortante tocado simultaneamente perto da borda da pele com a ponta e no aro com o pescoço da baqueta.']);
      case 'R': return pair(isFr, [`Rufada (${domHand})`, 'Roulé pressé court écrasant le rebond pour faire chanter densément le timbre.'], [`Rufada (${domHand})`, 'Rulo curto pressionado fazendo a esteira vibrar com densidade.']);
      case 'r': return pair(isFr, [`Rufada (${secHand})`, 'Roulé pressé court amorcé par la main secondaire pour lier deux accents.'], [`Rufada (${secHand})`, 'Rulo curto pressionado iniciado pela mão secundária ligando os acentos.']);
      case 'F': return pair(isFr, [`Fla (${domHand})`, "Appoggiature serrée à deux baguettes élargissant l'attaque principale."], [`Fla (${domHand})`, 'Apogiatura curta de duas baquetas encorpando o ataque principal.']);
      case 'f': return pair(isFr, [`Fla (${secHand})`, 'Appoggiature serrée à deux baguettes conclue sur la main secondaire.'], [`Fla (${secHand})`, 'Apogiatura curta de duas baquetas resolvendo na mão secundária.']);
      case 'C': return pair(isFr, ['Clic de Baguettes', "Choc sec des deux baguettes entrechoquées en l'air pour marquer le décompte ou une pause."], ['Click de Baquetas', 'Estalo seco das duas baquetas batidas no ar marcando contagem ou breque.']);
      case 'X': return pair(isFr, ['Cerclage (Aro)', 'Clic métallique sec du fût de la baguette posé sur le cerclage sans frapper la peau.'], ['Toque no Aro', 'Estalo metálico seco do corpo da baqueta no aro sem atacar a pele.']);
      case 'B':
      case 'b': return pair(isFr, ['Barulho (Roulement Continu)', 'Roulement soutenu des deux mains faisant gronder la caisse en continu.'], ['Barulho (Rulo Contínuo)', 'Rulo sustentado das duas mãos mantendo a vibração contínua da caixa.']);
      default: return null;
    }
  }

  if (instId === 'timbal') {
    const hand = semanticStroke === semanticStroke.toUpperCase() ? domHand : secHand;
    switch (semanticStroke) {
      case 'G': case 'g': return pair(isFr, [`Basse (${hand})`, 'Paume souple rebondissant vers le centre de la peau pour libérer le grave rond du fût.'], [`Baixo (${hand})`, 'Palma solta no centro da pele extraindo o grave redondo e profundo do timbal.']);
      case 'A': case 'a': return pair(isFr, [`Ton Ouvert (${hand})`, 'Doigts joints frappant au bord de la peau pour un médium clair et chantant.'], [`Aberto (${hand})`, 'Dedos unidos na borda da pele produzindo o médio aberto e projetado.']);
      case 'S': case 's': return pair(isFr, [`Slap Claqué (${hand})`, 'Fouetté vif des doigts relâchés près du rebord produisant un harmonique aigu explosif.'], [`Slap Estalado (${hand})`, 'Chicoteio rápido dos dedos na borda gerando o agudo estalado característico.']);
      case 'D': case 'd': return pair(isFr, [`Toucher Fantôme (${hand})`, 'Effleurement léger du bout des doigts articulant la subdivision interne.'], [`Dedilhado (${hand})`, 'Toque leve da ponta dos dedos preenchendo a subdivisão interna.']);
      case 'P': case 'p': return pair(isFr, [`Pressé Étouffé (${hand})`, 'Frappe mate où la main reste appuyée sur la peau pour bloquer les harmoniques.'], [`Preso Abafado (${hand})`, 'Toque seco mantendo a mão apoiada na pele para conter os harmônicos.']);
      case 'F': case 'f': return pair(isFr, [`Fla Ouvert (${hand})`, 'Double attaque rapprochée des deux mains en ton ouvert chantant.'], [`Fla Aberto (${hand})`, 'Ataque duplo aproximado das duas mãos em som aberto.']);
      case 'V': case 'v': return pair(isFr, [`Fla Claqué (${hand})`, 'Double attaque explosive des deux mains terminée en slap aigu.'], [`Fla Slap (${hand})`, 'Ataque duplo explosivo das duas mãos resolvendo em slap agudo.']);
      case 'C': return pair(isFr, ['Clap de Mains', "Claquement sec des paumes l'une contre l'autre pour ponctuer une coupure."], ['Clap de Mãos', 'Palma seca entre as mãos pontuando convenções e breques.']);
      case 'B': case 'b': return pair(isFr, ['Barulho (Roulement)', 'Roulement rapide alterné des deux mains sur la peau du timbal.'], ['Barulho (Rulo)', 'Rulo rápido alternado das duas mãos sobre a pele do timbal.']);
      default: return null;
    }
  }

  return null;
}
