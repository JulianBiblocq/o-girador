/**
 * captureCursorOverlay.mjs — Curseur vectoriel Cordel 60 FPS & onde de clic pour vidéos 1080p60.
 */

export const CURSOR_OVERLAY_INIT_SCRIPT = `
(() => {
  if (window.__OG_CAPTURE_CURSOR_MOUNTED__) return;
  window.__OG_CAPTURE_CURSOR_MOUNTED__ = true;

  function mountCursor() {
    if (!document.body || document.getElementById('__og_capture_cursor__')) return;
    const style = document.createElement('style');
    style.textContent = \`
      * { cursor: none !important; }
      #__og_capture_cursor__ {
        position: fixed; left: 0; top: 0; width: 28px; height: 28px;
        pointer-events: none; z-index: 2147483647;
        transform: translate3d(960px, 540px, 0);
        will-change: transform;
        filter: drop-shadow(1.5px 2px 2px rgba(0,0,0,0.55));
      }
      .__og_click_ripple__ {
        position: fixed; left: 0; top: 0; width: 38px; height: 38px;
        margin-left: -19px; margin-top: -19px; border-radius: 9999px;
        border: 3px solid var(--cordel-accent);
        background: color-mix(in srgb, var(--cordel-accent) 22%, transparent);
        pointer-events: none; z-index: 2147483646;
        will-change: transform, opacity;
      }
    \`;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = '__og_capture_cursor__';
    cursor.innerHTML = \`
      <svg viewBox="0 0 28 28" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 2 L3 23 L9 17.5 L13.2 25.5 L16.8 23.8 L12.5 15.8 L20.5 15.8 Z"
              fill="var(--cordel-bg)" stroke="var(--cordel-text)" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="5.5" cy="5.5" r="1.5" fill="var(--cordel-accent)"/>
      </svg>
    \`;
    document.body.appendChild(cursor);

    window.addEventListener('pointermove', (e) => {
      cursor.style.transform = \`translate3d(\${Math.round(e.clientX)}px, \${Math.round(e.clientY)}px, 0)\`;
    }, { passive: true, capture: true });

    window.addEventListener('pointerdown', (e) => {
      const ripple = document.createElement('div');
      ripple.className = '__og_click_ripple__';
      ripple.style.transform = \`translate3d(\${Math.round(e.clientX)}px, \${Math.round(e.clientY)}px, 0) scale(0.35)\`;
      document.body.appendChild(ripple);
      const anim = ripple.animate(
        [
          { transform: \`translate3d(\${Math.round(e.clientX)}px, \${Math.round(e.clientY)}px, 0) scale(0.35)\`, opacity: 0.95 },
          { transform: \`translate3d(\${Math.round(e.clientX)}px, \${Math.round(e.clientY)}px, 0) scale(1.65)\`, opacity: 0 },
        ],
        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      anim.onfinish = () => ripple.remove();
    }, { passive: true, capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCursor, { once: true });
  } else {
    mountCursor();
  }
})();
`;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export async function smoothMoveCursor(page, cursorState, targetX, targetY, durationMs = 520) {
  const steps = Math.max(8, Math.round(durationMs / 16));
  const startX = cursorState.x;
  const startY = cursorState.y;
  for (let i = 1; i <= steps; i++) {
    const p = easeInOutCubic(i / steps);
    const x = startX + (targetX - startX) * p;
    const y = startY + (targetY - startY) * p;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  cursorState.x = targetX;
  cursorState.y = targetY;
}

export async function smoothClickTourId(page, cursorState, tourId, opts = {}) {
  const { durationMs = 520, offsetX = 0, offsetY = 0 } = opts;
  const loc = page.locator(`[data-tour-id="${tourId}"]`).first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`Cible invisible pour data-tour-id="${tourId}"`);
  const tx = box.x + box.width / 2 + offsetX;
  const ty = box.y + box.height / 2 + offsetY;
  await smoothMoveCursor(page, cursorState, tx, ty, durationMs);
  await page.mouse.click(tx, ty);
}
