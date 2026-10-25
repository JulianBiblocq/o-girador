
import { DRUM_RADIUS, RIM_RADIUS, INNER_SKIN_RADIUS } from './circleSequencerConstants';
import { ThemeColors } from './circleSequencerTypes';

export const drawAlfaiaRims = (
  bgCtx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  theme: ThemeColors
): void => {
  const isDark = Boolean(theme.isDark);
  const numCords = 16;

  // 1. Bord extérieur du tambour en Mode Clair (trait net #1a1a1a + ombre portée douce)
  if (!isDark) {
    bgCtx.save();
    bgCtx.beginPath();
    bgCtx.arc(centerX, centerY, DRUM_RADIUS, 0, Math.PI * 2);
    bgCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    bgCtx.shadowBlur = 10;
    bgCtx.lineWidth = 2.5;
    bgCtx.strokeStyle = '#1a1a1a';
    bgCtx.stroke();
    bgCtx.restore();
  }

  // 2. Cordes extérieures (Cordas)
  if (!isDark) {
    // Liseré / contour encre noire #1a1a1a
    bgCtx.lineWidth = 9;
    bgCtx.strokeStyle = '#1a1a1a';
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    for (let i = 0; i < numCords; i++) {
      const a1 = (i * Math.PI * 2) / numCords;
      const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
      const a3 = ((i + 1) * Math.PI * 2) / numCords;
      bgCtx.beginPath();
      bgCtx.moveTo(centerX + Math.cos(a1) * (RIM_RADIUS - 5), centerY + Math.sin(a1) * (RIM_RADIUS - 5));
      bgCtx.lineTo(centerX + Math.cos(a2) * DRUM_RADIUS, centerY + Math.sin(a2) * DRUM_RADIUS);
      bgCtx.lineTo(centerX + Math.cos(a3) * (RIM_RADIUS - 5), centerY + Math.sin(a3) * (RIM_RADIUS - 5));
      bgCtx.stroke();
    }
  }

  // Cœur des cordes : chanvre/ocre soutenu #8c6b48 en Clair, thème en Sombre
  bgCtx.lineWidth = isDark ? 7 : 5;
  bgCtx.strokeStyle = isDark ? theme.themeBorder : '#8c6b48';
  bgCtx.lineCap = 'round';
  bgCtx.lineJoin = 'round';

  for (let i = 0; i < numCords; i++) {
    const a1 = (i * Math.PI * 2) / numCords;
    const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
    const a3 = ((i + 1) * Math.PI * 2) / numCords;
    bgCtx.beginPath();
    bgCtx.moveTo(centerX + Math.cos(a1) * (RIM_RADIUS - 5), centerY + Math.sin(a1) * (RIM_RADIUS - 5));
    bgCtx.lineTo(centerX + Math.cos(a2) * DRUM_RADIUS, centerY + Math.sin(a2) * DRUM_RADIUS);
    bgCtx.lineTo(centerX + Math.cos(a3) * (RIM_RADIUS - 5), centerY + Math.sin(a3) * (RIM_RADIUS - 5));
    bgCtx.stroke();
  }

  // 3. Cerclage en bois (Aro) : brun bois chaud d'Alfaia #3d2618 délimité par liserés noirs #1a1a1a
  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS, 0, Math.PI * 2);
  bgCtx.lineWidth = 36;
  bgCtx.strokeStyle = '#3d2618';
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS - 18, 0, Math.PI * 2);
  bgCtx.lineWidth = 4;
  bgCtx.strokeStyle = '#1a1a1a';
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS + 18, 0, Math.PI * 2);
  bgCtx.lineWidth = 4;
  bgCtx.strokeStyle = '#1a1a1a';
  bgCtx.stroke();

  // 4. Peau d'Alfaia (Couro) : ambrée sablée rgba(226, 216, 195, 0.88) permanente (mode clair & sombre)
  bgCtx.save();
  bgCtx.globalAlpha = 1.0;
  bgCtx.globalCompositeOperation = 'source-over';
  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS, 0, Math.PI * 2);
  bgCtx.fillStyle = 'rgba(226, 216, 195, 0.88)';
  bgCtx.fill();
  bgCtx.restore();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS, 0, Math.PI * 2);
  bgCtx.lineWidth = 5;
  bgCtx.strokeStyle = '#1a1a1a';
  bgCtx.stroke();

  // Cercle pointillé de couture sur le bord de la peau
  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS - 15, 0, Math.PI * 2);
  bgCtx.lineWidth = 1.5;
  bgCtx.strokeStyle = '#1a1a1a';
  bgCtx.setLineDash([8, 8]);
  bgCtx.stroke();
  bgCtx.setLineDash([]);
};
