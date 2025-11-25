
import React, { useEffect, useState } from 'react';

interface NotificationBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000); // Auto-dismiss after 5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-900/80 backdrop-blur-sm border-b border-blue-700 text-white p-3 text-center text-sm z-[100] shadow-lg animate-fade-in-down">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
        <span className="flex-grow text-left">{message}</span>
        <button onClick={onDismiss} className="text-lg leading-none hover:text-gray-300 flex-shrink-0">&times;</button>
      </div>
       <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
