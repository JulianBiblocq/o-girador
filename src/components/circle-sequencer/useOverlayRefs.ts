/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef } from 'react';
import { OverlayCacheState } from './circleSequencerTypes';

export function useOverlayRefs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureDisplayRef = useRef<HTMLSpanElement>(null);
  const centerOverlayRef = useRef<HTMLDivElement>(null);
  const centerAfficheurRef = useRef<HTMLDivElement>(null);
  const centerOverlayImgRef = useRef<HTMLImageElement>(null);
  const centerOverlayTintRef = useRef<HTMLDivElement>(null);
  const centerOverlayTextRef = useRef<HTMLSpanElement>(null);

  const lastOverlayTextRef = useRef<string>('');
  const frozenStickAngleRef = useRef<number>(-Math.PI / 2);
  const lastOverlayStateRef = useRef<OverlayCacheState>({
    opacity: '', bgColor: '', imgDisplay: '', imgSrc: '', tintDisplay: '', color: '', textShadow: '', fontSize: '',
  });

  return {
    canvasRef,
    measureDisplayRef,
    centerOverlayRef,
    centerAfficheurRef,
    centerOverlayImgRef,
    centerOverlayTintRef,
    centerOverlayTextRef,
    lastOverlayTextRef,
    frozenStickAngleRef,
    lastOverlayStateRef,
  };
}
