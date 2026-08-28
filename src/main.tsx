import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ignore specific unhandled Firebase abort errors during React StrictMode unmounts
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && typeof event.reason.message === 'string' && 
        (event.reason.message.includes('The user aborted a request') || event.reason.message.includes('cancelled'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.debug('Ignored unhandled rejection (likely Firebase unsub):', event.reason.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline/PWA capabilities
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });
}
