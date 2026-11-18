import { Language } from '../types';
import { PedagogyEntryText } from './strokePedagogyDrums';

export function resolveMetalShakerVocalPedagogy(
  instId: string,
  instType: string,
  semanticStroke: string,
  lang: Language
): PedagogyEntryText | null {
  const isFr = lang === 'fr';

  if (instId === 'gongue' || instType === 'gongue') {
    switch (semanticStroke) {
      case 'G': return isFr
        ? { title: 'Grave fort (Haut de la cloche)', description: 'Frappe franche avec la large baguette en nylon (ou en bois) en haut de la cloche, près de la bouche (ouverture), produisant la note grave pleine avec très peu de rebond.' }
        : { title: 'Grave forte (Topo da campana)', description: 'Toque firme com a baqueta larga de nylon (ou madeira) no alto da campana, perto da boca, produzindo a nota grave cheia com pouquíssimo rebote.' };
      case 'g': return isFr
        ? { title: 'Grave faible (Haut de la cloche)', description: 'Frappe retenue en haut près de la bouche de la cloche pour poser la note grave en nuance.' }
        : { title: 'Grave fraco (Topo da campana)', description: 'Toque contido no alto, perto da boca da campana, para apoiar a nota grave com dinâmica suave.' };
      case 'A': return isFr
        ? { title: 'Aigu fort (Base de la cloche)', description: 'Frappe franche en bas vers la base (le col) de la cloche, là où le métal plus épais et rigide produit la note aiguë.' }
        : { title: 'Agudo forte (Base da campana)', description: 'Toque firme embaixo, perto da base da campana, onde o ferro mais espesso e rígido produz a nota aguda.' };
      case 'a': return isFr
        ? { title: 'Aigu faible (Base de la cloche)', description: 'Frappe légère vers la base de la cloche pour articuler la phrase.' }
        : { title: 'Agudo fraco (Base da campana)', description: 'Toque leve perto da base da campana para articular a frase rítmica.' };
      case 'X': return isFr
        ? { title: 'Arrêt étouffé (Parada)', description: 'Baguette écrasée et maintenue plaquée contre la cloche en fer forgé sans rebondir pour couper net toute résonance.' }
        : { title: 'Parada (Toque abafado)', description: 'Baqueta apoiada e mantida presa contra a campana de ferro forjado sem rebote para cortar imediatamente a ressonância.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Roulement continu)', description: 'Battement rapide et continu de la baguette faisant résonner le fer de la cloche.' }
        : { title: 'Barulho (Rulo contínuo)', description: 'Batimento rápido e contínuo da baqueta fazendo vibrar o ferro da campana.' };
      default: return null;
    }
  }

  if (instId === 'agbe') {
    const isStrong = semanticStroke === semanticStroke.toUpperCase();
    switch (semanticStroke) {
      case 'D':
      case 'd': return isFr
        ? { title: `Droite (${isStrong ? 'Fort' : 'Faible'})`, description: 'Retour latéral où la main droite ramène la calebasse vers la droite, faisant glisser et claquer le filet de perles sur le flanc opposé (ample sur D, court sur d).' }
        : { title: `Direita (${isStrong ? 'Forte' : 'Fraco'})`, description: 'Movimento de retorno em que a mão direita traz a cabaça para a direita, fazendo a malha de contas deslizar e estalar no flanco oposto (amplo em D, curto em d).' };
      case 'E':
      case 'e': return isFr
        ? { title: `Gauche (${isStrong ? 'Fort' : 'Faible'})`, description: 'La calebasse, tenue par le col dans la main droite, va vers la gauche et la main gauche la frappe de la paume en faisant claquer le filet de perles (franc sur E, léger sur e).' }
        : { title: `Esquerda (${isStrong ? 'Forte' : 'Fraco'})`, description: 'A cabaça, segurada pelo pescoço na mão direita, vai para a esquerda e a mão esquerda bate nela com a palma, fazendo estalar a malha de contas (firme em E, leve em e).' };
      case 'S': return isFr
        ? { title: 'Salto (Lancer haut)', description: 'Projection vive vers le haut qui soulève la calebasse et met le filet en suspension avant sa retombée.' }
        : { title: 'Salto (Impulso alto)', description: 'Projeção viva para cima que ergue a cabaça e suspende a malha antes da queda.' };
      case 'V':
      case 'v': return isFr
        ? { title: 'Volta (Retour bas)', description: 'Chute contrôlée et impact franc vers le bas lorsque la calebasse retombe dans les mains.' }
        : { title: 'Volta (Retorno baixo)', description: 'Descida controlada e impacto firme para baixo quando a cabaça retorna às mãos.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Secouement continu)', description: 'Agitation rapide sur place faisant crépiter toutes les perles en continu.' }
        : { title: 'Barulho (Agitação contínua)', description: 'Agitação rápida no lugar fazendo todas as contas crepitarem continuamente.' };
      default: return null;
    }
  }

  if (instId === 'mineiro') {
    switch (semanticStroke) {
      case 'P': return isFr
        ? { title: 'Poussé fort (Projetar)', description: "Projection sèche et bloquée vers l'avant qui plaque les graines/billes d'un coup net contre la paroi frontale." }
        : { title: 'Projetar forte (Para frente)', description: 'Projeção seca e travada para a frente que lança as contas de uma só vez contra a parede frontal.' };
      case 'p': return isFr
        ? { title: 'Poussé faible', description: "Léger rebond vers l'avant entretenant le débit avec un minimum de mouvement des mains." }
        : { title: 'Projetar fraco', description: 'Leve rebote para a frente mantendo a subdivisão com movimento mínimo das mãos.' };
      case 'T': return isFr
        ? { title: 'Tiré fort (Trazer)', description: 'Rappel franc du cylindre vers soi faisant claquer les billes en contretemps.' }
        : { title: 'Trazer forte (Para trás)', description: 'Puxada firme do cilindro em direção ao corpo fazendo estalar as contas no contratempo.' };
      case 't': return isFr
        ? { title: 'Tiré faible', description: 'Petit retour intermédiaire des billes vers soi avant de repartir sur le temps suivant.' }
        : { title: 'Trazer fraco', description: 'Pequeno retorno intermediário das contas em direção ao corpo antes do tempo seguinte.' };
      case 'L': return isFr
        ? { title: 'Latéral (Lado)', description: "Bascule diagonale et coup sur le côté (une main avançant pendant que l'autre revient vers soi) pour marquer un balanço particulier." }
        : { title: 'Lado (Lateral)', description: 'Inclinação diagonal e batida lateral (uma mão avançando enquanto a outra recua) para marcar um balanço especial.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Secouement continu)', description: 'Va-et-vient serré à haute fréquence produisant un bruissement continu.' }
        : { title: 'Barulho (Agitação contínua)', description: 'Vaivém curto e rápido produzindo um chiado contínuo.' };
      default: return null;
    }
  }

  if (instId === 'apito') {
    switch (semanticStroke) {
      case 'L':
      case 'W': return isFr
        ? { title: 'Sifflet long bouclé (L)', description: "Signal d'appel continu du Mestre pour commander les entrées, viradas et paradas." }
        : { title: 'Apito longo contínuo (L)', description: 'Sinal sustentado do Mestre para comandar entradas, viradas e paradas.' };
      case 'l': return isFr
        ? { title: 'Sifflet doux / maintien (l)', description: "Entrée progressive ou maintien lié du coup de sifflet long sans ré-attaque brusque." }
        : { title: 'Apito suave / sustentação (l)', description: 'Entrada progressiva ou sustentação ligada do apito longo sem novo ataque brusco.' };
      case '/': return isFr
        ? { title: 'Extinction Sifflet (Fade-Out)', description: "Décroissance contrôlée du coup de sifflet long jusqu'au silence." }
        : { title: 'Extinção do Apito (Fade-Out)', description: 'Decaimento controlado do apito longo até silenciar.' };
      case '.': return isFr
        ? { title: 'Fin du Sifflet (Silence)', description: 'Coupure nette et immédiate du coup de sifflet tenu.' }
        : { title: 'Fim do Apito (Silêncio)', description: 'Corte imediato e preciso do apito sustentado.' };
      case 'C':
      case 'w': return isFr
        ? { title: 'Sifflet court (C)', description: "Coup de sifflet bref et rythmique du Mestre pour scander l'appel." }
        : { title: 'Apito curto (C)', description: 'Toque curto e rítmico do apito do Mestre para marcar a chamada.' };
      default: return null;
    }
  }

  if (['puxador', 'coro', 'toada'].includes(instId) || instType === 'voice') {
    switch (semanticStroke) {
      case 'P': return isFr
        ? { title: 'Puxador (P)', description: "Voix soliste d'appel (P), réponse collective du chœur (C) et prolongation mélodique liée sur la même syllabe (_)." }
        : { title: 'Puxador (P)', description: 'Voz solista de chamada (P), resposta coletiva do coro (C) e prolongamento melódico ligado na mesma sílaba (_).' };
      case 'C': return isFr
        ? { title: 'Coro (C)', description: "Réponse collective du chœur (C), en dialogue avec la voix soliste d'appel (P) et la tenue liée sur la même syllabe (_)." }
        : { title: 'Coro (C)', description: 'Resposta coletiva do coro (C), em diálogo com a voz solista de chamada (P) e o prolongamento ligado na mesma sílaba (_).' };
      case '_': return isFr
        ? { title: 'Tenue (_)', description: 'Prolongation mélodique liée sur la même syllabe (_), sans ré-attaque vocale.' }
        : { title: 'Sustentação (_)', description: 'Prolongamento melódico ligado na mesma sílaba (_), sem novo ataque vocal.' };
      case '0': return isFr
        ? { title: 'Silence vocal (0)', description: 'Respiration ou coupure volontaire interrompant proprement la tenue vocale.' }
        : { title: 'Silêncio vocal (0)', description: 'Pausa ou respiração intencional encerrando a sustentação vocal.' };
      default: return null;
    }
  }

  return null;
}
