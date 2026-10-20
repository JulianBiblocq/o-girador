/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function isActualTextEntry(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
    return textTypes.includes(type) && !el.readOnly && !el.disabled;
  }
  return false;
}
