

import React from 'react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className, ...props }) => {
  return (
    <select
      className={`w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};