
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import to be a relative path to resolve module resolution error.
import App from './App';
import { StateProvider } from './state/StateProvider';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <StateProvider>
        <App />
      </StateProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
