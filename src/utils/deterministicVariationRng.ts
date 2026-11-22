let variationSessionSeed = 0x5174c0de;

function mix32(h: number): number {
  let z = (h + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

function hashString32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function getVariationSessionSeed(): number {
  return variationSessionSeed;
}

export function setVariationSessionSeed(seed: number): number {
  variationSessionSeed = (seed | 0) || 0x5174c0de;
  return variationSessionSeed;
}

export function bumpVariationSessionSeed(): number {
  const entropy = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0;
  variationSessionSeed = mix32(variationSessionSeed ^ entropy) || 0x5174c0de;
  return variationSessionSeed;
}

/**
 * Tirage pur déterministe dans [0, 1) partagé entre AudioWorklet, Roda, Mode Focus et Ao Vivo.
 */
export function computeDeterministicVariationRand(
  passOrSeqId: number,
  measureIdx: number,
  familyKey: string | number,
  explicitSeed?: number
): number {
  const seed = explicitSeed !== undefined ? explicitSeed : variationSessionSeed;
  const famHash = typeof familyKey === 'number' ? mix32(familyKey) : hashString32(String(familyKey));
  const combined =
    mix32(seed) ^
    mix32(Math.imul(passOrSeqId | 0, 0x27d4eb2d)) ^
    mix32(Math.imul((measureIdx | 0) + 1024, 0x165667b1)) ^
    famHash;
  return mix32(combined) / 4294967296;
}
