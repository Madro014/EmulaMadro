// src/strategies/saveStrategies.js
import { supabase } from '../supabaseClient';

const BUCKET = 'emulamadro';

/**
 * Normaliza el nombre del ROM quitando únicamente extensiones de consola/arcade conocidas,
 * evitando truncar títulos que contienen puntos (como "Super Mario Bros. 3").
 */
export function stripRomExtension(romName = '') {
  return String(romName).replace(
    /\.(nes|smc|sfc|gba|gb|gbc|gen|md|zip|sms|gg|pce|n64|z64|bin|cue|32x|ngp|ngc)$/i,
    ''
  );
}

/**
 * Convierte el nombre de un ROM en una clave segura para rutas en IndexedDB y Supabase Storage.
 */
export function sanitizeRomKey(romName = '') {
  return stripRomExtension(romName)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
}

function normalizeBlob(stateData) {
  if (stateData instanceof Blob) return stateData;
  if (stateData instanceof ArrayBuffer || ArrayBuffer.isView(stateData)) {
    return new Blob([stateData], { type: 'application/octet-stream' });
  }
  throw new Error('Formato de estado de partida inválido.');
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/octet-stream' });
}

const isSupabaseConfigured = () => {
  let url = '';
  try {
    url = import.meta.env.VITE_SUPABASE_URL || '';
  } catch {
    url = '';
  }
  if (!url && supabase?.supabaseUrl) {
    url = supabase.supabaseUrl;
  }
  return Boolean(
    supabase &&
      url &&
      url.trim() !== '' &&
      url !== 'PON_TU_URL_AQUI' &&
      !url.includes('placeholder.supabase.co')
  );
};

/**
 * PARTICIPANTE 1: Strategy (Interfaz / Clase Base Abstracta)
 * Define el contrato estandarizado que todas las estrategias concretas de guardado deben cumplir.
 */
export class ISaveStrategy {
  getName() {
    throw new Error('El método getName() debe ser implementado por la estrategia concreta.');
  }

  async save(_romName, _slot, _stateBlob) {
    throw new Error('El método save() debe ser implementado por la estrategia concreta.');
  }

  async load(_romName, _slot) {
    throw new Error('El método load() debe ser implementado por la estrategia concreta.');
  }

  async list(_romName) {
    throw new Error('El método list() debe ser implementado por la estrategia concreta.');
  }

  async delete(_romName, _slot) {
    throw new Error('El método delete() debe ser implementado por la estrategia concreta.');
  }
}

/**
 * PARTICIPANTE 2A: ConcreteStrategy A - Almacenamiento Local (IndexedDB)
 * Ideal para partidas rápidas sin latencia de red o estados binarios pesados.
 */
export class IndexedDBSaveStrategy extends ISaveStrategy {
  constructor() {
    super();
    this.dbName = 'EmulaMadroStrategyDB';
    this.storeName = 'save_states';
  }

