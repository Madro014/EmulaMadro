/**
 * backend/saveManager.js
 * Central module for all save/load operations (SRAM + Save States).
 * Used by the frontend via direct import.
 *
 * Storage key convention:
 *   saves/{sanitizedRomName}/sram.srm    – battery RAM (auto-save)
 *   saves/{sanitizedRomName}/state.bin   – manual save state snapshot
 */

import { get, set } from 'idb-keyval';
import { supabase } from '../src/supabaseClient';

const BUCKET = 'emulamadro';

/** Sanitize a ROM filename into a safe storage path component */
export function sanitizeKey(romName) {
  return romName
    .replace(/\.[^/.]+$/, '')          // strip extension
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // replace unsafe chars with _
    .toLowerCase();
}

export function stateKey(romName)  { return `saves/${sanitizeKey(romName)}/state.bin`; }
export function sramKey(romName)   { return `saves/${sanitizeKey(romName)}/sram.srm`; }

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && url.trim() !== '' && url !== 'PON_TU_URL_AQUI';
};

// ─────────────────────────────────────────────
//  CLOUD HELPERS
// ─────────────────────────────────────────────

async function cloudUpload(path, data) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'supabase not configured' };
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'application/octet-stream',
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error(`[SaveManager] cloudUpload failed for "${path}":`, err.message);
    return { ok: false, reason: err.message };
  }
}

async function cloudDownload(path) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error) {
      // 400 = key not found, that is fine
      if (!error.message?.includes('Object not found') && error.statusCode !== 400) {
        console.error(`[SaveManager] cloudDownload error for "${path}":`, error.message);
      }
      return null;
    }
    return await data.arrayBuffer();
  } catch (err) {
    console.error(`[SaveManager] cloudDownload exception for "${path}":`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────

/**
 * saveState – persists a Nostalgist state Blob to IndexedDB + Supabase.
 * @param {string} romName
 * @param {Blob|File|ArrayBuffer|Uint8Array} stateData - the `state` Blob from saveState()
 */
export async function saveState(romName, stateData) {
  const key = stateKey(romName);

  // Normalize to ArrayBuffer for storage
  let buffer;
  if (stateData instanceof Blob || stateData instanceof File) {
    // Normal path: Nostalgist returns a Blob
    buffer = await stateData.arrayBuffer();
  } else if (stateData instanceof ArrayBuffer) {
    buffer = stateData;
  } else if (ArrayBuffer.isView(stateData)) {
    // TypedArray (Uint8Array, etc.)
    buffer = stateData.buffer.slice(stateData.byteOffset, stateData.byteOffset + stateData.byteLength);
  } else {
    console.error('[SaveManager] Unknown state type:', Object.prototype.toString.call(stateData), stateData);
    throw new Error('Formato de estado desconocido: ' + Object.prototype.toString.call(stateData));
  }

  // 1. Local (IndexedDB) – always first
  await set(key, buffer);

  // 2. Cloud – best-effort
  const cloud = await cloudUpload(key, buffer);

  return { local: true, cloud: cloud.ok, cloudError: cloud.reason };
}

/**
 * loadState – fetches the save state (cloud first, local fallback).
 * Returns an ArrayBuffer or null.
 */
export async function loadState(romName) {
  const key = stateKey(romName);

  // 1. Cloud first
  const cloudBuffer = await cloudDownload(key);
  if (cloudBuffer) {
    // Sync back to local so next load is instant
    await set(key, cloudBuffer);
    return cloudBuffer;
  }

  // 2. Local fallback
  const localBuffer = await get(key);
  return localBuffer || null;
}

/**
 * saveSram – save battery RAM (SRAM) to both stores.
 */
export async function saveSram(romName, sramData) {
  const key = sramKey(romName);

  let buffer;
  if (sramData instanceof Blob) {
    if (sramData.size === 0) return { local: false, cloud: false, reason: 'empty sram' };
    buffer = await sramData.arrayBuffer();
  } else if (sramData instanceof ArrayBuffer) {
    buffer = sramData;
  } else {
    return { local: false, cloud: false, reason: 'invalid sram format' };
  }

  await set(key, buffer);
  const cloud = await cloudUpload(key, buffer);

  return { local: true, cloud: cloud.ok, cloudError: cloud.reason };
}

/**
 * loadSram – fetch SRAM from cloud or local.
 * Returns an ArrayBuffer or null.
 */
export async function loadSram(romName) {
  const key = sramKey(romName);

  const cloudBuffer = await cloudDownload(key);
  if (cloudBuffer) {
    await set(key, cloudBuffer);
    return cloudBuffer;
  }

  return (await get(key)) || null;
}
