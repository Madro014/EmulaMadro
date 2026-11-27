import { useEffect, useRef, useState, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  '.rom-card-hitbox:not(:disabled)',
  '.room-card',
  '.action-mapping-card',
  'input:not([type="hidden"]):not([type="file"]):not(:disabled)',
  'select:not(:disabled)',
  'label.upload-cloud-btn',
  'label.upload-btn',
  'label.settings-btn',
  '[data-console-focus="true"]:not(:disabled)',
].join(', ');

function isElementVisible(el) {
  if (!el || !el.isConnected) return false;
  if (el.getAttribute('data-console-skip') === 'true') return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function getActiveScopeRoot(explicitScopeRef) {
  if (explicitScopeRef?.current && isElementVisible(explicitScopeRef.current)) {
    return explicitScopeRef.current;
  }
  const modals = document.querySelectorAll('.modal-overlay');
  if (modals.length > 0) {
    return modals[modals.length - 1];
  }
  const consoleMenus = document.querySelectorAll('.console-menu-overlay');
  if (consoleMenus.length > 0) {
    return consoleMenus[consoleMenus.length - 1];
  }
  const drawers = document.querySelectorAll('.slots-drawer');
  if (drawers.length > 0) {
    return drawers[drawers.length - 1];
  }
  return document;
}

function getFocusableElements(scopeRoot) {
  if (!scopeRoot) return [];
  const all = Array.from(scopeRoot.querySelectorAll(FOCUSABLE_SELECTOR));
  return all.filter(isElementVisible);
}

function findNextInDirection(currentEl, direction, elements) {
  if (!elements.length) return null;
  if (!currentEl || !elements.includes(currentEl)) {
    return elements.find((el) => el.getAttribute('data-console-autofocus') === 'true') || elements[0];
  }

  const curr = currentEl.getBoundingClientRect();
  const cx = curr.left + curr.width / 2;
  const cy = curr.top + curr.height / 2;

  let best = null;
  let bestScore = Infinity;

  for (const el of elements) {
    if (el === currentEl) continue;
    const rect = el.getBoundingClientRect();
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;

    let primary = 0;
    let ortho = 0;
    let hasOverlap = false;

    if (direction === 'right') {
      if (dx <= 6) continue;
      primary = dx;
      ortho = Math.abs(dy);
      hasOverlap = rect.bottom > curr.top + 4 && rect.top < curr.bottom - 4;
    } else if (direction === 'left') {
      if (dx >= -6) continue;
      primary = -dx;
      ortho = Math.abs(dy);
      hasOverlap = rect.bottom > curr.top + 4 && rect.top < curr.bottom - 4;
    } else if (direction === 'down') {
      if (dy <= 6) continue;
      primary = dy;
      ortho = Math.abs(dx);
      hasOverlap = rect.right > curr.left + 4 && rect.left < curr.right - 4;
    } else if (direction === 'up') {
      if (dy >= -6) continue;
      primary = -dy;
      ortho = Math.abs(dx);
      hasOverlap = rect.right > curr.left + 4 && rect.left < curr.right - 4;
    }

    // Prefer aligned elements (overlapping in orthogonal axis) so grid columns/rows feel natural
    const orthoPenalty = hasOverlap ? ortho * 0.45 : ortho * 2.6 + 180;
    const score = primary + orthoPenalty;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

/**
 * Hook de Navegación Espacial estilo Consola (Gamepad + Teclado).
 * Permite mover el foco por tarjetas, botones y modales con D-Pad / Stick / Flechas,
 * seleccionar con A / Enter y regresar con B / Escape.
 */
export function useConsoleNavigation({
  enabled = true,
  scopeRef = null,
  enableKeyboard = true,
  onBack = null,
  onStart = null,
  onX = null,
  onY = null,
  onPrevTab = null,
  onNextTab = null,
  focusTrigger = null,
} = {}) {
  const [hasGamepad, setHasGamepad] = useState(false);
  const [gamepadName, setGamepadName] = useState('');
  const [consoleActive, setConsoleActive] = useState(false);

  const focusedElRef = useRef(null);
  const prevButtonsRef = useRef({});
  const dirStateRef = useRef({ dir: null, startAt: 0, lastFireAt: 0 });
  const enabledAtRef = useRef(0);
  const needsSeedRef = useRef(true);
  const consoleActiveRef = useRef(false);
  const hasGamepadRef = useRef(false);
  const lastPointerPosRef = useRef(null);

  consoleActiveRef.current = consoleActive;
  hasGamepadRef.current = hasGamepad;

  const callbacksRef = useRef({ onBack, onStart, onX, onY, onPrevTab, onNextTab });
  callbacksRef.current = { onBack, onStart, onX, onY, onPrevTab, onNextTab };

  const applyFocus = useCallback((el, { activateVisual = true } = {}) => {
    if (focusedElRef.current && focusedElRef.current !== el) {
      focusedElRef.current.classList.remove('console-focused');
    }
    focusedElRef.current = el;
    if (!el) return;

    if (activateVisual) {
      setConsoleActive(true);
      el.classList.add('console-focused');
    }

    try {
      el.focus({ preventScroll: true });
    } catch {
      // Some non-focusable cards may still use click
    }

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    } catch {
      // Ignore in non-DOM test environments
    }
  }, []);

  const focusFirst = useCallback((activateVisual = true) => {
    const scope = getActiveScopeRoot(scopeRef);
    const elements = getFocusableElements(scope);
    if (!elements.length) return null;
    const preferred =
      elements.find((el) => el.getAttribute('data-console-autofocus') === 'true') || elements[0];
    applyFocus(preferred, { activateVisual });
    return preferred;
  }, [scopeRef, applyFocus]);

  const moveFocus = useCallback((direction) => {
    const scope = getActiveScopeRoot(scopeRef);
    const elements = getFocusableElements(scope);
    if (!elements.length) return;

    let current = focusedElRef.current;
    if (!current || !elements.includes(current)) {
      const activeEl = document.activeElement;
      if (activeEl && elements.includes(activeEl)) {
        current = activeEl;
      } else {
        const preferred =
          elements.find((el) => el.getAttribute('data-console-autofocus') === 'true') || elements[0];
        applyFocus(preferred, { activateVisual: true });
        return;
      }
    }

    const next = findNextInDirection(current, direction, elements);
    if (next) {
      applyFocus(next, { activateVisual: true });
    } else {
      // Ensure visual highlight stays on current element
      applyFocus(current, { activateVisual: true });
    }
  }, [scopeRef, applyFocus]);

  const activateFocused = useCallback(() => {
    const scope = getActiveScopeRoot(scopeRef);
    const elements = getFocusableElements(scope);
    let el = focusedElRef.current;
    if (!el || !elements.includes(el)) {
      el = focusFirst(true);
      return;
    }

    if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio') {
      el.focus();
      return;
    }
    el.click();
  }, [scopeRef, focusFirst]);

  // Detectar mandos conectados automáticamente al inicio y al conectar/desconectar
  useEffect(() => {
    const refreshPads = (fromEvent = false) => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      let connectedPad = null;
      for (const gp of gps) {
        if (gp && gp.connected) {
          connectedPad = gp;
          break;
        }
      }
      const detected = Boolean(connectedPad);
      setHasGamepad(detected);
      setGamepadName(connectedPad ? connectedPad.id : '');
      if (detected) {
        setConsoleActive(true);
      } else if (fromEvent) {
        setConsoleActive(false);
        if (focusedElRef.current) {
          focusedElRef.current.classList.remove('console-focused');
        }
      }
    };

    const onConnected = () => refreshPads(true);
    const onDisconnected = () => refreshPads(true);

    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);
    refreshPads(false);
    return () => {
      window.removeEventListener('gamepadconnected', onConnected);
      window.removeEventListener('gamepaddisconnected', onDisconnected);
    };
  }, []);

  // Ocultar automáticamente el Modo Consola si el usuario mueve el mouse o usa pantalla táctil
  useEffect(() => {
    const deactivateConsoleUi = () => {
      if (consoleActiveRef.current) {
        setConsoleActive(false);
      }
      if (focusedElRef.current) {
        focusedElRef.current.classList.remove('console-focused');
      }
    };

    const handlePointerDown = (e) => {
      deactivateConsoleUi();
      const clickedTarget = e.target?.closest?.(FOCUSABLE_SELECTOR);
      if (clickedTarget && isElementVisible(clickedTarget)) {
        focusedElRef.current = clickedTarget;
      }
    };

    const handlePointerMove = (e) => {
      if (e.pointerType === 'touch') {
        deactivateConsoleUi();
        return;
      }
      if (e.pointerType === 'mouse' || !e.pointerType) {
        const last = lastPointerPosRef.current;
        if (!last) {
          lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
        const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        if (dist > 8) {
          lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
          deactivateConsoleUi();
        }
      }
    };

    const handleTouchStart = () => {
      deactivateConsoleUi();
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (focusedElRef.current) {
        focusedElRef.current.classList.remove('console-focused');
      }
      return;
    }

    enabledAtRef.current = performance.now();
    needsSeedRef.current = true;
    dirStateRef.current = { dir: null, startAt: 0, lastFireAt: 0 };

    return () => {
      if (focusedElRef.current) {
        focusedElRef.current.classList.remove('console-focused');
      }
    };
  }, [enabled]);

  // Auto-focus first item únicamente cuando Modo Consola está activo
  useEffect(() => {
    if (!enabled || !consoleActive) return;
    const timer = setTimeout(() => {
      const scope = getActiveScopeRoot(scopeRef);
      const elements = getFocusableElements(scope);
      if (!focusedElRef.current || !elements.includes(focusedElRef.current)) {
        focusFirst(true);
      } else {
        focusedElRef.current.classList.add('console-focused');
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [enabled, consoleActive, focusTrigger, scopeRef, focusFirst]);

  // Gamepad polling loop
  useEffect(() => {
    if (!enabled) return;

    let rafId = null;
    const INITIAL_DELAY = 280;
    const REPEAT_INTERVAL = 115;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const activePads = [];
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) activePads.push(gamepads[i]);
      }

      if (activePads.length === 0) {
        if (hasGamepadRef.current) {
          setHasGamepad(false);
          setGamepadName('');
        }
        return;
      }

      if (!hasGamepadRef.current) {
        setHasGamepad(true);
        setGamepadName(activePads[0].id || '');
        setConsoleActive(true);
      }

      // Si el usuario había ocultado el Modo Consola moviendo el mouse o tocando la pantalla,
      // reactivarlo automáticamente apenas presione cualquier botón o mueva un stick del mando
      if (!consoleActiveRef.current) {
        const hasAnyInput = activePads.some(
          (gp) =>
            gp.buttons.some((b) => b && (b.pressed || b.value > 0.5)) ||
            (gp.axes || []).some((a) => Math.abs(a) > 0.45)
        );
        if (hasAnyInput) {
          setConsoleActive(true);
          focusFirst(true);
        }
      }

      // Seed currently pressed buttons on first frame after activation so held buttons don't double-fire
      if (needsSeedRef.current) {
        needsSeedRef.current = false;
        const snapshot = {};
        for (const gp of activePads) {
          snapshot[gp.index] = gp.buttons.map((b) => Boolean(b && (b.pressed || b.value > 0.5)));
        }
        prevButtonsRef.current = snapshot;
        return;
      }

      const pastGrace = now - enabledAtRef.current > 160;

      // Determine merged directional intent across connected pads
      let activeDir = null;
      for (const gp of activePads) {
        const up = gp.buttons[12]?.pressed || (gp.axes?.[1] ?? 0) < -0.55;
        const down = gp.buttons[13]?.pressed || (gp.axes?.[1] ?? 0) > 0.55;
        const left = gp.buttons[14]?.pressed || (gp.axes?.[0] ?? 0) < -0.55;
        const right = gp.buttons[15]?.pressed || (gp.axes?.[0] ?? 0) > 0.55;

        if (up) activeDir = 'up';
        else if (down) activeDir = 'down';
        else if (left) activeDir = 'left';
        else if (right) activeDir = 'right';
        if (activeDir) break;
      }

      if (activeDir) {
        const st = dirStateRef.current;
        if (st.dir !== activeDir) {
          dirStateRef.current = { dir: activeDir, startAt: now, lastFireAt: now };
          if (pastGrace) moveFocus(activeDir);
        } else if (
          pastGrace &&
          now - st.startAt >= INITIAL_DELAY &&
          now - st.lastFireAt >= REPEAT_INTERVAL
        ) {
          dirStateRef.current.lastFireAt = now;
          moveFocus(activeDir);
        }
      } else {
        dirStateRef.current.dir = null;
      }

      // Edge-triggered face/shoulder buttons
      for (const gp of activePads) {
        const prev = prevButtonsRef.current[gp.index] || [];
        const curr = gp.buttons.map((b) => Boolean(b && (b.pressed || b.value > 0.5)));

        const justPressed = (idx) => pastGrace && curr[idx] && !prev[idx];

        if (justPressed(0)) {
          activateFocused();
        } else if (justPressed(1)) {
          const scope = getActiveScopeRoot(scopeRef);
          const nestedCancel = scope?.querySelector?.('[data-console-cancel="true"]');
          if (nestedCancel && scope !== document) {
            nestedCancel.click();
          } else {
            callbacksRef.current.onBack?.();
          }
        } else if (justPressed(2)) {
          callbacksRef.current.onX?.(focusedElRef.current);
        } else if (justPressed(3)) {
          callbacksRef.current.onY?.(focusedElRef.current);
        } else if (justPressed(4)) {
          callbacksRef.current.onPrevTab?.();
        } else if (justPressed(5)) {
          callbacksRef.current.onNextTab?.();
        } else if (justPressed(9)) {
          if (callbacksRef.current.onStart) {
            callbacksRef.current.onStart(focusedElRef.current);
          } else {
            activateFocused();
          }
        }

        prevButtonsRef.current[gp.index] = curr;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, moveFocus, activateFocused, focusFirst, scopeRef]);

  // Optional Keyboard Arrow/Enter/Escape navigation parity
  useEffect(() => {
    if (!enabled || !enableKeyboard) return;

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      const isTextInput =
        (tag === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';

      if (e.key === 'Escape' && callbacksRef.current.onBack) {
        e.preventDefault();
        callbacksRef.current.onBack();
        return;
      }

      if (isTextInput) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveFocus('down');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveFocus('up');
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveFocus('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveFocus('right');
      } else if (e.key === 'Enter' && consoleActive) {
        // Avoid double-triggering native button Enter click if browser already focuses that button
        const active = document.activeElement;
        if (!active || active !== focusedElRef.current || active.tagName === 'DIV' || active.tagName === 'LABEL') {
          e.preventDefault();
          activateFocused();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, enableKeyboard, consoleActive, moveFocus, activateFocused]);

  return {
    hasGamepad,
    gamepadName,
    consoleActive,
    setConsoleActive,
    focusFirst,
    moveFocus,
  };
}
