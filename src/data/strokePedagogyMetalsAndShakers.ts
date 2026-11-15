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
        ? { title: 'Cloche Grave Forte', description: 'Frappe franche du bâton de bois sur la grande campane inférieure, pilier de la clave.' }
        : { title: 'Campana Grave Forte', description: 'Golpe firme da baqueta de madeira na campana maior inferior, base da linha guia.' };
      case 'g': return isFr
        ? { title: 'Cloche Grave Douce', description: 'Frappe retenue sur la grande campane soulignant la pulsation sans couvrir le chant.' }
        : { title: 'Campana Grave Fraca', description: 'Toque suave na campana maior mantendo o pulso sem encobrir a toada.' };
      case 'A': return isFr
        ? { title: 'Cloche Aiguë Forte', description: 'Frappe brillante et projetée sur la petite campane supérieure pour faire percer la syncope.' }
        : { title: 'Campana Aguda Forte', description: 'Golpe brilhante e projetado na campana menor superior destacando a síncope.' };
      case 'a': return isFr
        ? { title: 'Cloche Aiguë Douce', description: 'Touche légère sur la petite campane articulant délicatement le contretemps.' }
        : { title: 'Campana Aguda Fraca', description: 'Toque leve na campana menor articulando com delicadeza o contratempo.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Trémolo sur Cloche)', description: 'Battement rapide et continu de la baguette faisant vibrer intensément le fer.' }
        : { title: 'Barulho (Vibração Contínua)', description: 'Batimento rápido e contínuo da baqueta fazendo o ferro vibrar intensamente.' };
      default: return null;
    }
  }

  if (instId === 'agbe') {
    switch (semanticStroke) {
      case 'D': return isFr
        ? { title: 'Projection Main Droite Forte', description: 'Balancier énergique projetant le filet de perles contre la paroi de la calebasse côté droit.' }
        : { title: 'Projeção Direita Forte', description: 'Balanço firme projetando a malha de contas contra o cabaço no lado direito.' };
      case 'd': return isFr
        ? { title: 'Projection Main Droite Douce', description: 'Oscillation souple côté droit entretenant le bruissement régulier des perles.' }
        : { title: 'Projeção Direita Fraca', description: 'Oscilação leve para a direita mantendo o chiado regular das contas.' };
      case 'E': return isFr
        ? { title: 'Projection Main Gauche Forte', description: 'Retour marqué du balancier plaquant franchement le filet contre la main directrice.' }
        : { title: 'Projeção Esquerda Forte', description: 'Retorno firme do balanço chocando a malha contra o lado esquerdo.' };
      case 'e': return isFr
        ? { title: 'Projection Main Gauche Douce', description: 'Retour léger du filet accompagnant la respiration interne du baque.' }
        : { title: 'Projeção Esquerda Fraca', description: 'Retorno suave da malha acompanhando o balanço interno do baque.' };
      case 'S': return isFr
        ? { title: 'Salto (Lancer Vertical)', description: "Impulsion projetant l'agbê vers le haut pour un accent aérien suivi de la retombée des perles." }
        : { title: 'Salto (Impulso Vertical)', description: 'Impulso lançando o agbê para o alto gerando acento brilhante na queda das contas.' };
      case 'V':
      case 'v': return isFr
        ? { title: 'Volta (Rotation)', description: 'Mouvement circulaire faisant glisser longuement la résille autour du corps de la calebasse.' }
        : { title: 'Volta (Giro)', description: 'Movimento circular fazendo a malha deslizar ao redor do corpo do cabaço.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Secoué Continu)', description: "Agitation continue faisant crépiter l'ensemble des perles lors des appels." }
        : { title: 'Barulho (Agitação Contínua)', description: 'Agitação contínua fazendo toda a malha de contas vibrar nas chamadas.' };
      default: return null;
    }
  }

  if (instId === 'mineiro') {
    switch (semanticStroke) {
      case 'P': return isFr
        ? { title: "Projetar — Pousser Fort (Avant)", description: 'Projection franche du cylindre vers l’avant plaquant net les billes contre la paroi frontale.' }
        : { title: 'Projetar Forte (Para Frente)', description: 'Projeção firme do cilindro à frente chocando as esferas na parede frontal.' };
      case 'p': return isFr
        ? { title: 'Projetar — Pousser Doux (Avant)', description: 'Avancée courte et contrôlée assurant le ciselé léger de la subdivision.' }
        : { title: 'Projetar Fraco (Para Frente)', description: 'Avanço curto e controlado mantendo o corte leve da subdivisão.' };
      case 'T': return isFr
        ? { title: 'Trazer — Tirer Fort (Vers soi)', description: 'Rappel sec du cylindre vers le buste faisant claquer les billes sur la paroi arrière.' }
        : { title: 'Trazer Forte (Para Trás)', description: 'Puxada firme do cilindro para trás estalando as esferas na parede traseira.' };
      case 't': return isFr
        ? { title: 'Trazer — Tirer Doux (Vers soi)', description: 'Retour souple vers soi refermant le cycle continu du mineiro.' }
        : { title: 'Trazer Fraco (Para Trás)', description: 'Retorno suave para trás completando o movimento contínuo do mineiro.' };
      case 'L': return isFr
        ? { title: 'Lado — Accent Latéral', description: "Secousse transversale vive cassant l'axe avant-arrière pour souligner une figure." }
        : { title: 'Lado — Acento Lateral', description: 'Corte transversal vivo quebrando o eixo frente-trás para destacar uma figura.' };
      case 'B':
      case 'b': return isFr
        ? { title: 'Barulho (Trémolo Métallique)', description: 'Va-et-vient serré et continu produisant un souffle métallique dense.' }
        : { title: 'Barulho (Trêmulo Contínuo)', description: 'Agitação rápida e contínua gerando um tapete metálico denso.' };
      default: return null;
    }
  }

  if (instId === 'apito') {
    switch (semanticStroke) {
      case 'W': return isFr
        ? { title: 'Sifflet Long (Apito Longo)', description: "Coup de sifflet tenu du Mestre lançant l'appel, l'entrée d'une section ou l'arrêt du Batuque." }
        : { title: 'Apito Longo', description: 'Sopro sustentado do Mestre comandando chamada, virada de seção ou parada do Batuque.' };
      case 'w': return isFr
        ? { title: 'Sifflet Court (Apito Curto)', description: 'Coup de sifflet bref et cadencé scandant la pulsation avant une convention.' }
        : { title: 'Apito Curto', description: 'Sopro curto e ritmado marcando a pulsação antes de uma convenção.' };
      default: return null;
    }
  }

  if (['puxador', 'coro', 'toada'].includes(instId) || instType === 'voice') {
    switch (semanticStroke) {
      case 'P': return isFr
        ? { title: 'Chant Solo (Puxador)', description: 'Voix soliste entonnant l’appel mélodique et poétique de la Toada.' }
        : { title: 'Canto Solo (Puxador)', description: 'Voz solista puxando a linha melódica e os versos de chamada da Toada.' };
      case 'C': return isFr
        ? { title: 'Chœur (Coro)', description: 'Réponse collective chantée à pleine voix par le cortège et le Batuque.' }
        : { title: 'Coro Coletivo', description: 'Resposta coletiva entoada em conjunto pelo cortejo e pelo Batuque.' };
      case '_': return isFr
        ? { title: 'Mélisme / Tenue Legato', description: 'Prolongation ou glissement de hauteur sur la même voyelle sans ré-attaquer de syllabe.' }
        : { title: 'Melisma / Sustentação Legato', description: 'Prolongamento ou mudança de nota na mesma vogal sem novo ataque silábico.' };
      case '0': return isFr
        ? { title: 'Silence Vocal Explicite', description: 'Respiration ou soupir volontaire interrompant proprement la tenue vocale.' }
        : { title: 'Silêncio Vocal Explícito', description: 'Pausa ou respiração intencional encerrando a sustentação da nota.' };
      default: return null;
    }
  }

  return null;
}
