/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gardes anti-bourdon du synthétiseur vocal (purs, sans dépendance Tone) :
 *  - validation de la durée / de l'horodatage avant tout `triggerAttackRelease` ;
 *  - suivi des chevauchements d'une même note sur une même piste.
 *
 * Contexte : `Tone.PolySynth.triggerAttackRelease` programme l'attaque PUIS lève une assertion si la durée
 * n'est pas > 0 (NaN, 0, négatif) : l'attaque reste alors sans release, ce qui produit un bourdon infini.
 */

export const VOICE_FALLBACK_DURATION_SEC = 0.2;

/** Durée en secondes toujours finie et strictement positive (repli sûr sinon). */
export function sanitizeVoiceDuration(durationSec: unknown, fallbackSec: number = VOICE_FALLBACK_DURATION_SEC): number {
  return typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0 ? durationSec : fallbackSec;
}

/** Horodatage toujours fini (repli sur `fallbackTime`, typiquement `Tone.now()`). */
export function sanitizeVoiceTime(timeSec: unknown, fallbackTime: number): number {
  return typeof timeSec === 'number' && Number.isFinite(timeSec) ? timeSec : fallbackTime;
}

/**
 * Registre des fins de notes programmées (clé = piste + hauteur).
 *
 * `PolySynth` relâche « la première voix non relâchée de cette hauteur » : relâcher en avance l'ancienne voix
 * n'est sûr que si la nouvelle note se termine avant l'ancien release encore en attente (sinon cet ancien
 * release coupe prématurément la nouvelle voix). Dans le cas contraire on conserve le comportement polyphonique.
 */
export class VoiceOverlapTracker {
  private readonly ends = new Map<string, number>();

  /** Enregistre la note et indique s'il faut relâcher l'ancienne voix de même hauteur à `triggerTime`. */
  registerAndCheck(key: string, triggerTime: number, durationSec: number): boolean {
    const newEnd = triggerTime + durationSec;
    const prevEnd = this.ends.get(key);
    const shouldPreRelease = prevEnd !== undefined && prevEnd > triggerTime + 0.005 && newEnd <= prevEnd;
    // On conserve la fin la plus tardive : c'est elle qui détermine si la voix précédente est encore active.
    this.ends.set(key, prevEnd !== undefined && prevEnd > newEnd ? prevEnd : newEnd);
    return shouldPreRelease;
  }

  clear(): void {
    this.ends.clear();
  }

  /** Oublie toutes les notes d'une piste (clé préfixée par `${trackKey}|`). */
  clearTrack(trackKey: string): void {
    const prefix = `${trackKey}|`;
    this.ends.forEach((_, k) => {
      if (k.startsWith(prefix)) this.ends.delete(k);
    });
  }
}
