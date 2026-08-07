import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nostalgist } from 'nostalgist';
import { Gamepad2, Maximize, Loader2, Settings, X, Save, Upload, HardDriveDownload } from 'lucide-react';
import { saveState as beSaveState, loadState as beLoadState, saveSram, loadSram } from '../backend/saveManager';
import GamepadSettingsModal from './GamepadSettingsModal';
import MultiplayerModal from './MultiplayerModal';
import EmulatorToolbar from './EmulatorToolbar';
import { useVirtualGamepad, KEY_MAP_P2 } from './useVirtualGamepad';
import { useSaveStates } from './useSaveStates';
import { useMultiplayer } from './useMultiplayer';

const DEFAULT_MAPPING = {
  1: {
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    B: 0, A: 1, Y: 2, X: 3, L: 4, R: 5,
    SELECT: 8, START: 9
  },
  2: {
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    B: 0, A: 1, Y: 2, X: 3, L: 4, R: 5,
    SELECT: 8, START: 9
  }
};

export default function RetroEmulator({ romFile, core, onStop }) {
  const containerRef = useRef(null);
  const emuWrapperRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const nostalgistRef = useRef(null);

  const [gamepadStatus, setGamepadStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [listeningAction, setListeningAction] = useState(null);
  const [useJoystickAsDpad, setUseJoystickAsDpad] = useState(true);
  const [playerRole, setPlayerRole] = useState(1); // 1 or 2
  const [editingPlayerTab, setEditingPlayerTab] = useState(1); // 1 or 2
  const [connectedGamepadCount, setConnectedGamepadCount] = useState(0);
  const [playMode, setPlayMode] = useState('local'); // 'local' or 'online'
  
  const fileInputRef = useRef(null);
  const listeningActionRef = useRef(null);
  const videoRef = useRef(null);

  const onGuestInputReceived = useCallback((action, isPressed) => {
    const canvas = emuWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;

    const key = KEY_MAP_P2[action];
    if (!key) return;

    let code = key;
    let keyCode = 0;
    if (key === 'Space') { code = 'Space'; keyCode = 32; }
    else if (key === 'Tab') { code = 'Tab'; keyCode = 9; }
    else { 
      code = `Key${key.toUpperCase()}`; 
      keyCode = key.toUpperCase().charCodeAt(0); 
    }

    const type = isPressed ? 'keydown' : 'keyup';
    canvas.dispatchEvent(new KeyboardEvent(type, {
      key, code, keyCode, which: keyCode, bubbles: true, cancelable: true
    }));
  }, []);

  const {
    multiplayerState,
    remoteStream,
    hostRoom,
    joinRoom,
    sendGuestInput,
    disconnect,
    broadcastStream
  } = useMultiplayer({ emuWrapperRef, onGuestInputReceived });

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (playMode === 'online') {
      setEditingPlayerTab(playerRole);
    }
  }, [playMode, playerRole]);

  useEffect(() => {
    const updateCount = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      let count = 0;
      for (const gp of gps) {
        if (gp) count++;
      }
      setConnectedGamepadCount(count);
    };
    window.addEventListener('gamepadconnected', updateCount);
    window.addEventListener('gamepaddisconnected', updateCount);
    updateCount();
    return () => {
      window.removeEventListener('gamepadconnected', updateCount);
      window.removeEventListener('gamepaddisconnected', updateCount);
    };
  }, []);

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
    listeningActionRef,
    playerRole,
    editingPlayerTab,
    isGuest: multiplayerState.mode === 'guest',
    sendGuestInput
  });

  useEffect(() => {
    listeningActionRef.current = listeningAction;
  }, [listeningAction]);

  useEffect(() => {
    if (nostalgistRef.current) {
      if (multiplayerState.mode === 'guest') {
        try { nostalgistRef.current.pause(); } catch (e) {}
      } else {
        try { nostalgistRef.current.resume(); } catch (e) {}
      }
    }
  }, [multiplayerState.mode]);

  // Bloquear que el Host presione las teclas del Player 2 localmente
  useEffect(() => {
    const handleBlockP2Keys = (e) => {
      if (multiplayerState.mode !== 'host') return;
      if (!e.isTrusted) return; // Permitir eventos simulados del Guest
      
      const p2Keys = Object.values(mapping[2] || {});
      if (p2Keys.includes(`key:${e.code}`)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleBlockP2Keys, { capture: true });
    window.addEventListener('keyup', handleBlockP2Keys, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleBlockP2Keys, { capture: true });
      window.removeEventListener('keyup', handleBlockP2Keys, { capture: true });
    };
  }, [multiplayerState.mode, mapping]);

  useEffect(() => {
    if (!romFile || !emuWrapperRef.current || multiplayerState.mode === 'guest') return;
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
            pause_nonactive: false,
            input_autodetect_enable: "false", // Disable native gamepad to avoid double inputs
            
            // Player 1 Keyboard Mapping
            input_player1_up: "up",
            input_player1_down: "down",
            input_player1_left: "left",
            input_player1_right: "right",
            input_player1_a: "x",
            input_player1_b: "z",
            input_player1_x: "s",
            input_player1_y: "a",
            input_player1_l: "q",
            input_player1_r: "w",
            input_player1_start: "enter",
            input_player1_select: "rshift",

            // Player 2 Keyboard Mapping
            input_player2_up: "i",
            input_player2_down: "k",
            input_player2_left: "j",
            input_player2_right: "l",
            input_player2_a: "n",
            input_player2_b: "m",
            input_player2_x: "h",
            input_player2_y: "g",
            input_player2_l: "u",
            input_player2_r: "o",
            input_player2_start: "space",
            input_player2_select: "tab"
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
        
        // Si ya hay un jugador conectado y cambiamos el juego, enviar el nuevo stream
        if (multiplayerState.mode === 'host' && multiplayerState.status === 'connected') {
          setTimeout(() => broadcastStream(), 1000);
        }
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

      {multiplayerState.mode === 'host' && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #3b82f6' }}>
          <div className={multiplayerState.status === 'connected' ? '' : 'spin'} style={{ width: '12px', height: '12px', borderRadius: '50%', background: multiplayerState.status === 'connected' ? '#10b981' : '#f59e0b' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{multiplayerState.status === 'connected' ? 'P2 Conectado' : 'Esperando P2...'}</span>
          <button onClick={disconnect} style={{ marginLeft: '0.5rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Cerrar Sala
          </button>
        </div>
      )}

      {multiplayerState.mode === 'guest' && multiplayerState.status === 'connected' && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #10b981' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Conectado</span>
          <button onClick={disconnect} style={{ marginLeft: '0.5rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Salir de Sala
          </button>
        </div>
      )}

      <div className="tv-frame">
        {loading && (
          <div className="loading-overlay">
            <Loader2 className="animate-spin" size={48} />
            <p style={{ marginTop: '1rem' }}>Cargando consola virtual...</p>
          </div>
        )}
        <div 
          ref={emuWrapperRef} 
          className="emu-wrapper" 
          style={{ display: multiplayerState.mode === 'guest' ? 'none' : 'block' }}
        ></div>

        {multiplayerState.mode === 'guest' && (
          <div className="emu-wrapper" style={{ background: 'black' }}>
            {remoteStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted={false}
                controls={false}
                onCanPlay={(e) => e.target.play().catch(console.error)}
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
              />
            ) : (
              <div style={{ color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', zIndex: 10 }}>
                <Loader2 className="spin" size={40} />
                <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>Esperando host...</span>
                <button 
                  onClick={disconnect}
                  style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                {multiplayerState.errorMsg && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{multiplayerState.errorMsg}</p>}
              </div>
            )}
          </div>
        )}
        <div className="scanlines"></div>
        <img src="/tv.webp" className="tv-overlay" alt="TV Frame Overlay" />
      </div>
      
      <EmulatorToolbar 
        openSettings={() => setShowSettings(true)}
        openMultiplayer={() => setShowMultiplayerModal(true)}
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
        closeSettings={() => setShowSettings(false)}
        useJoystickAsDpad={useJoystickAsDpad}
        setUseJoystickAsDpad={setUseJoystickAsDpad}
        currentCoreActions={currentCoreActions}
        listeningAction={listeningAction}
        setListeningAction={setListeningAction}
        mapping={mapping}
        activeDebugButtons={activeDebugButtons}
        playerRole={playerRole}
        setPlayerRole={setPlayerRole}
        editingPlayerTab={editingPlayerTab}
        setEditingPlayerTab={setEditingPlayerTab}
        connectedGamepadCount={connectedGamepadCount}
        multiplayerMode={multiplayerState.mode}
      />

      <MultiplayerModal
        show={showMultiplayerModal}
        onClose={() => setShowMultiplayerModal(false)}
        onCreateRoom={async (data) => {
          await hostRoom(data);
          alert(`¡Sala ${data.name} creada exitosamente!\nEsperando jugadores...`);
        }}
        onJoinRoom={async (data) => {
          await joinRoom(data);
        }}
      />
    </div>
  );
}