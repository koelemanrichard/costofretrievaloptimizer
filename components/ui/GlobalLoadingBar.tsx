import React from 'react';
// FIX: Corrected import path to be relative.
import { useAppState } from '../../state/appState';

const GlobalLoadingBar: React.FC = () => {
  const { state } = useAppState();
  
  // A simple check if any loading is happening.
  // A more sophisticated implementation could track specific long-running tasks.
  const isLoading = Object.values(state.isLoading).some(Boolean);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50">
      <div className="h-full bg-blue-500 animate-pulse"></div>
    </div>
  );
};

export default GlobalLoadingBar;