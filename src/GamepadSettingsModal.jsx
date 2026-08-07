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
  multiplayerMode
}) {
  if (!showSettings) return null;

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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Configuración de Mando</h3>
          <button onClick={closeSettings} aria-label="Cerrar"><X size={20}/></button>
        </div>

        {/* --- APARTADO 1: MODO DE JUEGO ACTUAL --- */}
        <div className="settings-section">
          <span className="section-title">Modo Actual:</span>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            {multiplayerMode === 'local' && <span>🏠 <strong>Local</strong> (2 personas en esta PC)</span>}
            {multiplayerMode === 'host' && <span>🌐 <strong>Online</strong> - Eres el Anfitrión (Jugador 1)</span>}
            {multiplayerMode === 'guest' && <span>🌐 <strong>Online</strong> - Eres el Invitado (Jugador 2)</span>}
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

        {/* --- APARTADO 3: PESTAÑAS DE MAPEO --- */}
        <div className="settings-section">
          <span className="section-title">Mapear Controles para:</span>
          <div className="tab-container">
            <button 
              className={`tab-btn ${(multiplayerMode === 'local' ? editingPlayerTab === 1 : multiplayerMode === 'host') ? 'active' : ''}`}
              onClick={() => { if (multiplayerMode === 'local') setEditingPlayerTab(1); }}
              disabled={multiplayerMode === 'guest'}
              style={{ opacity: multiplayerMode === 'guest' ? 0.3 : 1 }}
            >
              Jugador 1
            </button>
            <button 
              className={`tab-btn ${(multiplayerMode === 'local' ? editingPlayerTab === 2 : multiplayerMode === 'guest') ? 'active' : ''}`}
              onClick={() => { if (multiplayerMode === 'local') setEditingPlayerTab(2); }}
              disabled={multiplayerMode === 'host'}
              style={{ opacity: multiplayerMode === 'host' ? 0.3 : 1 }}
            >
              Jugador 2
            </button>
          </div>
        </div>

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
