export const CONE_MIN_RAD = Math.PI / 9; // 20° (Extrême Droite +100)
export const CONE_MAX_RAD = (8 * Math.PI) / 9; // 160° (Extrême Gauche -100)
export const CONE_SPAN_RAD = (7 * Math.PI) / 9; // 140° d'ouverture totale

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
    theta = u >= 0 ? CONE_MIN_RAD : CONE_MAX_RAD;
  } else {
    if (theta < CONE_MIN_RAD) theta = CONE_MIN_RAD;
    else if (theta > CONE_MAX_RAD) theta = CONE_MAX_RAD;
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
