

import React from 'react';

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className, ...props }) => {
  return (
    <label className={`block text-sm font-medium text-gray-300 mb-2 ${className}`} {...props}>
      {children}
    </label>
  );
};