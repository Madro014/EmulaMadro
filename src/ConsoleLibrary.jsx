import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CloudUpload,
  Gamepad2,
  Loader2,
  Volume2,
  VolumeX,
  Upload,
} from 'lucide-react';
import { consoleSfx } from './consoleAudio';

function CoverflowArt({ romName, getCoverCandidates, onResolved }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(() => getCoverCandidates(romName), [romName, getCoverCandidates]);
  const src = candidates[candidateIndex] || null;

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  useEffect(() => {
    if (src && onResolved) {
      onResolved(romName, src);
    }
  }, [romName, src, onResolved]);

  if (!src) {
    return (
      <div className="cf-cover-fallback">
        <Gamepad2 size={56} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={romName}
      className="cf-cover-img"
      onError={() => setCandidateIndex((prev) => prev + 1)}
      draggable={false}
    />
  );
}

export default function ConsoleLibrary({
  cloudRoms,
  loadingRoms,
  uploadProgress,
  downloadingRom,
  modalOpen,
  showPressStart,
  onDismissPressStart,
  getCoverCandidates,
  handleCloudUpload,
  handleCoverUpload,
  handleDeleteCloudRom,
  playCloudRom,
  detectCore,
  getCoreBadge,
  formatGameTitle,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeIndex, setActiveIndex] = useState(() => (cloudRoms.length > 0 ? 1 : 0));
  const [inTopBar, setInTopBar] = useState(false);
  const [topBarIndex, setTopBarIndex] = useState(0);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('emulamadro_console_muted') === '1';
    } catch {
      return false;
    }
  });
  const [resolvedCovers, setResolvedCovers] = useState({});
  const [bgLayers, setBgLayers] = useState({ front: '', back: '', activeSlot: 'front' });

  const uploadInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const coverTargetRomRef = useRef(null);

  const prevButtonsRef = useRef({});
  const dirStateRef = useRef({ dir: null, startAt: 0, lastFireAt: 0 });
  const needsSeedRef = useRef(true);
  const mountedAtRef = useRef(performance.now());

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('emulamadro_console_muted', next ? '1' : '0');
      } catch {
        // ignore storage restrictions
      }
      if (!next) consoleSfx.switchFilter(false);
      return next;
    });
  }, []);

  const handleCoverResolved = useCallback((romName, url) => {
    setResolvedCovers((prev) => (prev[romName] === url ? prev : { ...prev, [romName]: url }));
  }, []);

  // Pestañas de sistema: Todos, NES, SNES y otros sistemas detectados dinámicamente
  const filterTabs = useMemo(() => {
    const baseTabs = [
      { id: 'ALL', label: 'Todos' },
      { id: 'NES', label: 'NES' },
      { id: 'SNES', label: 'SNES' },
    ];
    const extras = new Set();
    for (const rom of cloudRoms) {
      const badge = getCoreBadge(detectCore(rom.name));
      if (badge && badge !== 'NES' && badge !== 'SNES') {
        extras.add(badge);
      }
    }
    const extraTabs = Array.from(extras).map((badge) => ({ id: badge, label: badge }));
    return [...baseTabs, ...extraTabs];
  }, [cloudRoms, detectCore, getCoreBadge]);

  // Elementos alcanzables en la barra superior (pestañas + botón subir + sonido)
  const topBarItems = useMemo(() => {
    return [
      ...filterTabs.map((t) => ({ type: 'filter', id: t.id, label: t.label })),
      { type: 'mute', id: 'mute', label: muted ? 'Activar Sonido' : 'Silenciar' },
      { type: 'upload', id: 'upload', label: 'Subir juegos a la nube' },
    ];
  }, [filterTabs, muted]);

  const filteredRoms = useMemo(() => {
    if (activeFilter === 'ALL') return cloudRoms;
    return cloudRoms.filter((rom) => getCoreBadge(detectCore(rom.name)) === activeFilter);
  }, [cloudRoms, activeFilter, detectCore, getCoreBadge]);

  // La primera tarjeta es siempre "+ Subir juego"
  const carouselItems = useMemo(() => {
    return [{ isUploadCard: true, id: '__upload_card__', name: '+ Subir juego' }, ...filteredRoms];
  }, [filteredRoms]);

  // Ajustar índice si cambia el catálogo o filtro
  useEffect(() => {
    setActiveIndex((prev) => {
      if (carouselItems.length <= 1) return 0;
      if (prev >= carouselItems.length) return carouselItems.length - 1;
      return prev;
    });
  }, [carouselItems.length]);

  // Al iniciar carga inicial desde vacío -> enfocar el primer juego real (índice 1) manteniendo "+ Subir juego" a la izquierda
  const hadRomsRef = useRef(cloudRoms.length > 0);
  useEffect(() => {
    if (!hadRomsRef.current && cloudRoms.length > 0 && activeFilter === 'ALL') {
      hadRomsRef.current = true;
      setActiveIndex(1);
    }
  }, [cloudRoms.length, activeFilter]);

  const activeItem = carouselItems[activeIndex] || carouselItems[0];
  const activeBgUrl = useMemo(() => {
    if (!activeItem || activeItem.isUploadCard) return '';
    return resolvedCovers[activeItem.name] || getCoverCandidates(activeItem.name)[0] || '';
  }, [activeItem, resolvedCovers, getCoverCandidates]);

  // Crossfade suave del fondo desenfocado al cambiar de juego
  useEffect(() => {
    setBgLayers((prev) => {
      const currentVisible = prev.activeSlot === 'front' ? prev.front : prev.back;
      if (currentVisible === activeBgUrl) return prev;
      if (prev.activeSlot === 'front') {
        return { front: prev.front, back: activeBgUrl, activeSlot: 'back' };
      }
      return { front: activeBgUrl, back: prev.back, activeSlot: 'front' };
    });
  }, [activeBgUrl]);

  const selectFilter = useCallback(
    (filterId) => {
      if (filterId === activeFilter) return;
      setActiveFilter(filterId);
      const nextCount =
        filterId === 'ALL'
          ? cloudRoms.length
          : cloudRoms.filter((r) => getCoreBadge(detectCore(r.name)) === filterId).length;
      setActiveIndex(nextCount > 0 ? 1 : 0);
      consoleSfx.switchFilter(muted);
    },
    [activeFilter, cloudRoms, detectCore, getCoreBadge, muted]
  );

  const cycleFilter = useCallback(
    (delta) => {
      const idx = filterTabs.findIndex((t) => t.id === activeFilter);
      const nextIdx = (idx + delta + filterTabs.length) % filterTabs.length;
      selectFilter(filterTabs[nextIdx].id);
    },
    [filterTabs, activeFilter, selectFilter]
  );

  const moveCarousel = useCallback(
    (delta) => {
      setActiveIndex((prev) => {
        const next = Math.max(0, Math.min(carouselItems.length - 1, prev + delta));
        if (next !== prev) consoleSfx.move(muted);
        return next;
      });
    },
    [carouselItems.length, muted]
  );

  const triggerCoverPickerForActive = useCallback(() => {
    if (!activeItem || activeItem.isUploadCard) return;
    coverTargetRomRef.current = activeItem.name;
    coverInputRef.current?.click();
  }, [activeItem]);

  const triggerConfirmSelected = useCallback(() => {
    if (showPressStart) {
      consoleSfx.select(muted);
      onDismissPressStart();
      return;
    }

    if (inTopBar) {
      const item = topBarItems[topBarIndex];
      if (!item) return;
      if (item.type === 'filter') {
        selectFilter(item.id);
      } else if (item.type === 'mute') {
        toggleMute();
      } else if (item.type === 'upload') {
        consoleSfx.select(muted);
        uploadInputRef.current?.click();
      }
      return;
    }

    if (!activeItem) return;
    consoleSfx.select(muted);
    if (activeItem.isUploadCard) {
      uploadInputRef.current?.click();
    } else if (downloadingRom !== activeItem.name) {
      playCloudRom(activeItem);
    }
  }, [
    showPressStart,
    onDismissPressStart,
    inTopBar,
    topBarItems,
    topBarIndex,
    selectFilter,
    toggleMute,
    activeItem,
    downloadingRom,
    playCloudRom,
    muted,
  ]);

  // Ref con acciones actualizadas para evitar reiniciar listeners en cada frame
  const actionsRef = useRef({});
  actionsRef.current = {
    showPressStart,
    inTopBar,
    topBarLen: topBarItems.length,
    activeItem,
    muted,
    dismissPressStart: () => {
      consoleSfx.select(muted);
      onDismissPressStart();
    },
    moveCarousel,
    enterTopBar: () => {
      const activeTabIdx = Math.max(
        0,
        filterTabs.findIndex((t) => t.id === activeFilter)
      );
      setTopBarIndex(activeTabIdx);
      setInTopBar(true);
      consoleSfx.move(muted);
    },
    exitTopBar: () => {
      setInTopBar(false);
      consoleSfx.back(muted);
    },
    moveTopBar: (delta) => {
      setTopBarIndex((prev) => {
        const next = Math.max(0, Math.min(topBarItems.length - 1, prev + delta));
        if (next !== prev) consoleSfx.move(muted);
        return next;
      });
    },
    confirm: triggerConfirmSelected,
    cycleFilter,
    triggerCover: triggerCoverPickerForActive,
    triggerDelete: () => {
      if (!inTopBar && activeItem && !activeItem.isUploadCard) {
        consoleSfx.back(muted);
        handleDeleteCloudRom(activeItem.name);
      }
    },
    back: () => {
      if (inTopBar) {
        setInTopBar(false);
        consoleSfx.back(muted);
      } else if (document.fullscreenElement) {
        consoleSfx.back(muted);
        document.exitFullscreen?.().catch(() => {});
      }
    },
  };

  // Reseed botones al cerrar modales para evitar clics fantasmas
  useEffect(() => {
    needsSeedRef.current = true;
    mountedAtRef.current = performance.now();
    dirStateRef.current = { dir: null, startAt: 0, lastFireAt: 0 };
  }, [modalOpen, showPressStart]);

  // Gamepad polling exclusivo del Carrusel Consola a 60fps
  useEffect(() => {
    if (modalOpen) return;

    let rafId = null;
    const INITIAL_DELAY = 260;
    const REPEAT_INTERVAL = 115;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const pads = [];
      for (let i = 0; i < gps.length; i++) {
        if (gps[i] && gps[i].connected) pads.push(gps[i]);
      }
      if (pads.length === 0) return;

      if (needsSeedRef.current) {
        needsSeedRef.current = false;
        const snap = {};
        for (const gp of pads) {
          snap[gp.index] = gp.buttons.map((b) => Boolean(b && (b.pressed || b.value > 0.5)));
        }
        prevButtonsRef.current = snap;
        return;
      }

      const pastGrace = now - mountedAtRef.current > 150;
      const act = actionsRef.current;

      // Si está en pantalla "Press Start", cualquier botón principal entra
      if (act.showPressStart) {
        for (const gp of pads) {
          const prev = prevButtonsRef.current[gp.index] || [];
          const curr = gp.buttons.map((b) => Boolean(b && (b.pressed || b.value > 0.5)));
          const pressedFresh = pastGrace && (curr[0] && !prev[0] || curr[9] && !prev[9] || curr[2] && !prev[2]);
          prevButtonsRef.current[gp.index] = curr;
          if (pressedFresh) {
            act.dismissPressStart();
            return;
          }
        }
        return;
      }

      // Dirección (D-Pad + Stick izquierdo)
      let dir = null;
      for (const gp of pads) {
        const up = gp.buttons[12]?.pressed || (gp.axes?.[1] ?? 0) < -0.55;
        const down = gp.buttons[13]?.pressed || (gp.axes?.[1] ?? 0) > 0.55;
        const left = gp.buttons[14]?.pressed || (gp.axes?.[0] ?? 0) < -0.55;
        const right = gp.buttons[15]?.pressed || (gp.axes?.[0] ?? 0) > 0.55;
        if (left) dir = 'left';
        else if (right) dir = 'right';
        else if (up) dir = 'up';
        else if (down) dir = 'down';
        if (dir) break;
      }

      if (dir) {
        const st = dirStateRef.current;
        const fire = () => {
          if (dir === 'left') {
            if (act.inTopBar) act.moveTopBar(-1);
            else act.moveCarousel(-1);
          } else if (dir === 'right') {
            if (act.inTopBar) act.moveTopBar(1);
            else act.moveCarousel(1);
          } else if (dir === 'up' && !act.inTopBar) {
            act.enterTopBar();
          } else if (dir === 'down' && act.inTopBar) {
            act.exitTopBar();
          }
        };

        if (st.dir !== dir) {
          dirStateRef.current = { dir, startAt: now, lastFireAt: now };
          if (pastGrace) fire();
        } else if (
          pastGrace &&
          (dir === 'left' || dir === 'right') &&
          now - st.startAt >= INITIAL_DELAY &&
          now - st.lastFireAt >= REPEAT_INTERVAL
        ) {
          dirStateRef.current.lastFireAt = now;
          fire();
        }
      } else {
        dirStateRef.current.dir = null;
      }

      // Botones de acción (flanco de subida)
      for (const gp of pads) {
        const prev = prevButtonsRef.current[gp.index] || [];
        const curr = gp.buttons.map((b) => Boolean(b && (b.pressed || b.value > 0.5)));
        const justPressed = (idx) => pastGrace && curr[idx] && !prev[idx];

        if (justPressed(0) || justPressed(9)) {
          act.confirm();
        } else if (justPressed(1)) {
          act.back();
        } else if (justPressed(2)) {
          act.triggerCover();
        } else if (justPressed(3)) {
          act.triggerDelete();
        } else if (justPressed(4)) {
          act.cycleFilter(-1);
        } else if (justPressed(5)) {
          act.cycleFilter(1);
        }

        prevButtonsRef.current[gp.index] = curr;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [modalOpen]);

  // Teclado espejo para probar y navegar fluido (Flechas, Enter, Esc, Q/E)
  useEffect(() => {
    if (modalOpen) return;

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const act = actionsRef.current;

      if (act.showPressStart) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          act.dismissPressStart();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (act.inTopBar) act.moveTopBar(-1);
        else act.moveCarousel(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (act.inTopBar) act.moveTopBar(1);
        else act.moveCarousel(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!act.inTopBar) act.enterTopBar();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (act.inTopBar) act.exitTopBar();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        act.confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        act.back();
      } else if (e.key === 'q' || e.key === 'Q') {
        act.cycleFilter(-1);
      } else if (e.key === 'e' || e.key === 'E') {
        act.cycleFilter(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  // Ventana virtualizada ±3 tarjetas alrededor del elemento enfocado
  const visibleWindow = useMemo(() => {
    const start = Math.max(0, activeIndex - 3);
    const end = Math.min(carouselItems.length - 1, activeIndex + 3);
    const slice = [];
    for (let i = start; i <= end; i++) {
      slice.push({
        item: carouselItems[i],
        index: i,
        offset: i - activeIndex,
      });
    }
    return slice;
  }, [carouselItems, activeIndex]);

  // Puntos indicadores en ventana (máximo 12 puntos visibles si hay muchos juegos)
  const indicatorDots = useMemo(() => {
    const total = carouselItems.length;
    const maxDots = 12;
    if (total <= maxDots) {
      return Array.from({ length: total }, (_, i) => i);
    }
    const half = Math.floor(maxDots / 2);
    let start = Math.max(0, activeIndex - half);
    if (start + maxDots > total) start = total - maxDots;
    return Array.from({ length: maxDots }, (_, i) => start + i);
  }, [carouselItems.length, activeIndex]);

  return (
    <div className="console-shell" role="application" aria-label="Modo Consola EmulaMadro">
      {/* Inputs ocultos conectados a la lógica existente de App.jsx */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept=".nes,.smc,.sfc,.gba,.gb,.gbc,.gen,.md,.zip"
        style={{ display: 'none' }}
        onChange={handleCloudUpload}
        disabled={Boolean(uploadProgress)}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const target = coverTargetRomRef.current;
          if (target) handleCoverUpload(e, target);
        }}
      />

      {/* Fondo dinámico con carátula muy desenfocada y transición crossfade */}
      <div className="console-backdrop" aria-hidden="true">
        <div
          className={`console-backdrop-layer ${bgLayers.activeSlot === 'front' && bgLayers.front ? 'visible' : ''}`}
          style={bgLayers.front ? { backgroundImage: `url("${bgLayers.front}")` } : undefined}
        />
        <div
          className={`console-backdrop-layer ${bgLayers.activeSlot === 'back' && bgLayers.back ? 'visible' : ''}`}
          style={bgLayers.back ? { backgroundImage: `url("${bgLayers.back}")` } : undefined}
        />
        <div className="console-backdrop-vignette" />
        <div className="console-arcade-ambient" />
      </div>

      {/* Pantalla inicial opcional "Press Start" */}
      {showPressStart ? (
        <div
          className="console-press-start"
          onClick={() => actionsRef.current.dismissPressStart()}
          role="button"
          tabIndex={0}
        >
          <img src="/logo.webp" alt="EmulaMadro" className="console-splash-logo" />
          <p className="console-splash-sub">BIBLIOTECA RETRO EN LA NUBE</p>
          <div className="console-press-start-cta">PRESS START</div>
          <span className="console-splash-hint">Presiona A, Start o Enter para entrar</span>
        </div>
      ) : (
        <>
          {/* Barra superior fija y delgada */}
          <header className="console-topbar">
            <div className="console-topbar-left">
              <img src="/logo.webp" alt="EmulaMadro" className="console-topbar-logo" />
              <span className="console-topbar-mode-tag">
                <Gamepad2 size={14} /> MODO MANDO
              </span>
            </div>

            <nav className="console-topbar-filters" aria-label="Filtrar por sistema">
              <span className="console-shoulder-hint" aria-hidden="true">L1</span>
              {filterTabs.map((tab, idx) => {
                const isSelected = activeFilter === tab.id;
                const isFocused = inTopBar && topBarIndex === idx;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`console-filter-pill ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                    onClick={() => {
                      setInTopBar(false);
                      selectFilter(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
              <span className="console-shoulder-hint" aria-hidden="true">R1</span>
            </nav>

            <div className="console-topbar-right">
              {(() => {
                const muteFocused = inTopBar && topBarItems[topBarIndex]?.type === 'mute';
                const uploadFocused = inTopBar && topBarItems[topBarIndex]?.type === 'upload';
                return (
                  <>
                    <button
                      type="button"
                      className={`console-mute-btn ${muteFocused ? 'focused' : ''}`}
                      onClick={toggleMute}
                      title={muted ? 'Activar sonidos retro' : 'Silenciar sonidos retro'}
                      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                    >
                      {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                    <button
                      type="button"
                      className={`console-upload-top-btn ${uploadFocused ? 'focused' : ''}`}
                      onClick={() => {
                        consoleSfx.select(muted);
                        uploadInputRef.current?.click();
                      }}
                      disabled={Boolean(uploadProgress)}
                    >
                      {uploadProgress ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>
                            Subiendo ({uploadProgress.current}/{uploadProgress.total})
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Subir juegos a la nube</span>
                        </>
                      )}
                    </button>
                  </>
                );
              })()}
            </div>
          </header>

          {/* Escenario principal del Carrusel Horizontal Coverflow */}
          <main className="console-stage">
            {loadingRoms && cloudRoms.length === 0 ? (
              <div className="console-loading-box">
                <Loader2 size={42} className="animate-spin" color="#22d3ee" />
                <span>Cargando biblioteca de juegos...</span>
              </div>
            ) : (
              <>
                <div className="cf-track" aria-live="polite">
                  {visibleWindow.map(({ item, index, offset }) => {
                    const isFocusedCard = offset === 0 && !inTopBar;
                    const absOffset = Math.abs(offset);
                    const isItemDownloading = !item.isUploadCard && downloadingRom === item.name;

                    return (
                      <button
                        key={item.id || item.name}
                        type="button"
                        className={`cf-card cf-offset-${offset} ${item.isUploadCard ? 'cf-card-upload' : ''} ${
                          isFocusedCard ? 'is-center' : ''
                        } ${offset === 0 && inTopBar ? 'is-center-dimmed' : ''}`}
                        style={{
                          zIndex: 10 - absOffset,
                        }}
                        onClick={() => {
                          setInTopBar(false);
                          if (index !== activeIndex) {
                            setActiveIndex(index);
                            consoleSfx.move(muted);
                          } else {
                            triggerConfirmSelected();
                          }
                        }}
                        aria-label={
                          item.isUploadCard ? 'Subir juego a la nube' : formatGameTitle(item.name)
                        }
                      >
                        {item.isUploadCard ? (
                          <div className="cf-upload-inner">
                            <div className="cf-upload-icon-ring">
                              <CloudUpload size={44} />
                            </div>
                            <span className="cf-upload-label">+ Subir juego</span>
                            <span className="cf-upload-sub">Añadir ROM a la nube</span>
                          </div>
                        ) : (
                          <div className="cf-art-frame">
                            <CoverflowArt
                              romName={item.name}
                              getCoverCandidates={getCoverCandidates}
                              onResolved={handleCoverResolved}
                            />
                            {isItemDownloading && (
                              <div className="cf-downloading-overlay">
                                <Loader2 size={34} className="animate-spin" />
                                <span>Cargando...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Título y badge del sistema debajo de la tarjeta central */}
                <div key={activeItem?.id || activeItem?.name} className="console-meta-panel">
                  <h1 className="console-game-title">
                    {activeItem?.isUploadCard
                      ? 'Añadir Nuevo Juego'
                      : formatGameTitle(activeItem?.name || '')}
                  </h1>
                  <div className="console-meta-badges">
                    {activeItem?.isUploadCard ? (
                      <span className="console-system-badge upload">NUBE SUPABASE</span>
                    ) : (
                      <span className="console-system-badge">
                        {getCoreBadge(detectCore(activeItem?.name || '')) || 'RETRO'}
                      </span>
                    )}
                    {!activeItem?.isUploadCard && filteredRoms.length === 0 && (
                      <span className="console-empty-hint">Sin juegos en este filtro</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>

          {/* Barra inferior con ayuda de controles + contador "3 / 12" y puntos indicadores */}
          <footer className="console-bottom-bar">
            <div className="console-controls-help">
              <span>
                <strong>D-Pad</strong> mover
              </span>
              <span>
                <strong>A</strong> {activeItem?.isUploadCard ? 'subir' : 'jugar'}
              </span>
              {!activeItem?.isUploadCard && !inTopBar && (
                <>
                  <span>
                    <strong>X</strong> carátula
                  </span>
                  <span>
                    <strong>Y</strong> eliminar
                  </span>
                </>
              )}
              <span>
                <strong>L1/R1</strong> cambiar sistema
              </span>
              <span>
                <strong>↑</strong> barra superior
              </span>
            </div>

            <div className="console-pagination">
              <span className="console-counter">
                {activeIndex + 1} / {carouselItems.length}
              </span>
              <div className="console-dots" aria-hidden="true">
                {indicatorDots.map((dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`console-dot ${dotIdx === activeIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
