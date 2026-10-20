/**
 * Applique une normalisation crête uniforme sur un AudioBuffer.
 * Préserve intégralement la dynamique relative (pas de compression).
 * 
 * @param buffer AudioBuffer source à normaliser
 * @param targetDb Plafond crête cible en dBFS (défaut : -0.5 dBFS pour éviter l'écrêtage inter-échantillon)
 * @returns Le même AudioBuffer normalisé en place
 */
export function normalizeAudioBuffer(buffer: AudioBuffer, targetDb: number = -0.5): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const targetLinear = Math.pow(10, targetDb / 20); // ~0.944 pour -0.5 dBFS

  // 1. Détection du pic absolu sur tous les canaux
  let maxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > maxPeak) {
        maxPeak = absVal;
      }
    }
  }

  // Garde-fous : silence complet ou valeur non valide
  if (maxPeak === 0 || !Number.isFinite(maxPeak)) {
    return buffer;
  }

  // Calcul du gain multiplicateur
  const factor = targetLinear / maxPeak;

  // Si le niveau est déjà aligné (écart inférieur à 0.05 dB), on évite le calcul
  if (Math.abs(factor - 1.0) < 0.005) {
    return buffer;
  }

  // 2. Application du gain uniforme sur tous les échantillons de tous les canaux
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] *= factor;
    }
  }

  return buffer;
}
