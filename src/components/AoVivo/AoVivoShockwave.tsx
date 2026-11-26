import React from 'react';
import { cancelTrackedElementAnimation, runClockSyncedWaapi } from './aoVivoWaapiClockSync';

export interface AoVivoShockwaveOptions {
  x: number;
  y: number;
  isRoll?: boolean;
  isRimshot?: boolean;
  rimOffsetY?: number;
  delayMs?: number;
  lagMs?: number;
  deltaMs?: number;
}

interface ShockwaveNodes {
  pEl: HTMLElement;
  sEl: HTMLElement;
  primary: Animation | null;
  secondary: Animation | null;
}

const shockStateByEl = new WeakMap<HTMLDivElement, ShockwaveNodes>();

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

function getShockNodes(haloEl: HTMLDivElement): ShockwaveNodes | null {
  const cached = shockStateByEl.get(haloEl);
  if (cached && cached.pEl.isConnected) return cached;
  const pEl = haloEl.querySelector('[data-shock-primary]') as HTMLElement | null;
  const sEl = haloEl.querySelector('[data-shock-secondary]') as HTMLElement | null;
  if (!pEl || !sEl) return null;
  const entry: ShockwaveNodes = { pEl, sEl, primary: null, secondary: null };
  shockStateByEl.set(haloEl, entry);
  return entry;
}

export function cancelAoVivoShockwave(haloEl: HTMLDivElement | null): void {
  if (!haloEl) return;
  const nodes = getShockNodes(haloEl);
  if (!nodes) return;
  nodes.primary?.cancel();
  nodes.secondary?.cancel();
  nodes.primary = null;
  nodes.secondary = null;
  cancelTrackedElementAnimation(nodes.pEl);
  cancelTrackedElementAnimation(nodes.sEl);
  nodes.pEl.style.opacity = '0';
  nodes.sEl.style.opacity = '0';
}

export function pauseAoVivoShockwave(haloEl: HTMLDivElement | null): void {
  const nodes = haloEl ? shockStateByEl.get(haloEl) : undefined;
  if (!nodes) return;
  if (nodes.primary?.playState === 'running') { try { nodes.primary.pause(); } catch (_) {} }
  if (nodes.secondary?.playState === 'running') { try { nodes.secondary.pause(); } catch (_) {} }
}

export function resumeAoVivoShockwave(haloEl: HTMLDivElement | null): void {
  const nodes = haloEl ? shockStateByEl.get(haloEl) : undefined;
  if (!nodes) return;
  if (nodes.primary?.playState === 'paused') { try { nodes.primary.play(); } catch (_) {} }
  if (nodes.secondary?.playState === 'paused') { try { nodes.secondary.play(); } catch (_) {} }
}

export function triggerAoVivoShockwave(haloEl: HTMLDivElement | null, opts: AoVivoShockwaveOptions): void {
  if (!haloEl) return;
  const nodes = getShockNodes(haloEl);
  if (!nodes) return;
  cancelAoVivoShockwave(haloEl);

  const yPos = opts.isRimshot ? opts.y + (opts.rimOffsetY ?? 48) : opts.y;
  haloEl.style.transform = `translate3d(${Math.round(opts.x)}px, ${Math.round(yPos)}px, 0) translate(-50%, -50%)`;

  const isRoll = Boolean(opts.isRoll);
  const deltaMs = opts.deltaMs ?? (opts.delayMs !== undefined ? -opts.delayMs : (opts.lagMs ?? 0));
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  nodes.primary = runClockSyncedWaapi({
    el: nodes.pEl, keyframes: isRoll ? PRIMARY_ROLL_FRAMES : PRIMARY_HIT_FRAMES,
    durationMs: isRoll ? 130 : 255, iterations: isRoll ? 2 : 1, deltaMs, easing, fill: 'none',
  });
  nodes.secondary = runClockSyncedWaapi({
    el: nodes.sEl, keyframes: isRoll ? SECONDARY_ROLL_FRAMES : SECONDARY_HIT_FRAMES,
    durationMs: isRoll ? 150 : 285, iterations: isRoll ? 2 : 1, deltaMs, easing, fill: 'none',
  });
}

export const AoVivoShockwave = React.forwardRef<HTMLDivElement, { color: string }>(({ color }, ref) => (
  <div
    ref={ref}
    data-skin-shockwave
    className="absolute left-0 top-0 pointer-events-none w-[150px] h-[150px] sm:w-[170px] sm:h-[170px] will-change-transform"
    style={{ transform: 'translate3d(0px, 0px, 0) translate(-50%, -50%)', zIndex: 5 }}
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
