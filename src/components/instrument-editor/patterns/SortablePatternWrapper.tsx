
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortablePatternWrapperProps {
  id: number;
  children: (props: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: any;
    listeners: any;
  }) => React.ReactNode;
  style?: React.CSSProperties;
}

export const SortablePatternWrapper: React.FC<SortablePatternWrapperProps> = ({
  id,
  children,
  style: propStyle,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    ...propStyle,
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return <>{children({ setNodeRef, style, attributes, listeners })}</>;
};
