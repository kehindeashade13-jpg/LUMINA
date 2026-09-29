import './init.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Tag document root for Chrome Extension popup sizing and styling
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('chrome-extension-popup');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
