import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializePWA } from './pwa.js'

// Initialize PWA on app startup
initializePWA().then((success) => {
  if (success) {
    console.log('[App] PWA initialized successfully');
  } else {
    console.warn('[App] PWA initialization completed with warnings');
  }
}).catch((err) => {
  console.error('[App] PWA initialization error:', err);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
