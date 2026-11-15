/**
 * crossRealmDom.ts — Utilitaires DOM inter-fenêtres sans `instanceof` (< 60 lignes).
 * Indispensable entre `window` (Écran 1) et `satelliteWindow` (Écran 2) dont les constructeurs DOM diffèrent.
 */

export interface CrossRealmNodeLike {
  nodeType?: number;
  tagName?: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  isContentEditable?: boolean;
  classList?: DOMTokenList;
  ownerDocument?: Document | null;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => Element | null;
  blur?: () => void;
}

export function isElementLike(target: unknown): target is HTMLElement {
  return Boolean(target && typeof target === 'object' && (target as CrossRealmNodeLike).nodeType === 1);
}

export function getUpperTagName(target: unknown): string {
  if (!isElementLike(target)) return '';
  return (target as CrossRealmNodeLike).tagName?.toUpperCase() || '';
}

export function isInputElementLike(target: unknown): target is HTMLInputElement {
  return getUpperTagName(target) === 'INPUT';
}

export function isTextAreaElementLike(target: unknown): target is HTMLTextAreaElement {
  return getUpperTagName(target) === 'TEXTAREA';
}

export function isEditableTarget(target: unknown): boolean {
  if (!isElementLike(target)) return false;
  const node = target as CrossRealmNodeLike;
  const tag = getUpperTagName(target);
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (node.isContentEditable || node.getAttribute?.('contenteditable') === 'true') return true;
  if (node.classList?.contains('v-syl')) return true;
  return Boolean(node.closest?.('[contenteditable="true"], .v-syl'));
}

export function getElementWindow(target: unknown, fallback: Window = window): Window {
  if (!isElementLike(target)) return fallback;
  return target.ownerDocument?.defaultView || fallback;
}
