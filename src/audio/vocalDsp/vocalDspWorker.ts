/**
 * vocalDspWorker.ts
 * Pont de ré-exportation vers le Web Worker canonique `src/workers/vocalDsp.worker.ts` (< 15 lignes).
 */
export {
  type VocalDspWorkerRequest,
  type VocalDspWorkerResponse,
  processVocalDspRequest,
} from '../../workers/vocalDsp.worker';
