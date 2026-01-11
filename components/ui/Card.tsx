

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  role?: string;
  'aria-checked'?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  role,
  'aria-checked': ariaChecked,
  tabIndex,
  onKeyDown
}) => {
  return (
    <div
      className={`bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg backdrop-blur-sm ${className}`}
      style={style}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role={role}
      aria-checked={ariaChecked}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
};