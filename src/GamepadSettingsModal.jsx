import React, { useMemo } from 'react';
import { X, RotateCcw, Gamepad, Keyboard, Sparkles, Check, Info } from 'lucide-react';
import { getGameProfile, formatKeyDisplay, DEFAULT_GAMEPAD } from './gameControlsProfiles';

export default function GamepadSettingsModal({
  showSettings,
  closeSettings,
  useJoystickAsDpad,
  setUseJoystickAsDpad,
  currentCoreActions,
  listeningAction,
  setListeningAction,
  mapping,
  setMapping,
  activeDebugButtons,
  playerRole,
  setPlayerRole,
  editingPlayerTab,
  setEditingPlayerTab,
  connectedGamepadCount,
  multiplayerMode,
  romName,
  core
}) {
  if (!showSettings) return null;

  const gameProfile = useMemo(() => {
    return getGameProfile(romName || '', core || '');
  }, [romName, core]);

  const getP1Device = () => {
    if (connectedGamepadCount >= 2) return 'Mando Físico (Mando 0)';
    if (connectedGamepadCount === 1 && playerRole === 1 && multiplayerMode !== 'local') return 'Mando Físico (Mando 0)';
    if (connectedGamepadCount === 1 && multiplayerMode === 'local') return 'Mando Físico (Mando 0)';
    return 'Teclado (Flechas / Z, X, Shift, Enter)';
  };

  const getP2Device = () => {
    if (connectedGamepadCount >= 2) return 'Mando Físico (Mando 1)';
    if (connectedGamepadCount === 1 && playerRole === 2 && multiplayerMode !== 'local') return 'Mando Físico (Mando 0)';
    return 'Teclado (I, K, J, L / N, M, Tab, Espacio)';
  };

  const p1Device = getP1Device();
  const p2Device = getP2Device();

  const handleResetDefaults = () => {
    if (!window.confirm(`¿Deseas restablecer los controles del Jugador ${editingPlayerTab} a los valores predeterminados?`)) {
      return;
    }
    if (setMapping) {
      setMapping(prev => {
        const next = { ...prev };
        next[editingPlayerTab] = { ...DEFAULT_GAMEPAD };
        try {
          localStorage.setItem('emulamadro_mapping', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
    setListeningAction(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content controls-modal">
        {/* Cabecera del modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Gamepad size={22} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mapeo de Controles & Acciones</h3>
          </div>
          <button onClick={closeSettings} aria-label="Cerrar"><X size={20}/></button>
        </div>

        {/* Tarjeta de Juego Activo con Acciones Dinámicas */}
        <div className="game-detected-card">
          <div className="game-detected-header">
            <span className="game-detected-badge">
              <Sparkles size={14} /> Juego Activo Detectado
            </span>
            <span className="game-genre-badge">{gameProfile.genre}</span>
          </div>
          <h4 className="game-detected-title">{gameProfile.title}</h4>
          <p className="game-detected-desc">
            Las acciones mostradas a continuación representan lo que hace cada botón específicamente en este juego. Haz clic sobre cualquier tecla para remapearla a tu gusto.
          </p>
        </div>

        {/* Modo de juego y dispositivos */}
        <div className="settings-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid var(--card-border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Modo: </span>
              <strong>{multiplayerMode === 'local' ? '🏠 Local (2P en esta PC)' : multiplayerMode === 'host' ? '🌐 Online (Host / P1)' : '🌐 Online (Invitado / P2)'}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <span style={{ color: p1Device.startsWith('Teclado') ? '#60a5fa' : '#34d399' }}>
                P1: {p1Device.startsWith('Teclado') ? '⌨️ Teclado' : '🎮 Mando'}
              </span>
              <span style={{ color: p2Device.startsWith('Teclado') ? '#60a5fa' : '#34d399' }}>
                P2: {p2Device.startsWith('Teclado') ? '⌨️ Teclado' : '🎮 Mando'}
              </span>
            </div>
          </div>
        </div>

        {/* Pestañas de Jugador */}
        <div className="settings-section" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="section-title" style={{ margin: 0 }}>Configurar Jugador:</span>
            <button 
              className="reset-controls-btn"
              onClick={handleResetDefaults}
              title="Restablecer controles a valores de fábrica"
            >
              <RotateCcw size={13} /> Restablecer Teclas
            </button>
          </div>
          <div className="tab-container">
            <button 
              className={`tab-btn ${(multiplayerMode === 'local' ? editingPlayerTab === 1 : multiplayerMode === 'host') ? 'active' : ''}`}
              onClick={() => { if (multiplayerMode === 'local') setEditingPlayerTab(1); }}
              disabled={multiplayerMode === 'guest'}
              style={{ opacity: multiplayerMode === 'guest' ? 0.35 : 1 }}
            >
              Jugador 1 {playerRole === 1 && multiplayerMode !== 'local' ? '(Tú)' : ''}
            </button>
            <button 
              className={`tab-btn ${(multiplayerMode === 'local' ? editingPlayerTab === 2 : multiplayerMode === 'guest') ? 'active' : ''}`}
              onClick={() => { if (multiplayerMode === 'local') setEditingPlayerTab(2); }}
              disabled={multiplayerMode === 'host'}
              style={{ opacity: multiplayerMode === 'host' ? 0.35 : 1 }}
            >
              Jugador 2 {playerRole === 2 && multiplayerMode !== 'local' ? '(Tú)' : ''}
            </button>
          </div>
        </div>

        {/* Indicador de Hardware detectando */}
        {activeDebugButtons && activeDebugButtons.length > 0 && (
          <div className="debug-hardware-box">
            <span>Hardware detectando en vivo: </span>
            <strong>{activeDebugButtons.join(', ')}</strong>
          </div>
        )}

        {/* Toggle para usar Stick como D-Pad */}
        <div className="toggle-container" style={{ marginBottom: '1rem' }}>
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={useJoystickAsDpad} 
              onChange={(e) => setUseJoystickAsDpad(e.target.checked)}
            />
            <span>Usar Stick analógico del mando como flechas de movimiento</span>
          </label>
        </div>

        {/* Lista de Acciones y Mapeo Adaptativo */}
        <div className="custom-mapping-list">
          {currentCoreActions.map(action => {
            const actionInfo = gameProfile.actions?.[action] || {
              label: `Acción ${action}`,
              icon: '🎮',
              desc: `Botón original de consola ${action}`,
              hardware: `Botón ${action}`
            };

            const isListening = listeningAction === action;
            const keyInfo = formatKeyDisplay(action, editingPlayerTab, mapping, isListening, connectedGamepadCount);

            return (
              <div 
                key={action} 
                className={`action-mapping-card ${isListening ? 'listening' : ''}`}
                onClick={() => setListeningAction(action)}
              >
                {/* Lado izquierdo: Acción contextual real del juego */}
                <div className="action-meta">
                  <div className="action-icon-wrapper">
                    <span className="action-emoji">{actionInfo.icon}</span>
                  </div>
                  <div className="action-text-group">
                    <div className="action-title-row">
                      <strong className="action-name">{actionInfo.label}</strong>
                      <span className="action-hardware-chip">{actionInfo.hardware || action}</span>
                    </div>
                    {actionInfo.desc && (
                      <span className="action-desc">{actionInfo.desc}</span>
                    )}
                  </div>
                </div>

                {/* Lado derecho: Tecla o botón asignado actualmente */}
                <div className="action-bind-wrapper">
                  <button 
                    className={`key-badge-btn ${isListening ? 'active-listening' : keyInfo.isCustom ? 'custom' : 'default'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setListeningAction(isListening ? null : action);
                    }}
                    title="Haz clic para cambiar esta tecla"
                  >
                    {isListening ? (
                      <span className="listening-pulse">
                        ⚡ ¡Presiona una tecla o mando!
                      </span>
                    ) : (
                      <span className="key-display-text">
                        {keyInfo.text}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer del Modal */}
        <div style={{ marginTop: '1.4rem', textAlign: 'center' }}>
          <button 
            className="role-btn active"
            style={{ padding: '0.85rem 2rem', width: '100%', fontSize: '1rem', fontWeight: 'bold' }}
            onClick={closeSettings}
          >
            <Check size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            Guardar y Regresar al Juego
          </button>
        </div>
      </div>
    </div>
  );
}
