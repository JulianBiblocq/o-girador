import React from 'react';
import { CONFIG_AGBE } from '../../audio/animationGenerators';

export const AgbeNetSvg: React.FC = () => {
  const numPoints = 80;
  const radius = CONFIG_AGBE.dimensions?.radius || 365;
  const amplitude = CONFIG_AGBE.dimensions?.amplitude || 30;
  const beadR = CONFIG_AGBE.dimensions?.beadRadius || 8;

  const outerZigZag: string[] = [];
  const innerZigZag: string[] = [];
  const beads: Array<{ cx: number; cy: number; r: number }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle1 = (i / numPoints) * Math.PI * 2;
    const angle2 = ((i + 0.5) / numPoints) * Math.PI * 2;

    outerZigZag.push(`${i === 0 ? 'M' : 'L'} ${500 + Math.cos(angle1) * (radius - amplitude)} ${500 + Math.sin(angle1) * (radius - amplitude)}`);
    outerZigZag.push(`L ${500 + Math.cos(angle2) * (radius + amplitude)} ${500 + Math.sin(angle2) * (radius + amplitude)}`);

    innerZigZag.push(`${i === 0 ? 'M' : 'L'} ${500 + Math.cos(angle1) * (radius + amplitude)} ${500 + Math.sin(angle1) * (radius + amplitude)}`);
    innerZigZag.push(`L ${500 + Math.cos(angle2) * (radius - amplitude)} ${500 + Math.sin(angle2) * (radius - amplitude)}`);

    if (i < numPoints) {
      beads.push({ cx: 500 + Math.cos(angle2) * (radius + amplitude), cy: 500 + Math.sin(angle2) * (radius + amplitude), r: beadR });
      beads.push({ cx: 500 + Math.cos(angle1) * (radius - amplitude), cy: 500 + Math.sin(angle1) * (radius - amplitude), r: beadR });
      const angleMid1 = ((i + 0.25) / numPoints) * Math.PI * 2;
      beads.push({ cx: 500 + Math.cos(angleMid1) * radius, cy: 500 + Math.sin(angleMid1) * radius, r: beadR + 2 });
      const angleMid2 = ((i + 0.75) / numPoints) * Math.PI * 2;
      beads.push({ cx: 500 + Math.cos(angleMid2) * radius, cy: 500 + Math.sin(angleMid2) * radius, r: beadR + 2 });
    }
  }

  return (
    <>
      <path d={outerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
      <path d={innerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
      {beads.map((b, idx) => (
        <circle key={idx} cx={b.cx} cy={b.cy} r={b.r} fill="#ea580c" />
      ))}
    </>
  );
};