  getName() {
    return 'Local (IndexedDB)';
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async save(romName, slot, stateBlob) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const normalizedBlob = normalizeBlob(stateBlob);
    console.info(`[ConcreteStrategy: IndexedDBSaveStrategy] Guardando partida de "${cleanRom}" en Slot ${slot}...`);

    const db = await this.openDB();
    const record = {
      id: `${romKey}_slot_${slot}`,
      romKey,
      romName: cleanRom,
      slot: Number(slot),
      blob: normalizedBlob,
      size: normalizedBlob.size,
      updatedAt: new Date().toISOString(),
      strategy: this.getName(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve({
          slot: record.slot,
          size: record.size,
          updatedAt: record.updatedAt,
          strategy: record.strategy,
        });
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async load(romName, slot) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    console.info(`[ConcreteStrategy: IndexedDBSaveStrategy] Cargando partida de "${cleanRom}" desde Slot ${slot}...`);

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(`${romKey}_slot_${slot}`);
      req.onsuccess = () => {
        if (!req.result?.blob) {
          return reject(new Error(`Slot ${slot} vacío en almacenamiento local.`));
        }
        const rawBlob = req.result.blob;
        resolve(
          rawBlob instanceof Blob
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/octet-stream' })
        );
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async list(romName) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).getAll();
      req.onsuccess = () => {
        const filtered = (req.result || [])
          .filter((item) => item.romKey === romKey || item.romName === cleanRom)
          .map(({ slot, size, updatedAt, strategy }) => ({ slot, size, updatedAt, strategy }))
          .sort((a, b) => a.slot - b.slot);
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async delete(romName, slot) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    console.info(`[ConcreteStrategy: IndexedDBSaveStrategy] Eliminando Slot ${slot} de "${cleanRom}"...`);

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(`${romKey}_slot_${slot}`);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
}

/**
 * PARTICIPANTE 2B: ConcreteStrategy B - Almacenamiento en la Nube (Supabase Storage + Respaldo Local)
 * Sincroniza los estados binarios entre dispositivos en el bucket `emulamadro` (`saves/{romKey}/slot_{n}.state`),
 * manteniendo respaldo local transparente si no hay conexión o Supabase no está configurado.
 */
export class SupabaseCloudSaveStrategy extends ISaveStrategy {
  constructor() {
    super();
    this.storageKeyPrefix = 'emulamadro_cloud_sync_';
  }

  getName() {
    return 'Nube (Supabase Cloud)';
  }

  getSlotPath(romKey, slot) {
    return `saves/${romKey}/slot_${Number(slot)}.state`;
  }

  getLegacyPath(romKey) {
    return `saves/${romKey}/state.bin`;
  }

  readLocalMirror(romKey) {
    try {
      return JSON.parse(localStorage.getItem(`${this.storageKeyPrefix}${romKey}`) || '{}');
    } catch {
      return {};
    }
  }

  writeLocalMirror(romKey, map) {
    try {
      localStorage.setItem(`${this.storageKeyPrefix}${romKey}`, JSON.stringify(map));
    } catch (err) {
      console.warn('[SupabaseCloudSaveStrategy] Caché espejo local omitida (cuota excedida o bloqueada):', err.message);
    }
  }

  async save(romName, slot, stateBlob) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);
    const normalizedBlob = normalizeBlob(stateBlob);
    const updatedAt = new Date().toISOString();

    console.info(`[ConcreteStrategy: SupabaseCloudSaveStrategy] Sincronizando partida de "${cleanRom}" (Slot ${slotNum}) con Supabase Storage...`);

    let syncedToCloud = false;
    if (isSupabaseConfigured()) {
      try {
        const path = this.getSlotPath(romKey, slotNum);
        const { error } = await supabase.storage.from(BUCKET).upload(path, normalizedBlob, {
          upsert: true,
          contentType: 'application/octet-stream',
        });
        if (error) throw error;
        syncedToCloud = true;
      } catch (err) {
        console.warn('[SupabaseCloudSaveStrategy] Fallo al subir a Supabase Storage, usando respaldo caché local:', err.message);
      }
    }

    if (!syncedToCloud) {
      const base64Data = await blobToBase64(normalizedBlob);
      const mirror = this.readLocalMirror(romKey);
      mirror[slotNum] = {
        slot: slotNum,
        size: normalizedBlob.size,
        updatedAt,
        base64Data,
        strategy: this.getName(),
      };
      this.writeLocalMirror(romKey, mirror);
    } else {
      // Si ya está sincronizado en Supabase Storage, limpiamos posible copia vieja offline para ahorrar espacio
      const mirror = this.readLocalMirror(romKey);
      if (mirror[slotNum]) {
        delete mirror[slotNum];
        this.writeLocalMirror(romKey, mirror);
      }
    }

    return {
      slot: slotNum,
      size: normalizedBlob.size,
      updatedAt,
      strategy: this.getName(),
      cloud: syncedToCloud,
    };
  }

  async load(romName, slot) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);

    console.info(`[ConcreteStrategy: SupabaseCloudSaveStrategy] Descargando estado de "${cleanRom}" (Slot ${slotNum}) desde la nube...`);

    if (isSupabaseConfigured()) {
      try {
        const primaryPath = this.getSlotPath(romKey, slotNum);
        const { data, error } = await supabase.storage.from(BUCKET).download(primaryPath);
        if (!error && data) {
          return normalizeBlob(data);
        }

        // Compatibilidad con estados guardados heredados de v1 (`state.bin`) en Slot 1
        if (slotNum === 1) {
          const { data: legacyData, error: legacyErr } = await supabase.storage
            .from(BUCKET)
            .download(this.getLegacyPath(romKey));
          if (!legacyErr && legacyData) {
            return normalizeBlob(legacyData);
          }
        }
      } catch (err) {
        console.warn('[SupabaseCloudSaveStrategy] Error descargando desde Supabase Storage:', err.message);
      }
    }

    const mirror = this.readLocalMirror(romKey);
    const entry = mirror[slotNum];
    if (entry?.base64Data) {
      return base64ToBlob(entry.base64Data);
    }

    throw new Error(`No existe partida en la nube para el Slot ${slotNum}.`);
  }

