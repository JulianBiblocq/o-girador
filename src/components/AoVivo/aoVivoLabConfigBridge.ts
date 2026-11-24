/**
 * aoVivoLabConfigBridge.ts — Pont unifié de lecture, vitesse, reset, onglets et abonnements Lab Ao Vivo (< 80 lignes).
 */
import { CONFIG_ALFAIA_STICKS, resetAlfaiaSticksConfig, subscribeAlfaiaSticksConfig, updateAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import { subscribeMobileOffsets } from '../../audio/animations/aoVivoMobileOffsets';
import { CONFIG_CAIXA_STICKS, resetCaixaSticksConfig, subscribeCaixaSticksConfig, updateCaixaSticksConfig } from '../../audio/animations/caixaKinematics';
import { CONFIG_GONGUE_STICK, resetGongueStickConfig, subscribeGongueStickConfig, updateGongueStickConfig } from '../../audio/animations/gongueKinematics';
import { CONFIG_TIMBAL_HANDS, resetTimbalHandsConfig, subscribeTimbalHandsConfig, updateTimbalHandsConfig } from '../../audio/animations/timbalKinematics';
import { CONFIG_AGBE_LAB, resetAgbeLabConfig, subscribeAgbeLabConfig, updateAgbeLabConfig } from '../../audio/animations/agbeKeyframes';
import { CONFIG_MINEIRO_LAB, resetMineiroLabConfig, subscribeMineiroLabConfig, updateMineiroLabConfig } from '../../audio/animations/mineiroKeyframes';
import { AgbeLabTabId } from './AoVivoAgbeLabSliders';
import { CaixaLabTabId } from './AoVivoCaixaLabSliders';
import { GongueLabTabId } from './AoVivoGongueLabSliders';
import { MineiroLabTabId } from './AoVivoMineiroLabSliders';
import { AlfaiaLabTabId } from './AoVivoSticksLabSliders';
import { TimbalLabTabId } from './AoVivoTimbalLabSliders';
import { TesterFamily } from './aoVivoStrokeTester';

export interface LabTabSetters {
  setIsGlobalMobTab: (v: boolean) => void;
  setAlfaiaTab: (t: AlfaiaLabTabId) => void;
  setCaixaTab: (t: CaixaLabTabId) => void;
  setGongueTab: (t: GongueLabTabId) => void;
  setTimbalTab: (t: TimbalLabTabId) => void;
  setAgbeTab: (t: AgbeLabTabId) => void;
  setMineiroTab: (t: MineiroLabTabId) => void;
}

export function getLabActiveConfig(labFam: TesterFamily): Record<string, any> & { speedMultiplier: 1 | 0.5 } {
  if (labFam === 'alfaia') return CONFIG_ALFAIA_STICKS;
  if (labFam === 'caixa') return CONFIG_CAIXA_STICKS;
  if (labFam === 'gongue') return CONFIG_GONGUE_STICK;
  if (labFam === 'agbe') return CONFIG_AGBE_LAB;
  if (labFam === 'mineiro') return CONFIG_MINEIRO_LAB;
  return CONFIG_TIMBAL_HANDS;
}

export function resetLabInstrumentStrokeConfig(labFam: TesterFamily): void {
  if (labFam === 'alfaia') resetAlfaiaSticksConfig();
  else if (labFam === 'caixa') resetCaixaSticksConfig();
  else if (labFam === 'gongue') resetGongueStickConfig();
  else if (labFam === 'agbe') resetAgbeLabConfig();
  else if (labFam === 'mineiro') resetMineiroLabConfig();
  else resetTimbalHandsConfig();
}

export function setLabInstrumentSpeed(labFam: TesterFamily, speedMultiplier: 1 | 0.5): void {
  if (labFam === 'alfaia') updateAlfaiaSticksConfig({ speedMultiplier });
  else if (labFam === 'caixa') updateCaixaSticksConfig({ speedMultiplier });
  else if (labFam === 'gongue') updateGongueStickConfig({ speedMultiplier });
  else if (labFam === 'agbe') updateAgbeLabConfig({ speedMultiplier });
  else if (labFam === 'mineiro') updateMineiroLabConfig({ speedMultiplier });
  else updateTimbalHandsConfig({ speedMultiplier });
}

export function routeLabTabForStroke(labFam: TesterFamily, s: string, tabs: LabTabSetters): void {
  const up = s.toUpperCase();
  if (up === 'A' && labFam === 'caixa') { tabs.setIsGlobalMobTab(false); tabs.setCaixaTab('rimshot'); }
  else if (['C', 'X', 'B'].includes(up)) {
    tabs.setIsGlobalMobTab(false);
    if (labFam === 'alfaia') tabs.setAlfaiaTab('special'); else if (labFam === 'caixa') tabs.setCaixaTab('special'); else if (labFam === 'gongue') tabs.setGongueTab('metal'); else if (labFam === 'agbe') tabs.setAgbeTab('kinematics'); else if (labFam === 'mineiro') tabs.setMineiroTab('kinematics'); else tabs.setTimbalTab('flas_physics');
  } else if (s === 'I' && labFam === 'alfaia') { tabs.setIsGlobalMobTab(false); tabs.setAlfaiaTab('bacalhau'); updateAlfaiaSticksConfig({ leftStickMode: 'bacalhau' }); }
  else if (['R', 'F'].includes(up) && labFam === 'caixa') { tabs.setIsGlobalMobTab(false); tabs.setCaixaTab('rufada'); }
  else if ((up === 'S' || up === 'V') && labFam === 'agbe') { tabs.setIsGlobalMobTab(false); tabs.setAgbeTab('salto_volta'); }
  else if ((up === 'T' || up === 'L') && labFam === 'mineiro') { tabs.setIsGlobalMobTab(false); tabs.setMineiroTab('pull_lado'); }
}

export function subscribeAllAoVivoLabConfigs(cb: () => void): () => void {
  const subs = [
    subscribeAlfaiaSticksConfig(cb), subscribeCaixaSticksConfig(cb), subscribeGongueStickConfig(cb),
    subscribeTimbalHandsConfig(cb), subscribeAgbeLabConfig(cb), subscribeMineiroLabConfig(cb), subscribeMobileOffsets(cb),
  ];
  return () => subs.forEach((u) => u());
}
