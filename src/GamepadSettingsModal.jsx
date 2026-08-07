import React from 'react';
import { X } from 'lucide-react';

function formatMappedButton(val) {
  if (val === undefined || val === null) return 'Sin Mapear';
  if (typeof val === 'string' && val.startsWith('key:')) {
    const rawKey = val.replace('key:', '');
    if (rawKey.startsWith('Key')) return `Tecla ${rawKey.replace('Key', '')}`;
    if (rawKey.startsWith('Digit')) return `Tecla ${rawKey.replace('Digit', '')}`;
    if (rawKey === 'ArrowUp') return 'Tecla 🠉 (Arriba)';
    if (rawKey === 'ArrowDown') return 'Tecla 🠋 (Abajo)';
    if (rawKey === 'ArrowLeft') return 'Tecla 🠈 (Izquierda)';
    if (rawKey === 'ArrowRight') return 'Tecla 🠊 (Derecha)';
    if (rawKey === 'Space') return 'Tecla Espacio';
    if (rawKey === 'Enter') return 'Tecla Enter';
    if (rawKey === 'ShiftLeft' || rawKey === 'ShiftRight') return 'Tecla Shift';
    return `Tecla ${rawKey}`;
  }
  if (typeof val === 'string' && val.startsWith('a')) {
    return `Eje ${val}`;
  }
  return `Botón ${val}`;
}

export default function GamepadSettingsModal({
  showSettings,
  closeSettings,
  useJoystickAsDpad,
  setUseJoystickAsDpad,
  currentCoreActions,
  listeningAction,
  setListeningAction,
  mapping,
  activeDebugButtons,
  playerRole,
  setPlayerRole,
  editingPlayerTab,
  setEditingPlayerTab,
  connectedGamepadCount,
  playMode,
  setPlayMode
}) {
  if (!showSettings) return null;

  const getP1Device = () => {
    if (connectedGamepadCount >= 2) return 'Mando Físico (Mando 0)';
    if (connectedGamepadCount === 1 && playerRole === 1 && playMode === 'online') return 'Mando Físico (Mando 0)';
    if (connectedGamepadCount === 1 && playMode === 'local') return 'Mando Físico (Mando 0)';
    return 'Teclado (Flechas / Z, X, Shift, Enter)';
  };

  const getP2Device = () => {
    if (connectedGamepadCount >= 2) return 'Mando Físico (Mando 1)';
    if (connectedGamepadCount === 1 && playerRole === 2 && playMode === 'online') return 'Mando Físico (Mando 0)';
    return 'Teclado (I, K, J, L / N, M, Tab, Espacio)';
  };

  const p1Device = getP1Device();
  const p2Device = getP2Device();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Configuración de Mando</h3>
          <button onClick={closeSettings} aria-label="Cerrar"><X size={20}/></button>
        </div>

        {/* --- APARTADO 1: MODO DE JUEGO (PREGUNTA INICIAL) --- */}
        <div className="settings-section">
          <span className="section-title">¿Cómo van a jugar?</span>
          <div className="playmode-selector">
            <button 
              className={`playmode-btn ${playMode === 'local' ? 'active' : ''}`}
              onClick={() => {
                setPlayMode('local');
                setEditingPlayerTab(1); // Default to player 1 tab
              }}
            >
              <strong>Misma PC (Local)</strong>
              <span>2 personas en esta PC</span>
            </button>
            <button 
              className={`playmode-btn ${playMode === 'online' ? 'active' : ''}`}
              onClick={() => {
                setPlayMode('online');
                setEditingPlayerTab(playerRole); // Sync tab with role
              }}
            >
              <strong>Multiconexión (Online)</strong>
              <span>Cada quien en su propia PC</span>
            </button>
          </div>
        </div>

        {/* --- APARTADO 2: ASIGNACIÓN DE DISPOSITIVOS --- */}
        <div className="settings-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
          <span className="section-title" style={{ marginBottom: '0.6rem', fontSize: '0.75rem' }}>Estado de Dispositivos:</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jugador 1:</span>
              <strong style={{ color: p1Device.startsWith('Teclado') ? '#3b82f6' : '#10b981' }}>
                {p1Device.startsWith('Teclado') ? '⌨️ ' : '🎮 '} {p1Device}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jugador 2:</span>
              <strong style={{ color: p2Device.startsWith('Teclado') ? '#3b82f6' : '#10b981' }}>
                {p2Device.startsWith('Teclado') ? '⌨️ ' : '🎮 '} {p2Device}
              </strong>
            </div>
          </div>
        </div>

        {/* --- APARTADO 3: CONFIGURACIÓN SEGÚN EL MODO DE JUEGO --- */}
        {playMode === 'online' ? (
          /* MODO MULTICONEXIÓN: Mostrar Mi Rol y mapear solo mi Rol */
          <>
            <div className="settings-section">
              <span className="section-title">Mi Rol en esta PC:</span>
              <div className="role-selector">
                <button 
                  className={`role-btn ${playerRole === 1 ? 'active' : ''}`}
                  onClick={() => setPlayerRole(1)}
                >
                  Soy Jugador 1 (Host)
                </button>
                <button 
                  className={`role-btn ${playerRole === 2 ? 'active' : ''}`}
                  onClick={() => setPlayerRole(2)}
                >
                  Soy Jugador 2 (Invitado)
                </button>
              </div>
            </div>

            <div className="settings-section">
              <span className="section-title" style={{ color: '#10b981' }}>
                📍 Mapeando tus controles como: <strong>Jugador {playerRole}</strong>
              </span>
            </div>
          </>
        ) : (
          /* MODO LOCAL: Mostrar pestañas de mapeo para ambos jugadores */
          <div className="settings-section">
            <span className="section-title">Mapear Controles para:</span>
            <div className="tab-container">
              <button 
                className={`tab-btn ${editingPlayerTab === 1 ? 'active' : ''}`}
                onClick={() => setEditingPlayerTab(1)}
              >
                Jugador 1
              </button>
              <button 
                className={`tab-btn ${editingPlayerTab === 2 ? 'active' : ''}`}
                onClick={() => setEditingPlayerTab(2)}
              >
                Jugador 2
              </button>
            </div>
          </div>
        )}

        {activeDebugButtons && (
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', color: '#10b981', fontSize: '0.9rem' }}>
            <span>Hardware detectando: </span>
            {activeDebugButtons.length > 0 ? (
              <strong>{activeDebugButtons.join(', ')}</strong>
            ) : (
              <span style={{ color: '#6b7280' }}>Nada presionado</span>
            )}
          </div>
        )}
        
        <div className="toggle-container" style={{ marginBottom: '1rem' }}>
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={useJoystickAsDpad} 
              onChange={(e) => setUseJoystickAsDpad(e.target.checked)}
            />
            Usar Joystick como flechas (D-Pad)
          </label>
        </div>

        <div className="mapping-grid">
          {currentCoreActions.map(action => (
            <div key={action} className="mapping-row">
              <span className="mapping-label">{action}</span>
              <button 
                className={`mapping-btn ${listeningAction === action ? 'listening' : ''}`}
                onClick={() => setListeningAction(action)}
              >
                {listeningAction === action ? 'Presiona Mando o Teclado...' : formatMappedButton(mapping[editingPlayerTab]?.[action])}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            className="role-btn active"
            style={{ padding: '0.8rem 2rem', width: '100%', fontSize: '0.95rem' }}
            onClick={closeSettings}
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
