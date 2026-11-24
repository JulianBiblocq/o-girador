/**
 * aoVivoMobileStrokeConfigs.ts — Profils coup par coup Mobile indépendants (`og_aovivo_mobile_cfg_v2_<instrument>`)
 * strictement isolés du profil PC (`og_aovivo_cfg_v7_<instrument>`) + export JSON Mobile unifié (< 145 lignes).
 */
import {
  AoVivoStorageKey, clearPersistedAoVivoConfig, clearPersistedMobileStrokeConfig, cloneAoVivoConfig,
  deepAssignAoVivoConfig, isAoVivoMobileProfileActive, loadPersistedAoVivoConfig, loadPersistedMobileStrokeConfig,
  savePersistedAoVivoConfig, savePersistedMobileStrokeConfig, subscribeAoVivoTargetMode,
} from './aoVivoConfigStorage';
import { AoVivoMobileFamily, MOBILE_OFFSETS } from './aoVivoMobileOffsets';

export const DEFAULT_AO_VIVO_MOBILE_STROKE_OVERRIDES = {
  caixa: {
    transitions: {
      stayLowAfterStrongY: -18,
    },
    crossClickConvergeX: 84,
    rimshotSkinImpactY: -28,
  },
  tarol: {
    transitions: {
      stayLowAfterStrongY: -18,
    },
    crossClickConvergeX: 84,
    rimshotSkinImpactY: -28,
  },
  timbal: {
    strokes: {
      graveImpactY: 252,
      graveConvergeX: -74,
      slapConvergeX: -30,
    },
  },
} as const;

const getMobileStrokeOverride = (fam: AoVivoMobileFamily): Record<string, any> | undefined =>
  (DEFAULT_AO_VIVO_MOBILE_STROKE_OVERRIDES as Partial<Record<AoVivoMobileFamily, Record<string, any>>>)[fam];

interface DualProfileChannel { key: AoVivoStorageKey; live: Record<string, any>; notify: () => void; getMobKey: () => AoVivoMobileFamily; }

const pcProfiles: Partial<Record<AoVivoStorageKey, Record<string, any>>> = {};
const mobileProfiles: Partial<Record<AoVivoMobileFamily, Record<string, any>>> = {};
const defaultsRegistry: Partial<Record<AoVivoMobileFamily, Record<string, any>>> = {};
const channels: DualProfileChannel[] = [];
let activeDrumFam: 'caixa' | 'tarol' = 'caixa';

const TRANSIENT_UI_KEYS = new Set(['posePreview', 'previewMode', 'speedMultiplier', 'leftStickMode']);

subscribeAoVivoTargetMode(() => {
  const useMob = isAoVivoMobileProfileActive();
  channels.forEach((ch) => {
    const src = useMob ? mobileProfiles[ch.getMobKey()] : pcProfiles[ch.key];
    if (src) { deepAssignAoVivoConfig(ch.live, src); ch.notify(); }
  });
});

export const getActiveMobileDrumFamily = (): 'caixa' | 'tarol' => activeDrumFam;

export function setActiveMobileDrumFamily(fam: 'caixa' | 'tarol'): void {
  if (activeDrumFam === fam) return;
  activeDrumFam = fam;
  if (!isAoVivoMobileProfileActive()) return;
  const ch = channels.find((c) => c.key === 'caixa'), src = mobileProfiles[fam];
  if (ch && src) { deepAssignAoVivoConfig(ch.live, src); ch.notify(); }
}

export function getCaixaConfigForFamily<T extends Record<string, any>>(fam: 'caixa' | 'tarol', fallbackLive: T): T {
  return isAoVivoMobileProfileActive() ? ((mobileProfiles[fam] as T) || fallbackLive) : fallbackLive;
}

export function bindAoVivoDualProfile<T extends Record<string, any>>(
  key: AoVivoStorageKey, defaults: T, notify: () => void
): { live: T; commitSave: () => void; resetActive: () => void } {
  pcProfiles[key] = loadPersistedAoVivoConfig(key, defaults);
  if (key === 'caixa') {
    defaultsRegistry.caixa = defaults; defaultsRegistry.tarol = defaults;
    mobileProfiles.caixa = loadPersistedMobileStrokeConfig('caixa', defaults, getMobileStrokeOverride('caixa'));
    mobileProfiles.tarol = loadPersistedMobileStrokeConfig('tarol', defaults, getMobileStrokeOverride('tarol'));
  } else {
    defaultsRegistry[key] = defaults;
    mobileProfiles[key] = loadPersistedMobileStrokeConfig(key, defaults, getMobileStrokeOverride(key));
  }

  const getMobKey = (): AoVivoMobileFamily => (key === 'caixa' ? activeDrumFam : key);
  const live = cloneAoVivoConfig((isAoVivoMobileProfileActive() ? mobileProfiles[getMobKey()]! : pcProfiles[key]!) as T);
  channels.push({ key, live, notify, getMobKey });

  const commitSave = (): void => {
    if (isAoVivoMobileProfileActive()) {
      const mk = getMobKey();
      deepAssignAoVivoConfig(mobileProfiles[mk]!, live);
      savePersistedMobileStrokeConfig(mk, mobileProfiles[mk]!);
    } else {
      deepAssignAoVivoConfig(pcProfiles[key]!, live);
      savePersistedAoVivoConfig(key, pcProfiles[key]!);
    }
    notify();
  };

  const resetActive = (): void => {
    if (isAoVivoMobileProfileActive()) {
      const mk = getMobKey();
      clearPersistedMobileStrokeConfig(mk);
      mobileProfiles[mk] = loadPersistedMobileStrokeConfig(mk, defaults, getMobileStrokeOverride(mk));
      deepAssignAoVivoConfig(live, mobileProfiles[mk]!);
    } else {
      clearPersistedAoVivoConfig(key);
      pcProfiles[key] = loadPersistedAoVivoConfig(key, defaults);
      deepAssignAoVivoConfig(live, pcProfiles[key]!);
    }
    notify();
  };

  return { live, commitSave, resetActive };
}

function diffStrokeConfig(cur: Record<string, any>, def: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(def)) {
    if (TRANSIENT_UI_KEYS.has(k)) continue;
    const cv = cur[k], dv = def[k];
    if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
      const sub = diffStrokeConfig(cv || {}, dv);
      if (Object.keys(sub).length > 0) out[k] = sub;
    } else if (cv !== dv) out[k] = cv;
  }
  return out;
}

export function buildFullMobileAoVivoExportObject() {
  const mobileStrokeConfigs: Partial<Record<AoVivoMobileFamily, Record<string, any>>> = {};
  (['alfaia', 'caixa', 'tarol', 'gongue', 'timbal', 'agbe', 'mineiro'] as AoVivoMobileFamily[]).forEach((fam) => {
    const cur = mobileProfiles[fam], def = defaultsRegistry[fam];
    if (!cur || !def) return;
    const diff = diffStrokeConfig(cur, def);
    if (Object.keys(diff).length > 0) mobileStrokeConfigs[fam] = diff;
  });
  return { mobileOffsets: MOBILE_OFFSETS, mobileStrokeConfigs };
}
