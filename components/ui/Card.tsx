

import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string, onClick?: (e: React.MouseEvent) => void }> = ({ children, className, onClick }) => {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg backdrop-blur-sm ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};