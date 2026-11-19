import { Language } from '../types';
import { PedagogyEntryText } from './strokePedagogyDrums';

const pair = (isFr: boolean, fr: [string, string], pt: [string, string]): PedagogyEntryText => ({
  title: isFr ? fr[0] : pt[0],
  description: isFr ? fr[1] : pt[1],
});

function resolveBarulhoEnvelopePedagogy(sym: string, isFr: boolean): PedagogyEntryText | null {
  if (sym === 'b') return pair(isFr, ['Barulho doux (Fade-In)', 'Entrée progressive du Barulho continu sans attaque initiale marquée.'], ['Barulho suave (Fade-In)', 'Entrada progressiva do Barulho contínuo sem ataque inicial acentuado.']);
  if (sym === '/') return pair(isFr, ['Extinction Barulho (Fade-Out)', "Décroissance contrôlée du Barulho continu jusqu'à l'extinction."], ['Extinção do Barulho (Fade-Out)', 'Decaimento controlado do Barulho contínuo até silenciar.']);
  if (sym === '.') return pair(isFr, ['Fin du Barulho', 'Arrêt franc et immédiat du Barulho continu pour libérer le silence.'], ['Fim do Barulho', 'Corte imediato do Barulho contínuo abrindo espaço para o silêncio.']);
  return null;
}

