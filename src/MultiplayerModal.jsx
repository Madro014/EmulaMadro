import React, { useState, useEffect } from 'react';
import { X, Copy, RefreshCw, Users } from 'lucide-react';
import { supabase } from './supabaseClient';

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

  // Refresh rooms on mount or tab change
  useEffect(() => {
    if (show && activeTab === 'ingresar') {
      refreshRooms();
    }
  }, [show, activeTab]);

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

  const handleCreateRoom = async () => {
    if (!createRoomName.trim()) {
      alert('Por favor, ingresa un nombre para la sala.');
      return;
    }
    
    // We will save this room to Supabase inside useMultiplayer.js once the PeerJS connection is ready,
    // so we just pass the info back up.
    onCreateRoom({
      id: generatedRoomId,
      name: createRoomName,
      password: createPassword
    });
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
  };

  const refreshRooms = async () => {
    setIsRefreshing(true);
    try {
      // Fetch rooms created in the last hour to prevent stale rooms
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rooms:', error);
        alert('Error al buscar salas.');
      } else {
        setAvailableRooms(data || []);
      }
    } catch (err) {
      console.error(err);
    }
    setIsRefreshing(false);
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
              <h3 style={{ margin: 0, color: 'white' }}>Salas Disponibles</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="settings-btn" 
                  onClick={async () => {
                    await supabase.from('rooms').delete().neq('id', 'dummy');
                    refreshRooms();
                  }}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', background: '#ef4444' }}
                >
                  Limpiar Fantasmas
                </button>
                <button 
                  className="settings-btn" 
                  onClick={refreshRooms}
                  disabled={isRefreshing}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={isRefreshing ? "spin" : ""} /> Refrescar
                </button>
              </div>
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
