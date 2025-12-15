// components/navigation/preview/DeviceFrameWrapper.tsx
// Device frame wrapper for navigation preview

import React from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameWrapperProps {
  device: DeviceType;
  children: React.ReactNode;
  onDeviceChange: (device: DeviceType) => void;
}

const deviceDimensions: Record<DeviceType, { width: string; height: string }> = {
  desktop: { width: '100%', height: '600px' },
  tablet: { width: '768px', height: '500px' },
  mobile: { width: '375px', height: '667px' },
};

const DeviceFrameWrapper: React.FC<DeviceFrameWrapperProps> = ({
  device,
  children,
  onDeviceChange,
}) => {
  const dimensions = deviceDimensions[device];

  return (
    <div className="flex flex-col items-center">
      {/* Device selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onDeviceChange('desktop')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            device === 'desktop'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <span className="mr-1.5">🖥️</span>
          Desktop
        </button>
        <button
          onClick={() => onDeviceChange('tablet')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            device === 'tablet'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <span className="mr-1.5">📱</span>
          Tablet
        </button>
        <button
          onClick={() => onDeviceChange('mobile')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            device === 'mobile'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <span className="mr-1.5">📲</span>
          Mobile
        </button>
      </div>

      {/* Device frame */}
      <div
        className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800 transition-all duration-300 ${
          device === 'desktop' ? 'w-full' : ''
        }`}
        style={{
          width: device !== 'desktop' ? dimensions.width : undefined,
          maxWidth: '100%',
          height: dimensions.height,
        }}
      >
        {/* Browser chrome for desktop */}
        {device === 'desktop' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-xs">
                https://yoursite.com
              </div>
            </div>
          </div>
        )}

        {/* Notch for mobile */}
        {device === 'mobile' && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-10" />
        )}

        {/* Content area */}
        <div
          className="overflow-y-auto bg-white"
          style={{
            height: device === 'desktop' ? 'calc(100% - 40px)' : '100%',
            paddingTop: device === 'mobile' ? '24px' : 0,
          }}
        >
          {children}
        </div>
      </div>

      {/* Device info */}
      <div className="mt-2 text-xs text-gray-500">
        {device === 'desktop' && 'Full width preview'}
        {device === 'tablet' && '768px width (iPad)'}
        {device === 'mobile' && '375px width (iPhone)'}
      </div>
    </div>
  );
};

export default DeviceFrameWrapper;
