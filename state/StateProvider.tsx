


import React, { useReducer } from 'react';
// FIX: Corrected import path to be a relative path.
import { AppStateContext, appReducer, initialState } from './appState';

export const StateProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};