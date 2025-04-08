import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { disableNumberInputScroll } from './utils/inputUtils';

const root = createRoot(document.getElementById('root')!);

// Call disableNumberInputScroll after the DOM is mounted
const cleanup = disableNumberInputScroll();

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Cleanup when the app is unmounted
root.unmount = () => {
  cleanup();
  root.unmount();
};
