/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { saveAutosave } from '../db';

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload } = e.data || {};
  if (type === 'SAVE_AUTOSAVE') {
    try {
      await saveAutosave(payload);
      self.postMessage({ type: 'SAVE_SUCCESS' });
    } catch (err) {
      console.error('[dbWorker] Failed to save autosave:', err);
    }
  }
});
