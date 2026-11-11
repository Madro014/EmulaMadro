import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {
  SaveContext,
  SaveStrategy,
  LocalStorageSaveStrategy,
  FileSaveStrategy,
  SupabaseSaveStrategy,
} from './saveStrategies'
import {
  ISaveStrategy,
  IndexedDBSaveStrategy,
  SupabaseCloudSaveStrategy,
  FileDownloadSaveStrategy,
  SaveManagerContext,
  AVAILABLE_STRATEGIES,
} from './strategies/saveStrategies'

// Instanciar el contexto con la estrategia por defecto (Local)
const saveContext = new SaveContext(new LocalStorageSaveStrategy())

// Exponer en window para poder probarlo desde la consola del navegador (F12)
if (typeof window !== 'undefined') {
  window.saveContext = saveContext
  window.SaveContext = SaveContext
  window.SaveStrategy = SaveStrategy
  window.LocalStorageSaveStrategy = LocalStorageSaveStrategy
  window.FileSaveStrategy = FileSaveStrategy
  window.SupabaseSaveStrategy = SupabaseSaveStrategy

  // Participantes usados directamente por la UI del emulador (Slots)
  window.SaveManagerContext = SaveManagerContext
  window.ISaveStrategy = ISaveStrategy
  window.IndexedDBSaveStrategy = IndexedDBSaveStrategy
  window.SupabaseCloudSaveStrategy = SupabaseCloudSaveStrategy
  window.FileDownloadSaveStrategy = FileDownloadSaveStrategy
  window.AVAILABLE_STRATEGIES = AVAILABLE_STRATEGIES
  window.emulaSaveContext = new SaveManagerContext(AVAILABLE_STRATEGIES.local)
}

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