  async list(romName) {
    const romKey = sanitizeRomKey(romName);
    const slotMap = new Map();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list(`saves/${romKey}`, { limit: 100 });

        if (!error && Array.isArray(data)) {
          let hasLegacyStateBin = null;

          for (const file of data) {
            if (!file.name || file.name.startsWith('.')) continue;
            const slotMatch = file.name.match(/^slot_(\d+)\.state$/i);
            if (slotMatch) {
              const slotNum = Number(slotMatch[1]);
              slotMap.set(slotNum, {
                slot: slotNum,
                size: file.metadata?.size || 0,
                updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
                strategy: this.getName(),
                cloud: true,
              });
            } else if (file.name === 'state.bin') {
              hasLegacyStateBin = file;
            }
          }

          if (hasLegacyStateBin && !slotMap.has(1)) {
            slotMap.set(1, {
              slot: 1,
              size: hasLegacyStateBin.metadata?.size || 0,
              updatedAt: hasLegacyStateBin.updated_at || hasLegacyStateBin.created_at || new Date().toISOString(),
              strategy: `${this.getName()} (v1)`,
              cloud: true,
              legacy: true,
            });
          }
        }
      } catch (err) {
        console.warn('[SupabaseCloudSaveStrategy] Error listando nube:', err.message);
      }
    }

    const mirror = this.readLocalMirror(romKey);
    for (const entry of Object.values(mirror)) {
      if (entry && !slotMap.has(Number(entry.slot))) {
        slotMap.set(Number(entry.slot), {
          slot: Number(entry.slot),
          size: entry.size || 0,
          updatedAt: entry.updatedAt,
          strategy: entry.strategy || this.getName(),
          cloud: false,
        });
      }
    }

    return Array.from(slotMap.values()).sort((a, b) => a.slot - b.slot);
  }

  async delete(romName, slot) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);

    console.info(`[ConcreteStrategy: SupabaseCloudSaveStrategy] Eliminando partida en la nube de "${cleanRom}" (Slot ${slotNum})...`);

    if (isSupabaseConfigured()) {
      const pathsToRemove = [this.getSlotPath(romKey, slotNum)];
      if (slotNum === 1) {
        pathsToRemove.push(this.getLegacyPath(romKey));
      }

      for (const path of pathsToRemove) {
        try {
          const { data: removed, error: removeErr } = await supabase.storage.from(BUCKET).remove([path]);
          if (removeErr || !removed || removed.length === 0) {
            const fileName = path.split('/').pop();
            const trashPath = `.trash/saves/${romKey}/${Date.now()}_${fileName}`;
            await supabase.storage.from(BUCKET).move(path, trashPath);
          }
        } catch (err) {
          console.warn(`[SupabaseCloudSaveStrategy] No se pudo borrar ${path}:`, err.message);
        }
      }
    }

    const mirror = this.readLocalMirror(romKey);
    if (mirror[slotNum]) {
      delete mirror[slotNum];
      this.writeLocalMirror(romKey, mirror);
    }

    return true;
  }
}

/**
 * PARTICIPANTE 2C: ConcreteStrategy C - Exportación / Importación de Archivo Físico (.state)
 * Descarga directamente el volcado binario de memoria al disco del usuario o lo carga desde un archivo.
 */
export class FileDownloadSaveStrategy extends ISaveStrategy {
  constructor() {
    super();
    this.memoryRegistry = {};
  }

  getName() {
    return 'Archivo Físico (.state)';
  }

