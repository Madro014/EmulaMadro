// src/saveStrategies.js
import { supabase } from './supabaseClient';
import { sanitizeRomKey } from './strategies/saveStrategies';

// 1. Interfaz / Clase Base
export class SaveStrategy {
  async save(_romName, _slot, _stateData) {
    throw new Error('El método save() debe ser implementado.');
  }

  async load(_romName, _slot) {
    throw new Error('El método load() debe ser implementado.');
  }

  getName() {
    return 'BaseStrategy';
  }
}

// 2. Estrategia 1: LocalStorage (Navegador)
export class LocalStorageSaveStrategy extends SaveStrategy {
  async save(romName, slot, stateData) {
    const key = `save_${romName}_slot_${slot}`;
    localStorage.setItem(key, JSON.stringify(stateData ?? null));
    console.log(`[Patrón Strategy - Local] Guardado exitoso en LocalStorage: ${key}`);
    return true;
  }

  async load(romName, slot) {
    const key = `save_${romName}_slot_${slot}`;
    const data = localStorage.getItem(key);
    if (!data) throw new Error('No hay datos en LocalStorage para este slot.');
    console.log(`[Patrón Strategy - Local] Cargado exitoso desde LocalStorage: ${key}`);
    return JSON.parse(data);
  }

  getName() {
    return 'LocalStorage (Navegador)';
  }
}

// 3. Estrategia 2: Archivo descargable (.state)
export class FileSaveStrategy extends SaveStrategy {
  async save(romName, slot, stateData) {
    const blob =
      stateData instanceof Blob
        ? stateData
        : new Blob([JSON.stringify(stateData ?? null, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${romName}_slot${slot}.state`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('[Patrón Strategy - File] Archivo .state generado y descargado.');
    return true;
  }

  async load(_romName, _slot) {
    console.log('[Patrón Strategy - File] Carga delegada a selector de archivos.');
    return null;
  }

  getName() {
    return 'Archivo Descargable (.state)';
  }
}

// 4. Estrategia 3: Nube con Supabase
export class SupabaseSaveStrategy extends SaveStrategy {
  constructor(supabaseClient = supabase) {
    super();
    this.supabase = supabaseClient;
    this.memoryFallback = new Map();
  }

  _getDemoPath(romName, slot) {
    const safeKey = sanitizeRomKey(romName || 'demo') || 'demo';
    return `saves/strategy_console_demo/${safeKey}/slot_${Number(slot)}.json`;
  }

  _hasLiveSupabase() {
    const url = this.supabase?.supabaseUrl || '';
    return Boolean(
      this.supabase?.storage &&
        url &&
        !url.includes('placeholder.supabase.co') &&
        url !== 'PON_TU_URL_AQUI'
    );
  }

  async save(romName, slot, stateData) {
    console.log(`[Patrón Strategy - Supabase] Guardando en la nube para ${romName} en slot ${slot}...`);
    const path = this._getDemoPath(romName, slot);
    this.memoryFallback.set(path, stateData ?? null);

    if (this._hasLiveSupabase()) {
      try {
        const blob =
          stateData instanceof Blob
            ? stateData
            : new Blob([JSON.stringify(stateData ?? null)], { type: 'application/json' });
        const { error } = await this.supabase.storage.from('emulamadro').upload(path, blob, {
          upsert: true,
          contentType: blob.type || 'application/json',
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[Patrón Strategy - Supabase] Fallback local activado:', err.message);
      }
    }
    return true;
  }

  async load(romName, slot) {
    console.log(`[Patrón Strategy - Supabase] Obteniendo partida de la nube para ${romName}...`);
    const path = this._getDemoPath(romName, slot);

    if (this._hasLiveSupabase()) {
      try {
        const { data, error } = await this.supabase.storage.from('emulamadro').download(path);
        if (!error && data) {
          const text = await data.text();
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        }
      } catch (err) {
        console.warn('[Patrón Strategy - Supabase] Leyendo respaldo local:', err.message);
      }
    }

    return this.memoryFallback.has(path) ? this.memoryFallback.get(path) : null;
  }

  getName() {
    return 'Nube (Supabase)';
  }
}

// 5. El Contexto del Patrón Strategy
export class SaveContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    console.log(`[Patrón Strategy] Estrategia cambiada a: ${strategy.getName()}`);
    this.strategy = strategy;
  }

  getStrategyName() {
    return this.strategy ? this.strategy.getName() : 'Sin estrategia';
  }

  async executeSave(romName, slot, stateData) {
    if (!this.strategy) throw new Error('No hay estrategia seleccionada.');
    return await this.strategy.save(romName, slot, stateData);
  }

  async executeLoad(romName, slot) {
    if (!this.strategy) throw new Error('No hay estrategia seleccionada.');
    return await this.strategy.load(romName, slot);
  }
}
