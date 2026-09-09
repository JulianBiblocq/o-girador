/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - Modular Instrument Nomenclature Types
 * Multi-style support (Maracatu, Capoeira, Samba) with immutable audio roles.
 */

export type StyleId = 'maracatu' | 'capoeira' | 'samba';

/**
 * Immutable technical roles for Maracatu de Baque Virado.
 * The audio engine and internal tracks bind strictly to these roles.
 */
export type MaracatuRoleKey =
  | 'alfaia_grave'     // Fût basse / tempo de fondation (ex: Marcante / Rum)
  | 'alfaia_medio'     // Fût médium / réponse (ex: Meião / Rumpi)
  | 'alfaia_agudo'     // Fût aigu / découpe et variations (ex: Repique / Lé)
  | 'caixa_baixo'      // Caisse claire grave / timbre profond (ex: Caixa)
  | 'caixa_alto'       // Caisse claire d'attaque aiguë (ex: Tarol)
  | 'gongue'           // Cloche métallique lourde
  | 'agbe'             // Calebasse perlée (Agbê / Xequerê)
  | 'mineiro'          // Shaker métallique / Ganzá
  | 'timbal'           // Tambour conique à main
  | 'apito'            // Sifflet de commandement
  | 'puxador'          // Voix solo / meneur de toada
  | 'coro'             // Chœur / répondeurs
  | 'toada';           // Piste mélodique / guide chant

/**
 * Default alias for current default style
 */
export type InstrumentRoleKey = MaracatuRoleKey;

/**
 * Map of labels per role for a given style
 */
export type NomenclatureMap = Record<MaracatuRoleKey, string>;

/**
 * Multi-style dictionary stored in Firestore under /associations/{groupId}
 * format: { maracatu?: { alfaia_grave: "Marcante", ... }, capoeira?: { ... } }
 * or legacy flat format: { alfaia_grave: "Marcante", ... }
 */
export interface GroupNomenclatureData {
  maracatu?: Partial<Record<MaracatuRoleKey, string>>;
  capoeira?: Partial<Record<string, string>>;
  samba?: Partial<Record<string, string>>;
  [key: string]: any;
}

export type NomenclaturePresetId =
  | 'traditional_baque_virado'
  | 'candomble_ketu'
  | 'universal_function'
  | 'custom';

export interface NomenclaturePreset {
  id: NomenclaturePresetId;
  name: string;
  description: string;
  style: StyleId;
  mapping: Partial<Record<MaracatuRoleKey, string>>;
}
