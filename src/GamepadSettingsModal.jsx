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
  activeDebugButtons
}) {
  if (!showSettings) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Mapeo de Mando</h3>
          <button onClick={closeSettings} aria-label="Cerrar"><X size={20}/></button>
        </div>
        <p className="modal-desc">Haz clic en un botón y presiona la tecla de tu mando para asignarla. (El juego está pausado)</p>
        
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
            Usar Joystick como flechas
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
                {listeningAction === action ? 'Presiona botón...' : `Botón ${mapping[action]}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
