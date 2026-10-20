export const clampPositionToCone = (
  clientX: number,
  clientY: number,
  placeRect: DOMRect
): { x: number; y: number } => {
  const W = placeRect.width;
  const H = placeRect.height;
  const x0 = placeRect.left + W / 2;
  const y0 = placeRect.top + H;
  const u = clientX - x0;
  const v = y0 - clientY;
  let R = Math.sqrt(u * u + v * v);
  let theta = Math.atan2(v, u);
  const Rmax = H;

  if (v < 0) {
    theta = u >= 0 ? Math.PI / 6 : (5 * Math.PI) / 6;
  } else {
    if (theta < Math.PI / 6) theta = Math.PI / 6;
    else if (theta > (5 * Math.PI) / 6) theta = (5 * Math.PI) / 6;
  }
  if (R > Rmax) R = Rmax;
  const clampedU = R * Math.cos(theta);
  const clampedV = R * Math.sin(theta);
  const pxX = clampedU + W / 2;
  const pxY = H - clampedV;
  return {
    x: Math.max(0, Math.min(100, (pxX / W) * 100)),
    y: Math.max(0, Math.min(100, (pxY / H) * 100)),
  };
};
