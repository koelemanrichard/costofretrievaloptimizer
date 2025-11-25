import React, { useState } from 'react';

interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <svg
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-500 cursor-pointer"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {show && (
        <div className="absolute top-full left-1/2 z-20 w-64 p-2 mt-2 -translate-x-1/2 text-xs text-white bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
};
