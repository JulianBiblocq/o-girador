/**
 * Calculates the average RGB color of all child tracks inside a bus
 * to dynamically colorize the bus connection outlines.
 */
export function getBusColor(busId: string, tracks: any[], instrumentsConfig: any[]): string {
  // Extraction des enfants directs du bus
  const children = tracks.filter((t: any) => 
    (String(t.busId) === String(busId) || String(t.linkedToTrackId) === String(busId)) && 
    !t.isBusFolder
  );

  if (children.length === 0) return '#bdc3c7';

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  children.forEach((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const colorHex = inst?.color || '#bdc3c7';
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }
  });

  if (count === 0) return '#bdc3c7';

  const rAvg = Math.round(rSum / count).toString(16).padStart(2, '0');
  const gAvg = Math.round(gSum / count).toString(16).padStart(2, '0');
  const bAvg = Math.round(bSum / count).toString(16).padStart(2, '0');

  return `#${rAvg}${gAvg}${bAvg}`;
}

export function getContrastColor(hexcolor: string): string {
  if (!hexcolor || hexcolor === 'transparent') return '#1a1a1a';
  const hex = hexcolor.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? '#1a1a1a' : '#f4ecd8';
    }
  }
  return '#1a1a1a';
}
