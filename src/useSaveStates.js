import { useRef } from 'react';
import { saveState as beSaveState, loadState as beLoadState } from '../backend/saveManager';

export function useSaveStates({
  nostalgistRef,
  romFile,
  emuWrapperRef
}) {
  const savingRef = useRef(false);

  const focusCanvas = () => {
    setTimeout(() => {
      const canvas = emuWrapperRef.current?.querySelector('canvas');
      if (canvas) canvas.focus();
    }, 100);
  };

  const handleQuickSave = async () => {
    if (!nostalgistRef.current || savingRef.current) return;
    try {
      savingRef.current = true;
      const { state } = await nostalgistRef.current.saveState();
      if (!state) throw new Error('El emulador no devolvió un estado válido.');

      const result = await beSaveState(romFile.name, state);
      const cloudMsg = result.cloud ? '☁️ y en la nube.' : '(solo local)';
      alert(`✅ Estado guardado ${cloudMsg}`);
      
      focusCanvas();
    } catch (err) {
      console.error("Error al guardar estado:", err);
      alert("Error al guardar el estado: " + (err.message || "Desconocido"));
    } finally {
      savingRef.current = false;
    }
  };

  const handleLoadStateBrowser = async () => {
    if (!nostalgistRef.current || savingRef.current) return;
    try {
      savingRef.current = true;
      const buffer = await beLoadState(romFile.name);
      if (!buffer) {
        alert('No se encontró ningún Estado guardado para este juego.\n\nGuarda primero con el botón Guardar (Local).');
        return;
      }
      const stateBlob = new Blob([buffer], { type: 'application/octet-stream' });
      await nostalgistRef.current.loadState(stateBlob);
      alert('✅ Estado cargado exitosamente.');
    } catch (err) {
      console.error("Error al cargar estado:", err);
      alert("Error al cargar el estado.");
    } finally {
      savingRef.current = false;
      focusCanvas();
    }
  };

  const handleDownloadSave = async () => {
    if (!nostalgistRef.current || savingRef.current) return;
    try {
      savingRef.current = true;
      const { state } = await nostalgistRef.current.saveState();
      if (!state) throw new Error('No se pudo obtener el estado.');
      beSaveState(romFile.name, state).catch(console.error);
      const url = URL.createObjectURL(state);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${romFile.name.replace(/\.[^/.]+$/, "")}.state`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Archivo de estado descargado (.state).");
      
      focusCanvas();
    } catch (err) {
      console.error("Error al descargar estado:", err);
      alert("Error al generar el archivo de respaldo: " + (err.message || "Desconocido"));
    } finally {
      savingRef.current = false;
    }
  };

  const handleUploadState = async (event) => {
    const file = event.target.files[0];
    if (!file || !nostalgistRef.current) return;

    try {
      await nostalgistRef.current.loadState(file);
      alert('✅ Estado cargado exitosamente desde archivo.');
    } catch (err) {
      console.error("Error al cargar archivo de estado:", err);
      alert("Error al subir el archivo de estado: " + (err.message || "Desconocido"));
    } finally {
      event.target.value = '';
      focusCanvas();
    }
  };

  return {
    handleQuickSave,
    handleLoadStateBrowser,
    handleDownloadSave,
    handleUploadState,
    savingRef
  };
}
