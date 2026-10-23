
import type React from 'react';

export type MobileFamilyId = 'alfaias' | 'caixas' | 'timbal' | 'gongue' | 'sementes' | 'agbe' | 'toada';

export interface MobileFamilyDef {
  id: MobileFamilyId;
  label: string;
  instrumentIds: string[];
  isToada?: boolean;
}

export const MOBILE_FAMILIES: MobileFamilyDef[] = [
  { id: 'alfaias', label: 'ALFAIAS', instrumentIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'CAIXAS', instrumentIds: ['caixa', 'tarol'] },
  { id: 'timbal', label: 'TIMBAL', instrumentIds: ['timbal'] },
  { id: 'gongue', label: 'GONGUÊ', instrumentIds: ['gongue'] },
  { id: 'sementes', label: 'SEMENTES', instrumentIds: ['agbe', 'mineiro'] },
  { id: 'toada', label: 'TOADA', instrumentIds: ['puxador', 'coro'], isToada: true },
];

export type MuteGroupId = 1 | 2 | 3 | 4;

export const ALL_MUTE_GROUP_IDS: MuteGroupId[] = [1, 2, 3, 4];

export interface AnalogButtonStyle {
  style: React.CSSProperties;
  className: string;
}

export const ANALOG_BUTTON_STYLES = {
  mute: (isMuted: boolean): AnalogButtonStyle => ({
    style: {
      background: isMuted
        ? 'radial-gradient(circle at 50% 45%, #ff6b4a 0%, #d9341d 48%, #590d05 100%)'
        : 'linear-gradient(180deg, #8f4940 0%, #73362f 100%)',
      boxShadow: isMuted
        ? 'inset 0 0 12px rgba(35, 0, 0, 0.85), inset 0 1px 2px rgba(255, 220, 200, 0.55), 1px 1px 0px #1a1a1a'
        : 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -3px 6px rgba(0,0,0,0.45), 1px 1px 0px #1a1a1a',
    },
    className: isMuted
      ? 'border-2 border-[#1a1a1a] text-[#fff8eb] drop-shadow-[0_0_6px_rgba(255,220,180,0.8)] font-black'
      : 'border-2 border-[#1a1a1a] text-[#2b110e] dark:text-[#e6cfc8]/75 font-black',
  }),

  solo: (isSolo: boolean): AnalogButtonStyle => ({
    style: {
      background: isSolo
        ? 'radial-gradient(circle at 50% 45%, #5eead4 0%, #1ea866 48%, #07361e 100%)'
        : 'linear-gradient(180deg, #4e7d63 0%, #385e49 100%)',
      boxShadow: isSolo
        ? 'inset 0 0 12px rgba(0, 30, 12, 0.85), inset 0 1px 2px rgba(220, 255, 235, 0.55), 1px 1px 0px #1a1a1a'
        : 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -3px 6px rgba(0,0,0,0.45), 1px 1px 0px #1a1a1a',
    },
    className: isSolo
      ? 'border-2 border-[#1a1a1a] text-[#f0fdf4] drop-shadow-[0_0_6px_rgba(180,255,215,0.8)] font-black'
      : 'border-2 border-[#1a1a1a] text-[#0f291b] dark:text-[#cce3d6]/75 font-black',
  }),

  muteGroup: (isAssigned: boolean, isActive: boolean): AnalogButtonStyle => {
    if (isActive) {
      return {
        style: {
          background: 'radial-gradient(circle at 50% 45%, #ff7b47 0%, #c83218 52%, #4f0b04 100%)',
          boxShadow: 'inset 0 0 8px rgba(30,0,0,0.8), inset 0 1px 2px rgba(255,220,200,0.55), 1px 1px 0px #1a1a1a',
        },
        className: 'border border-[#1a1a1a] text-[#fff8eb] drop-shadow-[0_0_4px_rgba(255,220,180,0.8)] font-black',
      };
    }
    if (isAssigned) {
      return {
        style: {
          background: 'linear-gradient(180deg, #b88736 0%, #8f6520 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 4px rgba(0,0,0,0.35), 1px 1px 0px #1a1a1a',
        },
        className: 'border border-[#1a1a1a] text-[#1a1a1a] font-black',
      };
    }
    return {
      style: {
        background: 'var(--cordel-card-btn-bg)',
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.25), 1px 1px 0px #1a1a1a',
      },
      className: 'border border-[#1a1a1a]/40 dark:border-[#f4ecd8]/20 text-[var(--cordel-card-btn-text)]/40 font-bold',
    };
  },

  disabled: (): AnalogButtonStyle => ({
    style: {
      background: 'linear-gradient(180deg, #524e4a 0%, #3d3936 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4), 1px 1px 0px #1a1a1a',
    },
    className: 'border-2 border-[#1a1a1a] text-[#8c827a] font-bold opacity-60',
  }),
};
