import React from 'react';
import { X } from 'lucide-react';

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
  setEditingPlayerTab
}) {
  if (!showSettings) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Configuración de Mando</h3>
          <button onClick={closeSettings} aria-label="Cerrar"><X size={20}/></button>
        </div>
        
        <p className="modal-desc">
          Configura los controles de juego y asigna los mandos físicos (el juego está pausado).
        </p>

        {/* --- APARTADO: MI ROL EN LA PC --- */}
        <div className="settings-section">
          <span className="section-title">Mi Rol en esta PC:</span>
          <div className="role-selector">
            <button 
              className={`role-btn ${playerRole === 1 ? 'active' : ''}`}
              onClick={() => setPlayerRole(1)}
            >
              Jugador 1 (Host / Mando 0)
            </button>
            <button 
              className={`role-btn ${playerRole === 2 ? 'active' : ''}`}
              onClick={() => setPlayerRole(2)}
            >
              Jugador 2 (Invitado / Mando 1)
            </button>
          </div>
        </div>

        {/* --- APARTADO: PESTAÑAS DE MAPEO --- */}
        <div className="settings-section">
          <span className="section-title">Mapear Controles para:</span>
          <div className="tab-container">
            <button 
              className={`tab-btn ${editingPlayerTab === 1 ? 'active' : ''}`}
              onClick={() => setEditingPlayerTab(1)}
            >
              Controles Jugador 1
            </button>
            <button 
              className={`tab-btn ${editingPlayerTab === 2 ? 'active' : ''}`}
              onClick={() => setEditingPlayerTab(2)}
            >
              Controles Jugador 2
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
        
        <div className="toggle-container">
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
                {listeningAction === action ? 'Presiona botón...' : `Botón ${mapping[editingPlayerTab]?.[action] ?? 'Sin Mapear'}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
