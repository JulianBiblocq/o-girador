/**
 * busDynamicsI18n.ts — Libellés bilingues FR / PT de la façade console Dynamique de Bus & Polarité (< 70 lignes).
 */
import type { BusCompressorArchetypeId } from '../../../audio/effects/busCompressorTypes';

const FR = {
  polarityTitle: 'Inverser la polarité (180°)',
  polarityActiveTitle: 'Polarité inversée (180°) — cliquer pour rétablir',
  compLabel: 'COMP',
  compPowerTitle: 'Compresseur de bus (activer / couper)',
  compStateOn: 'Actif',
  compStateOff: 'Coupé',
  compStateEco: 'En veille (Mode Éco)',
  compArchetype: 'Profil',
  compMix: 'Mix parallèle',
  compGesture: 'Glisser : doser le mix — Double-clic : valeur nominale',
  compOpenPanel: 'Ouvrir la dynamique du bus',
  archCustom: 'Sur mesure',
  archAuto: 'Auto (détecté à l’activation)',
  archAlfaias: 'Cola Alfaias',
  archCaixas: 'Tapete Caixas',
  archSementes: 'Controle Sementes',
  archToada: 'Presença Toada',
};

const PT: typeof FR = {
  polarityTitle: 'Inverter polaridade (180°)',
  polarityActiveTitle: 'Polaridade invertida (180°) — clique para restaurar',
  compLabel: 'COMP',
  compPowerTitle: 'Compressor de grupo (ligar / desligar)',
  compStateOn: 'Ativo',
  compStateOff: 'Desligado',
  compStateEco: 'Em espera (Modo Eco)',
  compArchetype: 'Perfil',
  compMix: 'Mix paralelo',
  compGesture: 'Arrastar: dosar o mix — Duplo clique: valor nominal',
  compOpenPanel: 'Abrir a dinâmica do grupo',
  archCustom: 'Personalizado',
  archAuto: 'Auto (detectado ao ativar)',
  archAlfaias: 'Cola Alfaias',
  archCaixas: 'Tapete Caixas',
  archSementes: 'Controle Sementes',
  archToada: 'Presença Toada',
};

export type BusDynamicsStrings = typeof FR;
export const BUS_DYNAMICS_I18N: Readonly<Record<'fr' | 'pt', BusDynamicsStrings>> = { fr: FR, pt: PT };

export function getBusDynamicsStrings(lang: string): BusDynamicsStrings {
  return lang === 'fr' ? FR : PT;
}

export function getArchetypeLabel(s: BusDynamicsStrings, archetype: BusCompressorArchetypeId | undefined): string {
  switch (archetype) {
    case 'alfaias_glue': return s.archAlfaias;
    case 'caixas_carpet': return s.archCaixas;
    case 'sementes_control': return s.archSementes;
    case 'toada_presence': return s.archToada;
    default: return s.archCustom;
  }
}
