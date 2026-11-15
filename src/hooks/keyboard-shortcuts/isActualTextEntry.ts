
import { isElementLike, isInputElementLike, isTextAreaElementLike } from '../../utils/crossRealmDom';

export function isActualTextEntry(el: HTMLElement | null): boolean {
  if (!isElementLike(el)) return false;
  if (el.isContentEditable) return true;
  if (isTextAreaElementLike(el)) return true;
  if (isInputElementLike(el)) {
    const type = (el.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
    return textTypes.includes(type) && !el.readOnly && !el.disabled;
  }
  return false;
}
