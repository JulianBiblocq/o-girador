/**
 * syncPopupStylesAndTheme.ts — Synchronisation vivante `<base>`, CSS (HMR/prod) et Thème Cordel (< 120 lignes).
 */

function resolveAppBaseHref(): string {
  const origin = window.location.origin;
  const rawBase = (import.meta as any).env?.BASE_URL || '/';
  const normalizedBase = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const withTrailing = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`;
  return `${origin}${withTrailing}`;
}

function isStyleOrFontNode(node: Node): node is HTMLElement {
  if (node.nodeType !== 1) return false;
  const tag = (node as Element).tagName.toUpperCase();
  if (tag === 'STYLE') return true;
  if (tag === 'LINK') {
    const rel = ((node as HTMLLinkElement).rel || '').toLowerCase();
    return rel.includes('stylesheet') || rel.includes('preconnect') || rel.includes('icon') || rel.includes('font');
  }
  return false;
}

function mirrorElementThemeAttributes(src: HTMLElement, dst: HTMLElement, preserveLayout = false): void {
  dst.className = src.className;
  const dataTheme = src.getAttribute('data-theme');
  if (dataTheme !== null) dst.setAttribute('data-theme', dataTheme);
  else dst.removeAttribute('data-theme');

  const colorScheme = src.style.colorScheme;
  dst.style.cssText = src.style.cssText;
  if (colorScheme) dst.style.colorScheme = colorScheme;
  if (preserveLayout) {
    dst.style.margin = '0';
    dst.style.padding = '0';
    dst.style.width = '100vw';
    dst.style.height = '100vh';
    dst.style.overflow = 'hidden';
  }
}

export function syncPopupStylesAndTheme(popupDoc: Document): () => void {
  const srcDoc = window.document;

  // 1. Balise <base href> en tête de <head> pour résoudre 100 % des assets relatifs dans about:blank
  let baseEl = popupDoc.getElementById('satellite-base-href') as HTMLBaseElement | null;
  if (!baseEl) {
    baseEl = popupDoc.createElement('base');
    baseEl.id = 'satellite-base-href';
    popupDoc.head.insertBefore(baseEl, popupDoc.head.firstChild);
  }
  baseEl.href = resolveAppBaseHref();

  // 2. Clonage initial et suivi vivant (Vite HMR + build prod) des feuilles de style et polices
  const nodeMap = new Map<Node, Node>();

  const syncSingleHeadNode = (srcNode: Node) => {
    if (!isStyleOrFontNode(srcNode)) return;
    const existing = nodeMap.get(srcNode);
    const clone = popupDoc.importNode(srcNode, true);
    if (existing && existing.parentNode === popupDoc.head) {
      popupDoc.head.replaceChild(clone, existing);
    } else {
      popupDoc.head.appendChild(clone);
    }
    nodeMap.set(srcNode, clone);
  };

  Array.from(srcDoc.head.childNodes).forEach(syncSingleHeadNode);

  const headObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.removedNodes.forEach((rem) => {
          const mapped = nodeMap.get(rem);
          if (mapped && mapped.parentNode) mapped.parentNode.removeChild(mapped);
          nodeMap.delete(rem);
        });
        m.addedNodes.forEach(syncSingleHeadNode);
        if (m.target !== srcDoc.head && isStyleOrFontNode(m.target)) {
          syncSingleHeadNode(m.target);
        }
      } else if (m.type === 'characterData' && m.target.parentNode && isStyleOrFontNode(m.target.parentNode)) {
        syncSingleHeadNode(m.target.parentNode);
      } else if (m.type === 'attributes' && isStyleOrFontNode(m.target)) {
        syncSingleHeadNode(m.target);
      }
    }
  });
  headObserver.observe(srcDoc.head, { childList: true, subtree: true, characterData: true, attributes: true });

  // 3. Synchronisation temps réel Mode Clair / Mode Sombre & jetons --cordel-*
  const syncTheme = () => {
    mirrorElementThemeAttributes(srcDoc.documentElement, popupDoc.documentElement, false);
    mirrorElementThemeAttributes(srcDoc.body, popupDoc.body, true);
  };
  syncTheme();

  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(srcDoc.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  themeObserver.observe(srcDoc.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

  return () => {
    headObserver.disconnect();
    themeObserver.disconnect();
    nodeMap.clear();
  };
}
