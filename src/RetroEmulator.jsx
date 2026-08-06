import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nostalgist } from 'nostalgist';
import { Gamepad2, Maximize, Loader2, Settings, X, Save, Upload, HardDriveDownload } from 'lucide-react';
import { saveState as beSaveState, loadState as beLoadState, saveSram, loadSram } from '../backend/saveManager';
import GamepadSettingsModal from './GamepadSettingsModal';
import EmulatorToolbar from './EmulatorToolbar';
import { useVirtualGamepad } from './useVirtualGamepad';
import { useSaveStates } from './useSaveStates';

const DEFAULT_MAPPING = {
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
  B: 0, A: 1, Y: 2, X: 3, L: 4, R: 5,
  SELECT: 8, START: 9
};

export default function RetroEmulator({ romFile, core, onStop }) {
  const containerRef = useRef(null);
  const emuWrapperRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const nostalgistRef = useRef(null);

  const [gamepadStatus, setGamepadStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [listeningAction, setListeningAction] = useState(null);
  const [useJoystickAsDpad, setUseJoystickAsDpad] = useState(true);
  
  const fileInputRef = useRef(null);
  const listeningActionRef = useRef(null);

  const {
    handleQuickSave,
    handleLoadStateBrowser,
    handleDownloadSave,
    handleUploadState,
    savingRef
  } = useSaveStates({
    nostalgistRef,
    romFile,
    emuWrapperRef
  });

  const { currentCoreActions, activeDebugButtons } = useVirtualGamepad({
    showSettings,
    nostalgistRef,
    loading,
    mapping,
    core,
    useJoystickAsDpad,
    listeningAction,
    setMapping,
    setListeningAction,
    emuWrapperRef,
    listeningActionRef
  });

  useEffect(() => {
    listeningActionRef.current = listeningAction;
  }, [listeningAction]);

  useEffect(() => {
    if (!romFile || !emuWrapperRef.current) return;
    let active = true;

    const launchGame = async () => {
      try {
        setLoading(true);
        emuWrapperRef.current.innerHTML = '';

        const canvas = document.createElement('canvas');
        emuWrapperRef.current.appendChild(canvas);

        // Load SRAM via backend (cloud first, local fallback, keys sanitized)
        console.log('[SaveManager] Loading SRAM for:', romFile.name);
        const savedSramBuffer = await loadSram(romFile.name);

        const launchOptions = {
          core: core,
          rom: romFile.isCloud ? romFile.url : romFile,
          element: canvas,
          retroarchConfig: {
            pause_nonactive: true,
            input_autodetect_enable: "false" // Disable native gamepad to avoid double inputs
          },
          resolveCoreJs(coreName) {
            return `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.16.0/retroarch/${coreName}_libretro.js`
          },
          resolveCoreWasm(coreName) {
            return `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.16.0/retroarch/${coreName}_libretro.wasm`
          }
        };

        if (savedSramBuffer) {
          const baseName = romFile.name.replace(/\.[^/.]+$/, "");
          launchOptions.sram = new File([savedSramBuffer], `${baseName}.srm`);
        }

        const emu = await Nostalgist.launch(launchOptions);

        if (!active) {
          try { emu.exit(); } catch (e) {}
          return;
        }

        nostalgistRef.current = emu;
      } catch (err) {
        console.error("Error al cargar el emulador:", err);
        if (active) {
          alert("Ocurrió un error al cargar el juego.");
          onStop();
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    launchGame();

    const autoSaveInterval = setInterval(async () => {
      if (!active || !nostalgistRef.current || savingRef.current) return;
      try {
        const sramBlob = await nostalgistRef.current.saveSRAM();
        if (sramBlob && sramBlob.size > 0) {
          await saveSram(romFile.name, sramBlob);
        }
      } catch (e) {
        // Silently ignore — game may not support SRAM
      }
    }, 5000);

    let connectedTimeoutId;
    let disconnectedTimeoutId;

    const handleGamepadConnected = (e) => {
      setGamepadStatus(`Gamepad Conectado Exitosamente: ${e.gamepad.id}`);
      clearTimeout(connectedTimeoutId);
      connectedTimeoutId = setTimeout(() => setGamepadStatus(null), 5000);
    };

    const handleGamepadDisconnected = () => {
      setGamepadStatus('Gamepad Desconectado');
      clearTimeout(disconnectedTimeoutId);
      disconnectedTimeoutId = setTimeout(() => setGamepadStatus(null), 3000);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      active = false;
      clearInterval(autoSaveInterval);
      clearTimeout(connectedTimeoutId);
      clearTimeout(disconnectedTimeoutId);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      
      // Attempt to save SRAM one last time on unmount
      if (nostalgistRef.current) {
        try {
          nostalgistRef.current.saveSRAM().then(async (sramBlob) => {
            if (sramBlob && sramBlob.size > 0) {
              await saveSram(romFile.name, sramBlob);
            }
          }).catch(() => {});
        } catch (e) {}
        
        try { nostalgistRef.current.exit(); } catch (e) {}
        nostalgistRef.current = null;
      }
    };
  }, [romFile, core, onStop, savingRef]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
    if (nostalgistRef.current) {
      try { nostalgistRef.current.pause(); } catch (e) {}
    }
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setListeningAction(null);
    if (nostalgistRef.current) {
      try { nostalgistRef.current.resume(); } catch (e) {}
    }
    // Force focus back to canvas so Emscripten reads inputs
    setTimeout(() => {
      const canvas = emuWrapperRef.current?.querySelector('canvas');
      if (canvas) canvas.focus();
    }, 100);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="emulator-container" ref={containerRef}>
      {gamepadStatus && (
        <div className="gamepad-toast">
          <Gamepad2 size={20} />
          {gamepadStatus}
        </div>
      )}

      <div className="tv-frame">
        {loading && (
          <div className="loading-overlay">
            <Loader2 className="animate-spin" size={48} />
            <p style={{ marginTop: '1rem' }}>Cargando consola virtual...</p>
          </div>
        )}
        <div ref={emuWrapperRef} className="emu-wrapper"></div>
        <div className="scanlines"></div>
        <img src="/tv.webp" className="tv-overlay" alt="TV Frame Overlay" />
      </div>
      
      <EmulatorToolbar 
        openSettings={openSettings}
        toggleFullscreen={toggleFullscreen}
        handleQuickSave={handleQuickSave}
        handleLoadStateBrowser={handleLoadStateBrowser}
        handleDownloadSave={handleDownloadSave}
        handleUploadState={handleUploadState}
        fileInputRef={fileInputRef}
      />

      <button className="stop-btn" onClick={onStop}>Cambiar Juego</button>

      <GamepadSettingsModal 
        showSettings={showSettings}
        closeSettings={closeSettings}
        useJoystickAsDpad={useJoystickAsDpad}
        setUseJoystickAsDpad={setUseJoystickAsDpad}
        currentCoreActions={currentCoreActions}
        listeningAction={listeningAction}
        setListeningAction={setListeningAction}
        mapping={mapping}
        activeDebugButtons={activeDebugButtons}
      />
    </div>
  );
}