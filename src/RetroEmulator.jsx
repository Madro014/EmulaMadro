import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nostalgist } from 'nostalgist';
import { Gamepad2, Maximize, Loader2, Settings, X, Save, Upload, HardDriveDownload, MessageSquare, Wifi } from 'lucide-react';
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

const getInitialMapping = () => {
  try {
    const saved = localStorage.getItem('emulamadro_mapping');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_MAPPING;
};

export default function RetroEmulator({ romFile, core, onStop }) {
  const containerRef = useRef(null);
  const emuWrapperRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const nostalgistRef = useRef(null);

  const [gamepadStatus, setGamepadStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [mapping, setMapping] = useState(getInitialMapping);
  const [listeningAction, setListeningAction] = useState(null);
  const [useJoystickAsDpad, setUseJoystickAsDpad] = useState(true);
  const [playerRole, setPlayerRole] = useState(1); // 1 or 2
  const [editingPlayerTab, setEditingPlayerTab] = useState(1); // 1 or 2
  const [connectedGamepadCount, setConnectedGamepadCount] = useState(0);
  const [playMode, setPlayMode] = useState('local'); // 'local' or 'online'

  useEffect(() => {
    try {
      localStorage.setItem('emulamadro_mapping', JSON.stringify(mapping));
    } catch (e) {}
  }, [mapping]);
  
  const fileInputRef = useRef(null);
  const listeningActionRef = useRef(null);
  const videoRef = useRef(null);

  const onGuestInputReceived = useCallback((action, isPressed) => {
    if (!nostalgistRef.current) {
      console.warn("[Host] onGuestInputReceived: nostalgistRef.current aún no está listo.");
      return;
    }
    const btn = action.toLowerCase();
    console.log(`[Host] Input Player 2 recibido: ${btn} -> ${isPressed ? 'DOWN' : 'UP'}`);

    // 1. Inyección nativa a través de Nostalgist exclusivamente para Jugador 2
    try {
      if (isPressed) {
        nostalgistRef.current.pressDown({ button: btn, player: 2 });
      } else {
        nostalgistRef.current.pressUp({ button: btn, player: 2 });
      }
    } catch (err) {
      console.error("[Host] Error inyectando input de Player 2:", err);
    }

    // 2. Dispatch de evento de teclado sobre el canvas de RetroArch para Player 2
    const P2_KEYS = {
      up: { key: 'i', code: 'KeyI', keyCode: 73 },
      down: { key: 'k', code: 'KeyK', keyCode: 75 },
      left: { key: 'j', code: 'KeyJ', keyCode: 74 },
      right: { key: 'l', code: 'KeyL', keyCode: 76 },
      a: { key: 'm', code: 'KeyM', keyCode: 77 },
      b: { key: 'n', code: 'KeyN', keyCode: 78 },
      x: { key: 'u', code: 'KeyU', keyCode: 85 },
      y: { key: 'o', code: 'KeyO', keyCode: 79 },
      start: { key: ' ', code: 'Space', keyCode: 32 },
      select: { key: 'Tab', code: 'Tab', keyCode: 9 }
    };
    const keyData = P2_KEYS[btn];
    if (keyData) {
      const canvas = emuWrapperRef.current?.querySelector('canvas');
      const type = isPressed ? 'keydown' : 'keyup';
      const ev = new KeyboardEvent(type, {
        key: keyData.key,
        code: keyData.code,
        keyCode: keyData.keyCode,
        which: keyData.keyCode,
        bubbles: true,
        cancelable: true
      });
      if (canvas) canvas.dispatchEvent(ev);
    }
  }, []);
  const {
    multiplayerState,
    remoteStream,
    ping,
    chatMessages,
    sendChatMessage,
    hostRoom,
    joinRoom,
    sendGuestInput,
    disconnect,
    broadcastStream
  } = useMultiplayer({ emuWrapperRef, onGuestInputReceived });

  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const chatInputRef = useRef(null);

  // Atajo de teclado estilo Tenkaichi 3: Presionar 'Ctrl + T' (o 'T') abre y cierra el chat
  useEffect(() => {
    if (multiplayerState.status !== 'connected') return;

    const handleKey = (e) => {
      const isCtrlT = (e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T');
      const isPlainT = (e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.altKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA';

      if (isCtrlT || isPlainT) {
        e.preventDefault();
        e.stopPropagation();
        setShowChatInput(prev => {
          const next = !prev;
          if (next) {
            setTimeout(() => chatInputRef.current?.focus(), 50);
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [multiplayerState.status]);

  useEffect(() => {
    if (showChatInput) {
      chatInputRef.current?.focus();
    }
  }, [showChatInput]);

  // Captura global de teclado para el Invitado (Guest / Player 2)
  useEffect(() => {
    if (multiplayerState.mode !== 'guest') return;

    const GUEST_KEYS = {
      // D-Pad tradicional
      'ArrowUp': 'UP',
      'KeyW': 'UP',
      'w': 'UP',
      'W': 'UP',
      'ArrowDown': 'DOWN',
      'KeyS': 'DOWN',
      's': 'DOWN',
      'S': 'DOWN',
      'ArrowLeft': 'LEFT',
      'KeyA': 'LEFT',
      'a': 'LEFT',
      'A': 'LEFT',
      'ArrowRight': 'RIGHT',
      'KeyD': 'RIGHT',
      'd': 'RIGHT',
      'D': 'RIGHT',
      // Botones de acción
      'KeyX': 'A',
      'x': 'A',
      'X': 'A',
      'KeyZ': 'B',
      'z': 'B',
      'Z': 'B',
      'KeyC': 'Y',
      'c': 'Y',
      'C': 'Y',
      'KeyV': 'X',
      'v': 'X',
      'V': 'X',
      'KeyQ': 'L',
      'KeyE': 'R',
      // Menú / Start / Select
      'Enter': 'START',
      'Space': 'START',
      ' ': 'START',
      'ShiftLeft': 'SELECT',
      'ShiftRight': 'SELECT',
      'Shift': 'SELECT',
      'Tab': 'SELECT',
      // Teclas alternativas P2
      'KeyI': 'UP',
      'KeyK': 'DOWN',
      'KeyJ': 'LEFT',
      'KeyL': 'RIGHT',
      'KeyM': 'A',
      'KeyN': 'B'
    };

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.repeat) return;
      const action = GUEST_KEYS[e.code] || GUEST_KEYS[e.key];
      if (action) {
        e.preventDefault();
        console.log(`[Guest] Tecla presionada: ${e.code || e.key} -> Acción: ${action}`);
        sendGuestInput(action, true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const action = GUEST_KEYS[e.code] || GUEST_KEYS[e.key];
      if (action) {
        e.preventDefault();
        console.log(`[Guest] Tecla soltada: ${e.code || e.key} -> Acción: ${action}`);
        sendGuestInput(action, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [multiplayerState.mode, sendGuestInput]);

  const handleTouchInput = useCallback((action, isPressed) => {
    // 1. Si somos el Guest, enviamos la orden por red al Host
    if (multiplayerState.mode === 'guest' && sendGuestInput) {
      sendGuestInput(action, isPressed);
      return;
    }

    // 2. Si somos Host o Local (Jugador 1), inyectamos a nuestro propio emulador
    if (nostalgistRef.current) {
      const btn = action.toLowerCase();
      try {
        if (isPressed) nostalgistRef.current.pressDown({ button: btn, player: 1 });
        else nostalgistRef.current.pressUp({ button: btn, player: 1 });
      } catch (e) {}
    }
  }, [multiplayerState.mode, sendGuestInput]);

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
    multiplayerMode: multiplayerState.mode,
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
            
            // Controller types: 1 = Standard RETRO_DEVICE_JOYPAD
            input_libretro_device_p1: "1",
            input_libretro_device_p2: "1",
            
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
            input_player2_a: "m",
            input_player2_b: "n",
            input_player2_x: "u",
            input_player2_y: "o",
            input_player2_l: "v",
            input_player2_r: "b",
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

        if (core === 'fbalpha2012_neogeo') {
          launchOptions.bios = ['neogeo.zip'];
          launchOptions.resolveBios = () => '/neogeo.zip';
          launchOptions.beforeLaunch = async (nostalgist) => {
            try {
              const fs = nostalgist.getEmscriptenFS();
              if (fs && fs.analyzePath) {
                const sysZip = '/home/web_user/retroarch/userdata/system/neogeo.zip';
                const contentZip = '/home/web_user/retroarch/userdata/content/neogeo.zip';
                if (fs.analyzePath(sysZip).exists && !fs.analyzePath(contentZip).exists) {
                  const data = fs.readFile(sysZip);
                  fs.writeFile(contentZip, data);
                }
              }
            } catch (e) {
              console.warn('Error sincronizando neogeo.zip en carpeta de contenidos:', e);
            }
          };
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

      {/* Netplay HUD Estilo Tenkaichi 3 (Ping RTT, Estado de Conexión, Chat y Código) */}
      {multiplayerState.mode !== 'local' && (
        <div className="netplay-hud">
          <div className="netplay-hud-left">
            <div className={`status-indicator ${multiplayerState.status === 'connected' ? 'connected' : 'waiting'}`}>
              <span className="dot"></span>
              <span>{multiplayerState.status === 'connected' ? 'En Línea' : 'Esperando rival...'}</span>
            </div>
            <span className="role-tag">{multiplayerState.mode === 'host' ? 'Host (P1)' : 'Invitado (P2)'}</span>
            {multiplayerState.roomId && (
              <span className="room-code-tag">SALA: <strong>{multiplayerState.roomId}</strong></span>
            )}
          </div>

          <div className="netplay-hud-right">
            {multiplayerState.status === 'connected' && (
              <>
                <div className={`ping-tag ${ping && ping < 60 ? 'good' : ping && ping < 120 ? 'med' : 'bad'}`}>
                  <Wifi size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {ping !== null ? `${ping} ms` : 'Midiendo...'}
                </div>
                <button 
                  className={`chat-toggle-btn ${showChatInput ? 'active' : ''}`}
                  onClick={() => setShowChatInput(prev => !prev)}
                  title="Abrir chat (Atajo: tecla T)"
                >
                  <MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Chat
                </button>
              </>
            )}
            <button className="leave-room-btn" onClick={disconnect}>
              {multiplayerState.mode === 'host' ? 'Cerrar Sala' : 'Salir'}
            </button>
          </div>
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
                <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>Esperando stream del anfitrión...</span>
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

        {/* Overlay de Chat en Partida Estilo Tenkaichi 3 */}
        {multiplayerState.status === 'connected' && (
          <div className="ingame-chat-container">
            <div className="chat-messages-stream">
              {chatMessages.slice(-5).map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.isSystem ? 'system' : msg.sender === 'Host' ? 'host' : 'guest'}`}>
                  <span className="chat-sender">{msg.sender}:</span>
                  <span className="chat-text">{msg.text}</span>
                </div>
              ))}
            </div>

            {showChatInput && (
              <form 
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    sendChatMessage(chatInput);
                    setChatInput('');
                    setShowChatInput(false);
                  }
                }}
              >
                <input 
                  ref={chatInputRef}
                  type="text" 
                  className="ingame-chat-input"
                  placeholder="Mensaje al rival... (Enter para enviar, Esc para salir)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T'))) {
                      e.preventDefault();
                      setShowChatInput(false);
                    }
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                />
                <button type="submit" className="chat-send-btn">Enviar</button>
              </form>
            )}
          </div>
        )}

        <div className="scanlines"></div>
        <img src="/tv.webp" className="tv-overlay" alt="TV Frame Overlay" />

        <div className="mobile-controls">
          <div className="d-pad-container">
            <button className="d-pad-btn d-pad-up" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('UP', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('UP', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('UP', false)}}></button>
            <button className="d-pad-btn d-pad-down" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('DOWN', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('DOWN', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('DOWN', false)}}></button>
            <button className="d-pad-btn d-pad-left" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('LEFT', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('LEFT', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('LEFT', false)}}></button>
            <button className="d-pad-btn d-pad-right" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('RIGHT', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('RIGHT', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('RIGHT', false)}}></button>
            <div className="d-pad-center"></div>
          </div>
          
          <div className="sys-buttons-container">
            <button className="sys-btn" data-label="SELECT" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('SELECT', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('SELECT', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('SELECT', false)}}></button>
            <button className="sys-btn" data-label="START" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('START', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('START', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('START', false)}}></button>
          </div>

          <div className="action-buttons-container">
            <button className="action-btn action-b" data-label="B" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('B', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('B', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('B', false)}}>B</button>
            <button className="action-btn action-a" data-label="A" onPointerDown={(e)=>{e.preventDefault(); handleTouchInput('A', true)}} onPointerUp={(e)=>{e.preventDefault(); handleTouchInput('A', false)}} onPointerCancel={(e)=>{e.preventDefault(); handleTouchInput('A', false)}}>A</button>
          </div>
        </div>
      </div>
      
      {/* Botón flotante de Chat interactivo (aparece apenas se conecta el rival) */}
      {multiplayerState.status === 'connected' && (
        <button 
          className={`floating-chat-trigger-btn ${showChatInput ? 'active' : ''}`}
          onClick={() => {
            setShowChatInput(prev => {
              const next = !prev;
              if (next) setTimeout(() => chatInputRef.current?.focus(), 50);
              return next;
            });
          }}
          title="Chat Online (Ctrl + T)"
        >
          <MessageSquare size={18} />
          <span className="floating-chat-label">Chat</span>
          <span className="floating-chat-shortcut">Ctrl+T</span>
        </button>
      )}

      <EmulatorToolbar 
        openSettings={() => setShowSettings(true)}
        openMultiplayer={() => setShowMultiplayerModal(true)}
        toggleFullscreen={toggleFullscreen}
        handleQuickSave={handleQuickSave}
        handleLoadStateBrowser={handleLoadStateBrowser}
        handleDownloadSave={handleDownloadSave}
        handleUploadState={handleUploadState}
        fileInputRef={fileInputRef}
        isMultiplayerConnected={multiplayerState.mode !== 'local'}
        toggleChat={() => setShowChatInput(prev => !prev)}
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
        setMapping={setMapping}
        activeDebugButtons={activeDebugButtons}
        playerRole={playerRole}
        setPlayerRole={setPlayerRole}
        editingPlayerTab={editingPlayerTab}
        setEditingPlayerTab={setEditingPlayerTab}
        connectedGamepadCount={connectedGamepadCount}
        multiplayerMode={multiplayerState.mode}
        romName={typeof romFile === 'string' ? romFile : (romFile?.name || '')}
        core={core}
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