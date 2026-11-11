// src/useSaveStates.js
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SaveManagerContext,
  AVAILABLE_STRATEGIES,
  stripRomExtension,
} from './strategies/saveStrategies';

/**
 * PARTICIPANTE 4: Client (Cliente en React)
 * Configura el Contexto (SaveManagerContext) con la Estrategia Concreta seleccionada
 * por el usuario y expone operaciones desacopladas de persistencia.
 */
export function useSaveStates({
  nostalgistRef,
  romFile,
  emuWrapperRef,
}) {
  const [strategyKey, setStrategyKey] = useState('local');
  const [activeSlot, setActiveSlot] = useState(1);
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const contextRef = useRef(new SaveManagerContext(AVAILABLE_STRATEGIES.local));
  const savingRef = useRef(false);
  const refreshSeqRef = useRef(0);
  const toastTimerRef = useRef(null);

  const rawFileName =
    typeof romFile === 'string'
      ? decodeURIComponent(romFile.split('/').pop() || '')
      : romFile?.name || (romFile?.url ? decodeURIComponent(romFile.url.split('/').pop() || '') : '');

  const romName = rawFileName ? stripRomExtension(rawFileName) : null;

  const activeStrategyObj = AVAILABLE_STRATEGIES[strategyKey] || AVAILABLE_STRATEGIES.local;
  const activeStrategyName = activeStrategyObj.getName();
  const activeStrategyClass = activeStrategyObj.constructor.name;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg, type = 'ok') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const focusCanvas = useCallback(() => {
    setTimeout(() => {
      const canvas = emuWrapperRef?.current?.querySelector('canvas');
      if (canvas) canvas.focus();
    }, 100);
  }, [emuWrapperRef]);

  const refreshSlots = useCallback(async (customRomName = romName) => {
    if (!customRomName) {
      setSlots([]);
      return;
    }
    const seq = ++refreshSeqRef.current;
    try {
      const data = await contextRef.current.executeList(customRomName);
      if (seq === refreshSeqRef.current) {
        setSlots(data);
      }
    } catch {
      if (seq === refreshSeqRef.current) {
        setSlots([]);
      }
    }
  }, [romName]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  /**
   * Cambia dinámicamente la estrategia concreta en tiempo de ejecución sin recargar el emulador.
   */
  const changeStrategy = useCallback(async (newKey) => {
    const selectedStrategy = AVAILABLE_STRATEGIES[newKey];
    if (!selectedStrategy) return;

    contextRef.current.setStrategy(selectedStrategy);
    setStrategyKey(newKey);
    await refreshSlots();
    showToast(`Estrategia activa: ${selectedStrategy.getName()}`, 'ok');
    focusCanvas();
  }, [refreshSlots, showToast, focusCanvas]);

  const saveSlot = useCallback(async (slot = activeSlot) => {
    const nostalgist = nostalgistRef?.current;
    if (!nostalgist || !romName || savingRef.current) return;

    savingRef.current = true;
    setBusy(true);
    try {
      const { state } = await nostalgist.saveState();
      if (!state) throw new Error('El emulador no devolvió un estado válido.');

      await contextRef.current.executeSave(romName, slot, state);
      setActiveSlot(Number(slot));
      await refreshSlots();
      showToast(`Guardado en Slot ${slot} vía ${contextRef.current.getStrategyName()}`, 'ok');
    } catch (e) {
      console.error('Error al guardar estado:', e);
      showToast(`Error al guardar: ${e.message || 'Desconocido'}`, 'err');
    } finally {
      savingRef.current = false;
      setBusy(false);
      focusCanvas();
    }
  }, [nostalgistRef, romName, activeSlot, refreshSlots, showToast, focusCanvas]);

  const loadSlot = useCallback(async (slot = activeSlot, options) => {
    const nostalgist = nostalgistRef?.current;
    if (!nostalgist || !romName || savingRef.current) return;

    savingRef.current = true;
    setBusy(true);
    try {
      const blob = await contextRef.current.executeLoad(romName, slot, options);
      if (!blob) throw new Error('Estado vacío o corrupto.');

      await nostalgist.loadState(blob);
      setActiveSlot(Number(slot));
      await refreshSlots();
      showToast(`Slot ${slot} cargado desde ${contextRef.current.getStrategyName()}`, 'ok');
    } catch (e) {
      if (e.message?.includes('cancelada')) {
        showToast('Carga de archivo .state cancelada.', 'info');
      } else {
        console.error('Error al cargar estado:', e);
        showToast(`Error al cargar: ${e.message || 'Desconocido'}`, 'err');
      }
    } finally {
      savingRef.current = false;
      setBusy(false);
      focusCanvas();
    }
  }, [nostalgistRef, romName, activeSlot, refreshSlots, showToast, focusCanvas]);

  const deleteSlot = useCallback(async (slot) => {
    if (!romName || savingRef.current) return;

    setBusy(true);
    try {
      await contextRef.current.executeDelete(romName, slot);
      await refreshSlots();
      showToast(`Slot ${slot} eliminado (${contextRef.current.getStrategyName()})`, 'ok');
    } catch (e) {
      console.error('Error eliminando slot:', e);
      showToast(`Error: ${e.message || 'No se pudo eliminar'}`, 'err');
    } finally {
      setBusy(false);
      focusCanvas();
    }
  }, [romName, refreshSlots, showToast, focusCanvas]);

  // Acciones rápidas compatibles con la barra de herramientas (delegan al Contexto)
  const handleQuickSave = useCallback(() => saveSlot(activeSlot), [saveSlot, activeSlot]);
  const handleLoadStateBrowser = useCallback(() => loadSlot(activeSlot), [loadSlot, activeSlot]);

  const handleDownloadSave = useCallback(async () => {
    const nostalgist = nostalgistRef?.current;
    if (!nostalgist || !romName || savingRef.current) return;

    savingRef.current = true;
    setBusy(true);
    try {
      const { state } = await nostalgist.saveState();
      if (!state) throw new Error('No se pudo obtener el estado del emulador.');

      await AVAILABLE_STRATEGIES.file.save(romName, activeSlot, state);
      if (strategyKey === 'file') {
        await refreshSlots();
      }
      showToast(`Respaldo .state descargado (Slot ${activeSlot})`, 'ok');
    } catch (e) {
      console.error('Error al descargar respaldo .state:', e);
      showToast(`Error al exportar: ${e.message || 'Desconocido'}`, 'err');
    } finally {
      savingRef.current = false;
      setBusy(false);
      focusCanvas();
    }
  }, [nostalgistRef, romName, activeSlot, strategyKey, refreshSlots, showToast, focusCanvas]);

  const handleUploadState = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file || !nostalgistRef?.current) return;

    try {
      await nostalgistRef.current.loadState(file);
      showToast(`Estado cargado desde "${file.name}"`, 'ok');
    } catch (err) {
      console.error('Error al cargar archivo de estado:', err);
      showToast(`Error al subir .state: ${err.message || 'Desconocido'}`, 'err');
    } finally {
      event.target.value = '';
      focusCanvas();
    }
  }, [nostalgistRef, showToast, focusCanvas]);

  return {
    // API del Patrón Strategy (Cliente)
    slots,
    activeSlot,
    setActiveSlot,
    busy,
    toast,
    strategyKey,
    activeStrategyName,
    activeStrategyClass,
    changeStrategy,
    saveSlot,
    loadSlot,
    deleteSlot,
    refreshSlots,

    // Compatibilidad con controles rápidos existentes
    handleQuickSave,
    handleLoadStateBrowser,
    handleDownloadSave,
    handleUploadState,
    savingRef,
  };
}