export function resolveMetalShakerVocalPedagogy(
  instId: string,
  instType: string,
  semanticStroke: string,
  lang: Language
): PedagogyEntryText | null {
  const isFr = lang === 'fr';

  if (instId === 'gongue' || instType === 'gongue') {
    const env = resolveBarulhoEnvelopePedagogy(semanticStroke, isFr);
    if (env) return env;
    switch (semanticStroke) {
      case 'G': return pair(isFr, ['Grave fort (Haut de la cloche)', 'Frappe franche avec la large baguette en nylon (ou en bois) en haut de la cloche, près de la bouche (ouverture), produisant la note grave pleine avec très peu de rebond.'], ['Grave forte (Topo da campana)', 'Toque firme com a baqueta larga de nylon (ou madeira) no alto da campana, perto da boca, produzindo a nota grave cheia com pouquíssimo rebote.']);
      case 'g': return pair(isFr, ['Grave faible (Haut de la cloche)', 'Frappe retenue en haut près de la bouche de la cloche pour poser la note grave en nuance.'], ['Grave fraco (Topo da campana)', 'Toque contido no alto, perto da boca da campana, para apoiar a nota grave com dinâmica suave.']);
      case 'A': return pair(isFr, ['Aigu fort (Base de la cloche)', 'Frappe franche en bas vers la base (le col) de la cloche, là où le métal plus épais et rigide produit la note aiguë.'], ['Agudo forte (Base da campana)', 'Toque firme embaixo, perto da base da campana, onde o ferro mais espesso e rígido produz a nota aguda.']);
      case 'a': return pair(isFr, ['Aigu faible (Base de la cloche)', 'Frappe légère vers la base de la cloche pour articuler la phrase.'], ['Agudo fraco (Base da campana)', 'Toque leve perto da base da campana para articular a frase rítmica.']);
      case 'X': return pair(isFr, ['Arrêt étouffé (Parada)', 'Baguette écrasée et maintenue plaquée contre la cloche en fer forgé sans rebondir pour couper net toute résonance.'], ['Parada (Toque abafado)', 'Baqueta apoiada e mantida presa contra a campana de ferro forjado sem rebote para cortar imediatamente a ressonância.']);
      case 'B': return pair(isFr, ['Barulho (Roulement continu)', 'Battement rapide et continu de la baguette faisant résonner le fer de la cloche.'], ['Barulho (Rulo contínuo)', 'Batimento rápido e contínuo da baqueta fazendo vibrar o ferro da campana.']);
      default: return null;
    }
  }

  if (instId === 'agbe') {
    const env = resolveBarulhoEnvelopePedagogy(semanticStroke, isFr);
    if (env) return env;
    const isStrong = semanticStroke === semanticStroke.toUpperCase();
    switch (semanticStroke) {
      case 'D': case 'd': return pair(isFr, [`Droite (${isStrong ? 'Fort' : 'Faible'})`, 'Retour latéral où la main droite ramène la calebasse vers la droite, faisant glisser et claquer le filet de perles sur le flanc opposé (ample sur D, court sur d).'], [`Direita (${isStrong ? 'Forte' : 'Fraco'})`, 'Movimento de retorno em que a mão direita traz a cabaça para a direita, fazendo a malha de contas deslizar e estalar no flanco oposto (amplo em D, curto em d).']);
      case 'E': case 'e': return pair(isFr, [`Gauche (${isStrong ? 'Fort' : 'Faible'})`, 'La calebasse, tenue par le col dans la main droite, va vers la gauche et la main gauche la frappe de la paume en faisant claquer le filet de perles (franc sur E, léger sur e).'], [`Esquerda (${isStrong ? 'Forte' : 'Fraco'})`, 'A cabaça, segurada pelo pescoço na mão direita, vai para a esquerda e a mão esquerda bate nela com a palma, fazendo estalar a malha de contas (firme em E, leve em e).']);
      case 'S': return pair(isFr, ['Salto (Lancer haut)', 'Projection vive vers le haut qui soulève la calebasse et met le filet en suspension avant sa retombée.'], ['Salto (Impulso alto)', 'Projeção viva para cima que ergue a cabaça e suspende a malha antes da queda.']);
      case 'V': case 'v': return pair(isFr, ['Volta (Retour bas)', 'Chute contrôlée et impact franc vers le bas lorsque la calebasse retombe dans les mains.'], ['Volta (Retorno baixo)', 'Descida controlada e impacto firme para baixo quando a cabaça retorna às mãos.']);
      case 'B': return pair(isFr, ['Barulho (Secouement continu)', 'Agitation rapide sur place faisant crépiter toutes les perles en continu.'], ['Barulho (Agitação contínua)', 'Agitação rápida no lugar fazendo todas as contas crepitarem continuamente.']);
      default: return null;
    }
  }

  if (instId === 'mineiro') {
    const env = resolveBarulhoEnvelopePedagogy(semanticStroke, isFr);
    if (env) return env;
    switch (semanticStroke) {
      case 'P': return pair(isFr, ['Poussé fort (Projetar)', "Projection sèche et bloquée vers l'avant qui plaque les graines/billes d'un coup net contre la paroi frontale."], ['Projetar forte (Para frente)', 'Projeção seca e travada para a frente que lança as contas de uma só vez contra a parede frontal.']);
      case 'p': return pair(isFr, ['Poussé faible', "Léger rebond vers l'avant entretenant le débit avec un minimum de mouvement des mains."], ['Projetar fraco', 'Leve rebote para a frente mantendo a subdivisão com movimento mínimo das mãos.']);
      case 'T': return pair(isFr, ['Tiré fort (Trazer)', 'Rappel franc du cylindre vers soi faisant claquer les billes en contretemps.'], ['Trazer forte (Para trás)', 'Puxada firme do cilindro em direção ao corpo fazendo estalar as contas no contratempo.']);
      case 't': return pair(isFr, ['Tiré faible', 'Petit retour intermédiaire des billes vers soi avant de repartir sur le temps suivant.'], ['Trazer fraco', 'Pequeno retorno intermediário das contas em direção ao corpo antes do tempo seguinte.']);
      case 'L': return pair(isFr, ['Latéral (Lado)', "Bascule diagonale et coup sur le côté (une main avançant pendant que l'autre revient vers soi) pour marquer un balanço particulier."], ['Lado (Lateral)', 'Inclinação diagonal e batida lateral (uma mão avançando enquanto a outra recua) para marcar um balanço especial.']);
      case 'B': return pair(isFr, ['Barulho (Secouement continu)', 'Va-et-vient serré à haute fréquence produisant un bruissement continu.'], ['Barulho (Agitação contínua)', 'Vaivém curto e rápido produzindo um chiado contínuo.']);
      default: return null;
    }
  }

  if (instId === 'apito') {
    switch (semanticStroke) {
      case 'L': case 'W': return pair(isFr, ['Sifflet long bouclé (L)', "Signal d'appel continu du Mestre pour commander les entrées, viradas et paradas."], ['Apito longo contínuo (L)', 'Sinal sustentado do Mestre para comandar entradas, viradas e paradas.']);
      case 'l': return pair(isFr, ['Sifflet doux / maintien (l)', "Entrée progressive ou maintien lié du coup de sifflet long sans ré-attaque brusque."], ['Apito suave / sustentação (l)', 'Entrada progressiva ou sustentação ligada do apito longo sem novo ataque brusco.']);
      case '/': return pair(isFr, ['Extinction Sifflet (Fade-Out)', "Décroissance contrôlée du coup de sifflet long jusqu'au silence."], ['Extinção do Apito (Fade-Out)', 'Decaimento controlado do apito longo até silenciar.']);
      case '.': return pair(isFr, ['Fin du Sifflet (Silence)', 'Coupure nette et immédiate du coup de sifflet tenu.'], ['Fim do Apito (Silêncio)', 'Corte imediato e preciso do apito sustentado.']);
      case 'C': case 'w': return pair(isFr, ['Sifflet court (C)', "Coup de sifflet bref et rythmique du Mestre pour scander l'appel."], ['Apito curto (C)', 'Toque curto e rítmico do apito do Mestre para marcar a chamada.']);
      default: return null;
    }
  }

  if (['puxador', 'coro', 'toada'].includes(instId) || instType === 'voice') {
    switch (semanticStroke) {
      case 'P': return pair(isFr, ['Puxador (P)', "Voix soliste d'appel (P), réponse collective du chœur (C) et prolongation mélodique liée sur la même syllabe (_)."], ['Puxador (P)', 'Voz solista de chamada (P), resposta coletiva do coro (C) e prolongamento melódico ligado na mesma sílaba (_).']);
      case 'C': return pair(isFr, ['Coro (C)', "Réponse collective du chœur (C), en dialogue avec la voix soliste d'appel (P) et la tenue liée sur la même syllabe (_)."], ['Coro (C)', 'Resposta coletiva do coro (C), em diálogo com a voz solista de chamada (P) e o prolongamento ligado na mesma sílaba (_).']);
      case '_': return pair(isFr, ['Tenue (_)', 'Prolongation mélodique liée sur la même syllabe (_), sans ré-attaque vocale.'], ['Sustentação (_)', 'Prolongamento melódico ligado na mesma sílaba (_), sem novo ataque vocal.']);
      case '0': return pair(isFr, ['Silence vocal (0)', 'Respiration ou coupure volontaire interrompant proprement la tenue vocale.'], ['Silêncio vocal (0)', 'Pausa ou respiração intencional encerrando a sustentação vocal.']);
      default: return null;
    }
  }

  return null;
}
