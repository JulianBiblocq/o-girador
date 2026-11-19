import React from 'react';

export interface AoVivoShockwaveOptions {
  x: number;
  y: number;
  isRoll?: boolean;
  isRimshot?: boolean;
  rimOffsetY?: number;
}

interface ActiveShockAnims {
  primary: Animation | null;
  secondary: Animation | null;
}

const activeAnimsByEl = new WeakMap<HTMLDivElement, ActiveShockAnims>();

const PRIMARY_HIT_FRAMES: Keyframe[] = [
  { transform: 'scale(0.22)', opacity: 0.55, offset: 0 },
  { transform: 'scale(0.55)', opacity: 0.52, offset: 0.14 },
  { transform: 'scale(1.85)', opacity: 0, offset: 1 },
];

const SECONDARY_HIT_FRAMES: Keyframe[] = [
  { transform: 'scale(0.18)', opacity: 0, offset: 0 },
  { transform: 'scale(0.32)', opacity: 0.38, offset: 0.18 },
  { transform: 'scale(1.52)', opacity: 0, offset: 1 },
];

const PRIMARY_ROLL_FRAMES: Keyframe[] = [
  { transform: 'scale(0.26)', opacity: 0.42, offset: 0 },
  { transform: 'scale(1.28)', opacity: 0, offset: 1 },
];

const SECONDARY_ROLL_FRAMES: Keyframe[] = [
  { transform: 'scale(0.20)', opacity: 0.28, offset: 0 },
  { transform: 'scale(1.05)', opacity: 0, offset: 1 },
];

export function cancelAoVivoShockwave(haloEl: HTMLDivElement | null): void {
  if (!haloEl) return;
  const active = activeAnimsByEl.get(haloEl);
  if (active) {
    active.primary?.cancel();
    active.secondary?.cancel();
    active.primary = null;
    active.secondary = null;
  }
  const pEl = haloEl.querySelector('[data-shock-primary]') as HTMLElement | null;
  const sEl = haloEl.querySelector('[data-shock-secondary]') as HTMLElement | null;
  if (pEl) { pEl.getAnimations().forEach((a) => a.cancel()); pEl.style.opacity = '0'; }
  if (sEl) { sEl.getAnimations().forEach((a) => a.cancel()); sEl.style.opacity = '0'; }
}

export function triggerAoVivoShockwave(haloEl: HTMLDivElement | null, opts: AoVivoShockwaveOptions): void {
  if (!haloEl) return;
  cancelAoVivoShockwave(haloEl);
  const pEl = haloEl.querySelector('[data-shock-primary]') as HTMLElement | null;
  const sEl = haloEl.querySelector('[data-shock-secondary]') as HTMLElement | null;
  if (!pEl || !sEl) return;

  const yPos = opts.isRimshot ? opts.y + (opts.rimOffsetY ?? 48) : opts.y;
  haloEl.style.left = `${opts.x}px`;
  haloEl.style.top = `${yPos}px`;

  const isRoll = Boolean(opts.isRoll);
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const primary = pEl.animate(isRoll ? PRIMARY_ROLL_FRAMES : PRIMARY_HIT_FRAMES, {
    duration: isRoll ? 130 : 255,
    iterations: isRoll ? 2 : 1,
    easing,
    fill: 'none',
  });
  const secondary = sEl.animate(isRoll ? SECONDARY_ROLL_FRAMES : SECONDARY_HIT_FRAMES, {
    duration: isRoll ? 150 : 285,
    iterations: isRoll ? 2 : 1,
    easing,
    fill: 'none',
  });
  activeAnimsByEl.set(haloEl, { primary, secondary });
}

interface AoVivoShockwaveProps {
  color: string;
}

export const AoVivoShockwave = React.forwardRef<HTMLDivElement, AoVivoShockwaveProps>(({ color }, ref) => (
  <div
    ref={ref}
    data-skin-shockwave
    className="absolute pointer-events-none w-[150px] h-[150px] sm:w-[170px] sm:h-[170px]"
    style={{ transform: 'translate(-50%, -50%)', zIndex: 5 }}
  >
    <div
      data-shock-primary
      className="absolute inset-0 rounded-full pointer-events-none will-change-transform"
      style={{ border: `2px solid ${color}`, opacity: 0, transform: 'scale(0.22)' }}
    />
    <div
      data-shock-secondary
      className="absolute inset-0 rounded-full pointer-events-none will-change-transform"
      style={{ border: '1.25px solid var(--cordel-gold)', opacity: 0, transform: 'scale(0.18)' }}
    />
  </div>
));

AoVivoShockwave.displayName = 'AoVivoShockwave';