  async save(romName, slot, stateBlob) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);
    const normalizedBlob = normalizeBlob(stateBlob);
    const downloadFileName = `${cleanRom}_slot${slotNum}.state`;

    console.info(`[ConcreteStrategy: FileDownloadSaveStrategy] Exportando archivo físico "${downloadFileName}"...`);

    const url = URL.createObjectURL(normalizedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const meta = {
      slot: slotNum,
      size: normalizedBlob.size,
      updatedAt: new Date().toISOString(),
      blob: normalizedBlob,
      strategy: this.getName(),
      fileName: downloadFileName,
    };

    if (!this.memoryRegistry[romKey]) this.memoryRegistry[romKey] = {};
    this.memoryRegistry[romKey][slotNum] = meta;

    return {
      slot: meta.slot,
      size: meta.size,
      updatedAt: meta.updatedAt,
      strategy: meta.strategy,
    };
  }

  async load(romName, slot, { forceFilePicker = false } = {}) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);

    console.info(`[ConcreteStrategy: FileDownloadSaveStrategy] Solicitando archivo físico .state para "${cleanRom}" (Slot ${slotNum})...`);

    if (!forceFilePicker && this.memoryRegistry[romKey]?.[slotNum]?.blob) {
      return this.memoryRegistry[romKey][slotNum].blob;
    }

    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.state,.bin';
      input.style.display = 'none';
      document.body.appendChild(input);

      let settled = false;
      const cleanup = () => {
        if (input.parentNode) document.body.removeChild(input);
      };

      input.onchange = (e) => {
        if (settled) return;
        settled = true;
        const file = e.target.files?.[0];
        cleanup();
        if (!file) {
          reject(new Error('No se seleccionó ningún archivo .state.'));
          return;
        }
        if (!this.memoryRegistry[romKey]) this.memoryRegistry[romKey] = {};
        this.memoryRegistry[romKey][slotNum] = {
          slot: slotNum,
          size: file.size,
          updatedAt: new Date().toISOString(),
          blob: file,
          strategy: this.getName(),
          fileName: file.name,
        };
        resolve(file);
      };

      input.addEventListener('cancel', () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Selección de archivo .state cancelada.'));
      });

      input.click();
    });
  }

  async list(romName) {
    const romKey = sanitizeRomKey(romName);
    const slots = this.memoryRegistry[romKey] || {};
    return Object.values(slots)
      .map(({ slot, size, updatedAt, strategy, fileName }) => ({
        slot,
        size,
        updatedAt,
        strategy,
        fileName,
      }))
      .sort((a, b) => a.slot - b.slot);
  }

  async delete(romName, slot) {
    const cleanRom = stripRomExtension(romName);
    const romKey = sanitizeRomKey(romName);
    const slotNum = Number(slot);
    console.info(`[ConcreteStrategy: FileDownloadSaveStrategy] Eliminando respaldo de sesión en Slot ${slotNum} de "${cleanRom}"...`);
    if (this.memoryRegistry[romKey]) {
      delete this.memoryRegistry[romKey][slotNum];
    }
    return true;
  }
}

/**
 * PARTICIPANTE 3: Context (Contexto)
 * Mantiene una referencia a una instancia de ISaveStrategy y delega todas las operaciones
 * de persistencia sin usar condicionales acoplados.
 */
export class SaveManagerContext {
  constructor(initialStrategy) {
    if (!(initialStrategy instanceof ISaveStrategy)) {
      throw new Error('La estrategia inicial debe heredar de ISaveStrategy.');
    }
    this.strategy = initialStrategy;
  }

  setStrategy(newStrategy) {
    if (!(newStrategy instanceof ISaveStrategy)) {
      throw new Error('La estrategia proporcionada debe heredar de ISaveStrategy.');
    }
    console.info(`[Context: SaveManagerContext] Cambiando estrategia en tiempo de ejecución a: ${newStrategy.getName()}`);
    this.strategy = newStrategy;
  }

  getStrategyName() {
    return this.strategy.getName();
  }

  getStrategyClassName() {
    return this.strategy.constructor.name;
  }

  async executeSave(romName, slot, stateBlob) {
    return await this.strategy.save(romName, slot, stateBlob);
  }

  async executeLoad(romName, slot, options) {
    return await this.strategy.load(romName, slot, options);
  }

  async executeList(romName) {
    return await this.strategy.list(romName);
  }

  async executeDelete(romName, slot) {
    return await this.strategy.delete(romName, slot);
  }
}

// Registro central de Estrategias Concretas disponibles para el Cliente
export const AVAILABLE_STRATEGIES = {
  local: new IndexedDBSaveStrategy(),
  cloud: new SupabaseCloudSaveStrategy(),
  file: new FileDownloadSaveStrategy(),
};
