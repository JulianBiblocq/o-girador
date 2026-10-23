/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function notifyToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
  }
}
