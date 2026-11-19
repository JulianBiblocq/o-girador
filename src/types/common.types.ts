export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8' | '9/8' | '12/8';

export type AlfaiaSecondaryStickType = 'bacalhau' | 'fina' | 'macaneta';

export interface AlfaiaEquipmentMetadata {
  /** Baguette secondaire requise globalement sur le morceau (priorite max detectee) */
  secondaryStick: AlfaiaSecondaryStickType;
  /** Detail par piste/role (ex: { marcante: 'macaneta', repique: 'fina' }) */
  byRole: Record<string, AlfaiaSecondaryStickType>;
}
