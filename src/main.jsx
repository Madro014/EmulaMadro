import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Limpiar cachés y Service Workers anteriores automáticamente para que siempre cargue la última versión
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')).render(
    <App />
)