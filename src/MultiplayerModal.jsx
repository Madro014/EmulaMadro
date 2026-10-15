import React, { useState, useEffect } from 'react';
import { X, Copy, RefreshCw, Users, Check, Globe, ShieldCheck } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function MultiplayerModal({ show, onClose, onJoinRoom, onCreateRoom }) {
  const [activeTab, setActiveTab] = useState('ingresar');
  
  // Crear Sala State
  const [createRoomName, setCreateRoomName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [generatedRoomId, setGeneratedRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Ingresar Sala State
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generar código de sala de 6 caracteres (estilo Tenkaichi3)
  useEffect(() => {
    if (show && activeTab === 'crear' && !generatedRoomId) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setGeneratedRoomId(result);
    }
  }, [show, activeTab, generatedRoomId]);

  useEffect(() => {
    if (show && activeTab === 'ingresar') {
      refreshRooms();
    }
  }, [show, activeTab]);

  if (!show) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePasswordChange = (e, setter) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    if (val.length <= 6) {
      setter(val);
    }
  };

  const handleCreateRoom = async () => {
    const roomName = createRoomName.trim() || `Sala ${generatedRoomId}`;
    onCreateRoom({
      id: generatedRoomId,
      name: roomName,
      password: createPassword
    });
    onClose();
  };

  const handleJoinRoom = () => {
    const code = joinRoomId.trim().toUpperCase();
    if (!code) {
      alert('Por favor, ingresa el código de la sala.');
      return;
    }
    onJoinRoom({
      id: code,
      password: joinPassword
    });
    onClose();
  };

  const refreshRooms = async () => {
    setIsRefreshing(true);
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rooms:', error);
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
          <h3>
            <Users size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            Netplay P2P (Estilo Tenkaichi 3)
          </h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20}/></button>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          fontSize: '0.8rem',
          color: '#93c5fd',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.8rem'
        }}>
          <ShieldCheck size={18} color="#60a5fa" />
          <span>Conexión directa P2P con relay STUN/TURN. Sin abrir puertos.</span>
        </div>

        <div className="tab-container" style={{ margin: '1rem 0' }}>
          <button 
            className={`tab-btn ${activeTab === 'ingresar' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingresar')}
          >
            Unirse con Código
          </button>
          <button 
            className={`tab-btn ${activeTab === 'crear' ? 'active' : ''}`}
            onClick={() => setActiveTab('crear')}
          >
            Crear Sala (Host)
          </button>
        </div>

        {activeTab === 'crear' && (
          <div className="settings-section">
            <span className="section-title">Código de tu Sala</span>
            
            <div className="input-group">
              <label>Comparte este código de 6 caracteres con tu rival:</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={generatedRoomId} 
                  readOnly 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(0,0,0,0.4)', 
                    color: '#34d399', 
                    fontWeight: '800', 
                    fontFamily: 'monospace', 
                    fontSize: '1.4rem',
                    letterSpacing: '4px', 
                    textAlign: 'center',
                    border: '1px solid #10b981'
                  }}
                />
                <button 
                  onClick={handleCopyId} 
                  className="icon-btn" 
                  title="Copiar código" 
                  style={{ 
                    padding: '0.7rem 1rem', 
                    background: copied ? '#10b981' : 'var(--card-bg)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Nombre de la Partida (Opcional)</label>
              <input 
                type="text" 
                placeholder={`Sala ${generatedRoomId}`} 
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Contraseña (Opcional, máx 6 caracteres)</label>
              <input 
                type="password" 
                placeholder="Sin contraseña" 
                value={createPassword}
                onChange={(e) => handlePasswordChange(e, setCreatePassword)}
              />
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button 
                className="role-btn active" 
                style={{ width: '100%', background: '#10b981', padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }} 
                onClick={handleCreateRoom}
              >
                🎮 Abrir Sala y Esperar Rival
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ingresar' && (
          <div className="settings-section">
            <span className="section-title">Ingresar Código de Sala</span>
            
            <div className="input-group">
              <label>Código del Host (6 caracteres):</label>
              <input 
                type="text" 
                placeholder="Ej. K7P9Q2" 
                value={joinRoomId}
                maxLength={10}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1.3rem', 
                  letterSpacing: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  borderColor: '#3b82f6'
                }}
              />
            </div>
            
            <div className="input-group">
              <label>Contraseña (Solo si el host configuró una):</label>
              <input 
                type="password" 
                placeholder="******" 
                value={joinPassword}
                onChange={(e) => handlePasswordChange(e, setJoinPassword)}
              />
            </div>

            <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
              <button 
                className="role-btn active" 
                style={{ width: '100%', background: '#3b82f6', padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }} 
                onClick={handleJoinRoom}
              >
                ⚡ Conectar con el Host
              </button>
            </div>

            {/* Explorador de salas públicas disponibles */}
            <div style={{ marginTop: '1.8rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>O selecciona una sala activa:</span>
                <button 
                  className="settings-btn" 
                  onClick={refreshRooms}
                  disabled={isRefreshing}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  <RefreshCw size={12} className={isRefreshing ? "spin" : ""} /> Refrescar
                </button>
              </div>

              <div className="room-list">
                {availableRooms.length === 0 ? (
                  <div className="empty-state">No hay salas públicas visibles.</div>
                ) : (
                  availableRooms.map(room => (
                    <div 
                      key={room.id} 
                      className="room-card" 
                      onClick={() => setJoinRoomId(room.id)}
                      style={{ border: joinRoomId === room.id ? '1px solid #3b82f6' : undefined }}
                    >
                      <div className="room-info">
                        <strong className="room-name">{room.name}</strong>
                        <span className="room-id" style={{ color: '#34d399' }}>{room.id}</span>
                      </div>
                      {room.has_password && <span className="room-lock" title="Requiere contraseña">🔒</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
