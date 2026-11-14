/**
 * aoVivoLabTabsConfig.ts — Onglets et modes d'aperçu statiques de la barre Lab Ao Vivo (< 40 lignes).
 */

import { AlfaiaLeftStickMode } from '../../audio/animations/alfaiaKinematics';
import { GonguePosePreview } from '../../audio/animations/gongueKinematics';
import { TimbalPosePreview } from '../../audio/animations/timbalKinematics';
import { AgbeLabTabId } from './AoVivoAgbeLabSliders';
import { CaixaLabTabId } from './AoVivoCaixaLabSliders';
import { GongueLabTabId } from './AoVivoGongueLabSliders';
import { MineiroLabTabId } from './AoVivoMineiroLabSliders';
import { AlfaiaLabTabId } from './AoVivoSticksLabSliders';
import { TimbalLabTabId } from './AoVivoTimbalLabSliders';
import { TesterFamily } from './aoVivoTesterCatalog';

export const detectAoVivoLabFamily = (id: string): TesterFamily =>
  ['caixa', 'tarol'].includes(id) ? 'caixa' : id === 'gongue' ? 'gongue' : id === 'timbal' ? 'timbal' : id === 'agbe' ? 'agbe' : id === 'mineiro' ? 'mineiro' : 'alfaia';

export const ALFAIA_MODES: { id: AlfaiaLeftStickMode; label: string }[] = [{ id: 'auto', label: "Auto ('I')" }, { id: 'macaneta', label: 'Maçaneta Jum.' }, { id: 'fina', label: 'Baguette Fine' }, { id: 'bacalhau', label: 'Bacalhau' }];
export const GONGUE_MODES: { id: GonguePosePreview; label: string }[] = [{ id: 'auto', label: 'Auto' }, { id: 'grave_impact', label: 'Imp. G' }, { id: 'grave_windup', label: 'Élan G' }, { id: 'aigu_impact', label: 'Imp. A' }, { id: 'aigu_windup', label: 'Élan A' }];
export const TIMBAL_MODES: { id: TimbalPosePreview; label: string }[] = [{ id: 'auto', label: 'Auto' }, { id: 'rest', label: 'Garde' }, { id: 'grave', label: 'Grave (G)' }, { id: 'slap', label: 'Slap (S)' }, { id: 'aberto', label: 'Aberto (A)' }];
export const ALFAIA_TABS: { id: AlfaiaLabTabId; label: string }[] = [{ id: 'macaneta', label: '1. Grosse' }, { id: 'fina', label: '2. Fine' }, { id: 'bacalhau', label: '3. Bacalhau' }, { id: 'transitions', label: '4. Enchaînements' }, { id: 'motion', label: '5. Pose & Course' }, { id: 'special', label: '6. Spéciaux (C/X/B)' }];
export const CAIXA_TABS: { id: CaixaLabTabId; label: string }[] = [{ id: 'stick', label: '1. Baguette' }, { id: 'rufada', label: '2. Rufada & Fla' }, { id: 'transitions', label: '3. Enchaînements' }, { id: 'motion', label: '4. Pose & Course' }, { id: 'special', label: '5. Spéciaux (A/C/X/B)' }];
export const GONGUE_TABS: { id: GongueLabTabId; label: string }[] = [{ id: 'hand', label: '1. Main (Poignée)' }, { id: 'grave', label: '2. Bout (Haut G)' }, { id: 'aigu', label: '3. Bout (Bas A)' }, { id: 'metal', label: '4. Vitesse & Ench.' }];
export const TIMBAL_TABS: { id: TimbalLabTabId; label: string }[] = [{ id: 'anatomy', label: '1. Anatomie' }, { id: 'grave_aberto', label: '2. Grave/Aberto' }, { id: 'slap_preso', label: '3. Slap/Preso' }, { id: 'transitions', label: '4. Enchaînements' }, { id: 'flas_physics', label: '5. Clap & Flas' }];
export const AGBE_TABS: { id: AgbeLabTabId; label: string }[] = [{ id: 'pendulum', label: '1. Balancier D/E' }, { id: 'salto_volta', label: '2. Salto & Volta' }, { id: 'kinematics', label: '3. Vitesse & Bar.' }];
export const MINEIRO_TABS: { id: MineiroLabTabId; label: string }[] = [{ id: 'push', label: '1. P ↑ Pousser' }, { id: 'pull_lado', label: '2. T ↓ Tirer & L' }, { id: 'kinematics', label: '3. Fluidité & Billes' }];
