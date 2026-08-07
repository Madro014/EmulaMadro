import { useEffect, useRef, useState } from 'react';

const KEY_MAP_P1 = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  B: 'z',
  A: 'x',
  Y: 'a',
  X: 's',
  L: 'q',
  R: 'w',
  START: 'Enter',
  SELECT: 'Shift'
};

export const KEY_MAP_P2 = {
  UP: 'i',
  DOWN: 'k',
  LEFT: 'j',
  RIGHT: 'l',
  B: 'n',
  A: 'm',
  Y: 'g',
  X: 'h',
  L: 'u',
  R: 'o',
  START: 'Space',
  SELECT: 'Tab'
};

const CORE_BUTTONS = {
  fceumm: ['UP', 'DOWN', 'LEFT', 'RIGHT', 'B', 'A', 'SELECT', 'START'],
  snes9x: ['UP', 'DOWN', 'LEFT', 'RIGHT', 'B', 'A', 'Y', 'X', 'L', 'R', 'SELECT', 'START'],
  mgba: ['UP', 'DOWN', 'LEFT', 'RIGHT', 'B', 'A', 'L', 'R', 'SELECT', 'START'],
  genesis_plus_gx: ['UP', 'DOWN', 'LEFT', 'RIGHT', 'B', 'A', 'Y', 'X', 'L', 'R', 'SELECT', 'START']
};

