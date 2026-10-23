
import React from 'react';

export interface CordelMenuItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode | string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isDestructive?: boolean;
  isSeparator?: boolean;
  subItems?: CordelMenuItem[];
}

export interface CordelContextMenuProps {
  x: number;
  y: number;
  title?: string;
  items: CordelMenuItem[];
  onClose: () => void;
  minWidth?: number;
}
