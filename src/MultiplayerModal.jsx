import React, { useState, useEffect } from 'react';
import { X, Copy, RefreshCw, Users } from 'lucide-react';

export default function MultiplayerModal({ show, onClose, onJoinRoom, onCreateRoom }) {
  const [activeTab, setActiveTab] = useState('ingresar');
  
  // Crear Sala State
  const [createRoomName, setCreateRoomName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [generatedRoomId, setGeneratedRoomId] = useState('');
  
  // Ingresar Sala State
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate ID when modal opens or tab changes to 'crear'
  useEffect(() => {
    if (show && activeTab === 'crear' && !generatedRoomId) {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      setGeneratedRoomId(`SALA-${id}`);
    }
  }, [show, activeTab, generatedRoomId]);

  if (!show) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedRoomId);
    alert('¡ID de la sala copiado al portapapeles!');
  };

  const handlePasswordChange = (e, setter) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, ''); // Solo alfanumérico
    if (val.length <= 6) {
      setter(val);
    }
  };

  const handleCreateRoom = () => {
    if (!createRoomName.trim()) {
      alert('Por favor, ingresa un nombre para la sala.');
      return;
    }
    onCreateRoom({
      id: generatedRoomId,
      name: createRoomName,
      password: createPassword
    });
    onClose();
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      alert('Por favor, ingresa el ID de la sala.');
      return;
    }
    onJoinRoom({
      id: joinRoomId,
      password: joinPassword
    });
    onClose();
  };

  const refreshRooms = () => {
    setIsRefreshing(true);
    // Mocking a network request for now
    setTimeout(() => {
      setAvailableRooms([
        { id: 'SALA-A1B2C3', name: 'Sala de Mario', hasPassword: true },
        { id: 'SALA-Z9Y8X7', name: 'Torneo Mortal Kombat', hasPassword: false },
        { id: 'SALA-QWE456', name: 'Zelda Coop', hasPassword: true }
      ]);
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content multiplayer-modal">
        <div className="modal-header">
          <h3><Users size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Multijugador Online</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20}/></button>
        </div>

        <div className="tab-container" style={{ margin: '1rem 0' }}>
          <button 
            className={`tab-btn ${activeTab === 'ingresar' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingresar')}
          >
            Ingresar a Sala
          </button>
          <button 
            className={`tab-btn ${activeTab === 'crear' ? 'active' : ''}`}
            onClick={() => setActiveTab('crear')}
          >
            Crear Sala
          </button>
        </div>

        {activeTab === 'crear' && (
          <div className="settings-section">
            <span className="section-title">Configuración de la Nueva Sala</span>
            
            <div className="input-group">
              <label>Nombre de la Sala</label>
              <input 
                type="text" 
                placeholder="Ej. Mi Sala Retro" 
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>ID de la Sala (Comparte esto con tu amigo)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={generatedRoomId} 
                  readOnly 
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', textAlign: 'center' }}
                />
                <button onClick={handleCopyId} className="icon-btn" title="Copiar ID" style={{ padding: '0 1rem', background: 'var(--card-bg)' }}>
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Contraseña (Opcional, máx 6 caracteres alfanuméricos)</label>
              <input 
                type="password" 
                placeholder="Ej. PASS12" 
                value={createPassword}
                onChange={(e) => handlePasswordChange(e, setCreatePassword)}
              />
              <span className="input-hint">{createPassword.length}/6 caracteres</span>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="role-btn active" style={{ width: '100%', background: '#10b981' }} onClick={handleCreateRoom}>
                Crear Sala y Esperar Jugador
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ingresar' && (
          <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="section-title" style={{ margin: 0 }}>Salas Disponibles</span>
              <button onClick={refreshRooms} className="icon-btn" disabled={isRefreshing} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} /> {isRefreshing ? 'Buscando...' : 'Refrescar'}
              </button>
            </div>

            <div className="room-list">
              {availableRooms.length === 0 ? (
                <div className="empty-state">No hay salas disponibles. Haz clic en Refrescar.</div>
              ) : (
                availableRooms.map(room => (
                  <div key={room.id} className="room-card" onClick={() => setJoinRoomId(room.id)}>
                    <div className="room-info">
                      <strong className="room-name">{room.name}</strong>
                      <span className="room-id">{room.id}</span>
                    </div>
                    {room.hasPassword && <span className="room-lock" title="Requiere contraseña">🔒</span>}
                  </div>
                ))
              )}
            </div>

            <span className="section-title" style={{ marginTop: '1.5rem' }}>Entrar a una Sala</span>
            <div className="input-group">
              <label>ID de la Sala</label>
              <input 
                type="text" 
                placeholder="Ej. SALA-X7K9" 
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
              />
            </div>
            
            <div className="input-group">
              <label>Contraseña (Si la sala la requiere)</label>
              <input 
                type="password" 
                placeholder="******" 
                value={joinPassword}
                onChange={(e) => handlePasswordChange(e, setJoinPassword)}
              />
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="role-btn active" style={{ width: '100%', background: '#3b82f6' }} onClick={handleJoinRoom}>
                Ingresar a la Sala
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
