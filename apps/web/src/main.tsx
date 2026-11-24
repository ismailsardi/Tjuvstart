import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startBackgroundSync } from './sync/background';
import '@fontsource-variable/inter/wght.css';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

startBackgroundSync();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