export function useVirtualGamepad({
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
  multiplayerMode,
  sendGuestInput
}) {
  const mappingReqRef = useRef(null);
  const virtualGamepadReqRef = useRef(null);
  const buttonStates = useRef({ 1: {}, 2: {} });
  const prevGpButtonsRef = useRef({});
  const prevGpAxesRef = useRef({});
  const activeKeyboardKeysRef = useRef(new Set());
  const [activeDebugButtons, setActiveDebugButtons] = useState([]);

  // Track keyboard keys pressed globally
  useEffect(() => {
    const handleGameKeyDown = (e) => {
      activeKeyboardKeysRef.current.add(e.code);
    };
    const handleGameKeyUp = (e) => {
      activeKeyboardKeysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleGameKeyDown);
    window.addEventListener('keyup', handleGameKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGameKeyDown);
      window.removeEventListener('keyup', handleGameKeyUp);
    };
  }, []);

  // Listen to keyboard press for key mapping when modal is open and listeningAction is set
  useEffect(() => {
    if (!showSettings) return;

    const handleMapKeyDown = (e) => {
      if (!listeningActionRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setListeningAction(null);
        listeningActionRef.current = null;
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const keyId = `key:${e.code}`;
      setMapping(prev => ({
        ...prev,
        [editingPlayerTab]: {
          ...(prev[editingPlayerTab] || {}),
          [listeningActionRef.current]: keyId
        }
      }));

      setListeningAction(null);
      listeningActionRef.current = null;
    };

    window.addEventListener('keydown', handleMapKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleMapKeyDown, { capture: true });
  }, [showSettings, setMapping, setListeningAction, listeningActionRef, editingPlayerTab]);

  // Poll for mapping when modal is open (Gamepad)
  useEffect(() => {
    if (showSettings) {
      const pollForMapping = () => {
        mappingReqRef.current = requestAnimationFrame(pollForMapping);
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let currentlyPressed = [];
        for (const gp of gamepads) {
          if (!gp) continue;
          
          if (!prevGpButtonsRef.current[gp.index]) {
            prevGpButtonsRef.current[gp.index] = [];
            prevGpAxesRef.current[gp.index] = [];
          }
          const prevButtons = prevGpButtonsRef.current[gp.index];
          const prevAxes = prevGpAxesRef.current[gp.index];
          
          let mappedThisFrame = false;

          // Check buttons
          for (let i = 0; i < gp.buttons.length; i++) {
            const isPressed = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
            if (isPressed) currentlyPressed.push(`B${i}`);
            const wasPressed = prevButtons[i] || false;
            
            if (isPressed && !wasPressed && listeningActionRef.current && !mappedThisFrame) {
              setMapping(prev => ({
                ...prev,
                [editingPlayerTab]: {
                  ...(prev[editingPlayerTab] || {}),
                  [listeningActionRef.current]: i
                }
              }));
              setListeningAction(null);
              listeningActionRef.current = null;
              mappedThisFrame = true;
            }
            prevButtons[i] = isPressed;
          }

          // Check axes
          if (gp.axes) {
            for (let i = 0; i < gp.axes.length; i++) {
              const axisVal = gp.axes[i];
              
              const isNegPressed = axisVal < -0.5;
              const wasNegPressed = prevAxes[i * 2] || false;
              if (isNegPressed && !wasNegPressed && listeningActionRef.current && !mappedThisFrame) {
                setMapping(prev => ({
                  ...prev,
                  [editingPlayerTab]: {
                    ...(prev[editingPlayerTab] || {}),
                    [listeningActionRef.current]: `a${i}-`
                  }
                }));
                setListeningAction(null);
                listeningActionRef.current = null;
                mappedThisFrame = true;
              }
              prevAxes[i * 2] = isNegPressed;

              const isPosPressed = axisVal > 0.5;
              if (isPosPressed) currentlyPressed.push(`A${i}+`);
              const wasPosPressed = prevAxes[i * 2 + 1] || false;
              if (isPosPressed && !wasPosPressed && listeningActionRef.current && !mappedThisFrame) {
                setMapping(prev => ({
                  ...prev,
                  [editingPlayerTab]: {
                    ...(prev[editingPlayerTab] || {}),
                    [listeningActionRef.current]: `a${i}+`
                  }
                }));
                setListeningAction(null);
                listeningActionRef.current = null;
                mappedThisFrame = true;
              }
              prevAxes[i * 2 + 1] = isPosPressed;
            }
          }
        }
        setActiveDebugButtons(prev => {
          const prevStr = prev.join(',');
          const newStr = currentlyPressed.join(',');
          return prevStr === newStr ? prev : currentlyPressed;
        });
      };
      mappingReqRef.current = requestAnimationFrame(pollForMapping);
    } else {
      cancelAnimationFrame(mappingReqRef.current);
    }
    return () => cancelAnimationFrame(mappingReqRef.current);
  }, [showSettings, setMapping, setListeningAction, listeningActionRef, editingPlayerTab]);

  // Virtual Gamepad Translator Loop (Runs when game is active)
  useEffect(() => {
    if (showSettings || !nostalgistRef.current || loading) return;

    const activeActions = CORE_BUTTONS[core] || CORE_BUTTONS.fceumm;

    const sendKey = (key, type) => {
      const canvas = emuWrapperRef.current?.querySelector('canvas');
      if (!canvas) return;
      
      let code = key;
      let keyCode = 0;
      
      if (key === 'Enter') { code = 'Enter'; keyCode = 13; }
      else if (key === 'Shift') { code = 'ShiftLeft'; keyCode = 16; }
      else if (key === 'ArrowUp') { code = 'ArrowUp'; keyCode = 38; }
      else if (key === 'ArrowDown') { code = 'ArrowDown'; keyCode = 40; }
      else if (key === 'ArrowLeft') { code = 'ArrowLeft'; keyCode = 37; }
      else if (key === 'ArrowRight') { code = 'ArrowRight'; keyCode = 39; }
      else if (key === ' ') { code = 'Space'; keyCode = 32; }
      else if (key === 'Tab') { code = 'Tab'; keyCode = 9; }
      else { 
        code = `Key${key.toUpperCase()}`; 
        keyCode = key.toUpperCase().charCodeAt(0); 
      }

      canvas.dispatchEvent(new KeyboardEvent(type, {
        key, code, keyCode, which: keyCode, bubbles: true, cancelable: true
      }));
    };

    const pollVirtualGamepad = () => {
      virtualGamepadReqRef.current = requestAnimationFrame(pollVirtualGamepad);
      
      if (multiplayerMode !== 'guest' && !nostalgistRef.current) return;

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const activeGps = [];
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) activeGps.push(gamepads[i]);
      }

      let p1Gamepad = activeGps[0];
      let p2Gamepad = activeGps[1];

      if (multiplayerMode === 'guest' && activeGps[0]) {
        p1Gamepad = null;
        p2Gamepad = activeGps[0];
      } else if (activeGps.length === 1) {
        if (playerRole === 1) {
          p1Gamepad = activeGps[0];
        } else {
          p2Gamepad = activeGps[0];
        }
      }

      const processPlayerInput = (playerNum, gamepad, keyMap, playerMapping) => {
        activeActions.forEach(action => {
          const mappedBtnId = playerMapping[action];
          let isPressed = false;
          
          if (mappedBtnId !== undefined) {
            if (typeof mappedBtnId === 'string' && mappedBtnId.startsWith('key:')) {
              const keyId = mappedBtnId.replace('key:', '');
              if (activeKeyboardKeysRef.current.has(keyId)) {
                isPressed = true;
              }
            } else if (gamepad) {
              if (typeof mappedBtnId === 'string' && mappedBtnId.startsWith('a')) {
                const axisIndex = parseInt(mappedBtnId.substring(1, mappedBtnId.length - 1));
                const direction = mappedBtnId.endsWith('+') ? 1 : -1;
                if (gamepad.axes && gamepad.axes[axisIndex] !== undefined) {
                  if (direction === 1 && gamepad.axes[axisIndex] > 0.5) isPressed = true;
                  if (direction === -1 && gamepad.axes[axisIndex] < -0.5) isPressed = true;
                }
              } else if (gamepad.buttons[mappedBtnId]) {
                isPressed = gamepad.buttons[mappedBtnId].pressed || gamepad.buttons[mappedBtnId].value > 0.5;
              }
            }
          }

          if (useJoystickAsDpad && gamepad && gamepad.axes && gamepad.axes.length >= 2) {
            const threshold = 0.5;
            if (action === 'UP' && gamepad.axes[1] < -threshold) isPressed = true;
            if (action === 'DOWN' && gamepad.axes[1] > threshold) isPressed = true;
            if (action === 'LEFT' && gamepad.axes[0] < -threshold) isPressed = true;
            if (typeof mappedBtnId === 'number' && gamepad && gamepad.buttons[mappedBtnId]) {
              isPressed = gamepad.buttons[mappedBtnId].pressed;
            } else if (typeof mappedBtnId === 'string' && mappedBtnId.startsWith('a') && gamepad) {
              const axisId = parseInt(mappedBtnId.replace('a', ''), 10);
              const isPos = mappedBtnId.endsWith('+');
              const val = gamepad.axes[axisId];
              isPressed = isPos ? val > 0.5 : val < -0.5;
            }
          }

          if (!buttonStates.current[playerNum]) {
            buttonStates.current[playerNum] = {};
          }
          const wasPressed = buttonStates.current[playerNum][action] || false;
          
          if (isPressed && !wasPressed) {
            buttonStates.current[playerNum][action] = true;
            if (multiplayerMode === 'guest' && sendGuestInput) {
              sendGuestInput(action, true);
            } else if (multiplayerMode !== 'guest') {
              sendKey(keyMap[action], 'keydown');
            }
          } else if (!isPressed && wasPressed) {
            buttonStates.current[playerNum][action] = false;
            if (multiplayerMode === 'guest' && sendGuestInput) {
              sendGuestInput(action, false);
            } else if (multiplayerMode !== 'guest') {
              sendKey(keyMap[action], 'keyup');
            }
          }
        });
      };

      // Process Player 1 inputs (Host always controls P1)
      if (multiplayerMode !== 'guest') {
        processPlayerInput(1, p1Gamepad, KEY_MAP_P1, mapping[1] || {});
      }
      
      // Process Player 2 inputs (Host should not control P2 locally if online)
      if (multiplayerMode !== 'host') {
        processPlayerInput(2, p2Gamepad, KEY_MAP_P2, mapping[2] || {});
      }
    };
    
    virtualGamepadReqRef.current = requestAnimationFrame(pollVirtualGamepad);
    return () => cancelAnimationFrame(virtualGamepadReqRef.current);
  }, [showSettings, loading, mapping, core, useJoystickAsDpad, nostalgistRef, emuWrapperRef, playerRole, multiplayerMode, sendGuestInput]);

  return { 
    currentCoreActions: CORE_BUTTONS[core] || CORE_BUTTONS.fceumm,
    activeDebugButtons
  };
}
