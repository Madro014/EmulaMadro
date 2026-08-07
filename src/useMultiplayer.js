import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from './supabaseClient';

export function useMultiplayer({ emuWrapperRef, onGuestInputReceived }) {
  const [peer, setPeer] = useState(null);
  const peerRef = useRef(null);
  const [multiplayerState, setMultiplayerState] = useState({
    mode: 'local', // 'local', 'host', 'guest'
    roomId: null,
    status: 'disconnected', // 'connecting', 'waiting', 'connected', 'error'
    errorMsg: ''
  });
  const [remoteStream, setRemoteStream] = useState(null);
  const connectionRef = useRef(null);
  const mediaConnectionRef = useRef(null);

  // Limpiar salas huérfanas al cargar (opcional)
  useEffect(() => {
    return () => {
      // Solo destruimos el peer si realmente estamos desmontando.
      // Ya quitamos StrictMode así que esto debería ejecutarse solo al desmontar.
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Host: Crear sala y esperar invitados
  const hostRoom = async (roomData) => {
    console.log('[Host] Creando sala...', roomData);
    setMultiplayerState({ mode: 'host', roomId: roomData.id, status: 'connecting', errorMsg: '' });
    
    // Configurar PeerJS para forzar modo debug
    const newPeer = new Peer({ debug: 2 });
    peerRef.current = newPeer;
    
    newPeer.on('open', async (peerId) => {
      console.log('[Host] Peer abierto con ID:', peerId);
      // Guardar sala en Supabase
      const { error } = await supabase.from('rooms').insert([{
        id: roomData.id,
        name: roomData.name,
        has_password: !!roomData.password,
        password: roomData.password || null,
        host_peer_id: peerId
      }]);
      
      if (error) {
        console.error('[Host] Error en Supabase:', error);
        setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Error guardando sala en BDD' }));
        return;
      }
      
      console.log('[Host] Sala guardada en Supabase correctamente');
      setMultiplayerState(prev => ({ ...prev, status: 'waiting' }));
    });

    // Cuando el invitado se conecta
    newPeer.on('connection', (conn) => {
      console.log('[Host] Alguien se está intentando conectar', conn.peer);
      connectionRef.current = conn;
      
      conn.on('data', (data) => {
        if (data.type === 'input' && onGuestInputReceived) {
          onGuestInputReceived(data.action, data.isPressed);
        }
      });
      
      conn.on('open', () => {
        console.log('[Host] Conexión P2P (Datos) abierta con éxito');
        alert('¡Un jugador se ha conectado a la sala!');
        setMultiplayerState(prev => ({ ...prev, status: 'connected' }));
        
        // Timeout para asegurar que state actualiza si broadcastStream revisa algo
        setTimeout(() => {
          const canvas = emuWrapperRef.current?.querySelector('canvas');
          if (canvas) {
            try {
              console.log('[Host] Iniciando captura de Stream...');
              const stream = canvas.captureStream(60); 
              if (mediaConnectionRef.current) mediaConnectionRef.current.close();
              const mediaCall = newPeer.call(conn.peer, stream);
              mediaConnectionRef.current = mediaCall;
              console.log('[Host] Stream enviado al peer:', conn.peer);
            } catch (e) {
              console.error("[Host] No se pudo capturar el stream del canvas", e);
            }
          } else {
            console.log('[Host] No se encontró el Canvas para grabar el video aún.');
          }
        }, 100);
      });
      
      conn.on('close', () => {
        alert('El jugador invitado se ha desconectado.');
        setMultiplayerState(prev => ({ ...prev, status: 'waiting' }));
      });
    });

    newPeer.on('error', (err) => {
      console.error('[Host] PeerJS error:', err);
      setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Error en la conexión P2P: ' + err.type }));
    });

    setPeer(newPeer);
  };

  // Host: Función para iniciar o reiniciar el envío de video manualmente
  const broadcastStream = () => {
    if (!peerRef.current || !connectionRef.current) {
      console.log('[Host] broadcastStream abortado: peer o connection nulos.', { peer: !!peerRef.current, conn: !!connectionRef.current });
      return;
    }
    const canvas = emuWrapperRef.current?.querySelector('canvas');
    if (canvas) {
      try {
        console.log('[Host] Iniciando captura de Stream (manual)...');
        const stream = canvas.captureStream(60); 
        if (mediaConnectionRef.current) mediaConnectionRef.current.close();
        const mediaCall = peerRef.current.call(connectionRef.current.peer, stream);
        mediaConnectionRef.current = mediaCall;
        console.log('[Host] Stream enviado al peer:', connectionRef.current.peer);
      } catch (e) {
        console.error("[Host] No se pudo capturar el stream del canvas", e);
      }
    } else {
      console.log('[Host] No se encontró el Canvas para grabar el video aún.');
    }
  };

  // Guest: Unirse a una sala
  const joinRoom = async (roomData) => {
    console.log('[Guest] Intentando unirse a:', roomData.id);
    setMultiplayerState({ mode: 'guest', roomId: roomData.id, status: 'connecting', errorMsg: '' });
    
    // Buscar la sala en Supabase
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomData.id)
      .single();
      
    if (error || !data) {
      console.error('[Guest] Supabase Error:', error);
      setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Sala no encontrada o expirada' }));
      return;
    }
    
    if (data.has_password && data.password !== roomData.password) {
      setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Contraseña incorrecta' }));
      return;
    }

    const hostPeerId = data.host_peer_id;
    console.log('[Guest] Host Peer ID encontrado:', hostPeerId);
    
    const newPeer = new Peer({ debug: 2 });
    
    newPeer.on('open', (guestId) => {
      console.log('[Guest] Mi Peer ID local es:', guestId);
      console.log('[Guest] Conectando hacia:', hostPeerId);
      
      const conn = newPeer.connect(hostPeerId, { reliable: true });
      connectionRef.current = conn;
      
      conn.on('open', () => {
        console.log('[Guest] ¡Conexión P2P (Datos) establecida con el Host!');
        alert('¡Estás conectado a la sala!');
        setMultiplayerState(prev => ({ ...prev, status: 'connected' }));
      });
      
      conn.on('close', () => {
        alert('El anfitrión cerró la sala.');
        setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'El host se desconectó' }));
        setRemoteStream(null);
      });
      
      conn.on('error', (err) => {
        console.error('[Guest] Connection error:', err);
      });
    });

    newPeer.on('call', (call) => {
      console.log('[Guest] Recibiendo llamada de media del Host...');
      mediaConnectionRef.current = call;
      call.answer(); // Contestar sin enviar stream de vuelta
      call.on('stream', (stream) => {
        console.log('[Guest] ¡Stream de media (Video) recibido!');
        setRemoteStream(stream);
      });
    });

    newPeer.on('error', (err) => {
      console.error('[Guest] PeerJS error:', err);
      setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Error conectando al Host: ' + err.type }));
    });

    setPeer(newPeer);
  };

  const sendGuestInput = (action, isPressed) => {
    if (multiplayerState.mode === 'guest' && connectionRef.current) {
      console.log(`[Guest] Enviando input al Host: ${action} -> Presionado: ${isPressed}`);
      connectionRef.current.send({ type: 'input', action, isPressed });
    }
  };

  const disconnect = async () => {
    if (connectionRef.current) connectionRef.current.close();
    if (mediaConnectionRef.current) mediaConnectionRef.current.close();
    if (peer) peer.destroy();
    
    // Si somos el host, borramos la sala de Supabase
    if (multiplayerState.mode === 'host' && multiplayerState.roomId) {
      await supabase.from('rooms').delete().eq('id', multiplayerState.roomId);
    }
    
    setPeer(null);
    setRemoteStream(null);
    setMultiplayerState({ mode: 'local', roomId: null, status: 'disconnected', errorMsg: '' });
  };

  return {
    multiplayerState,
    remoteStream,
    hostRoom,
    joinRoom,
    sendGuestInput,
    disconnect,
    broadcastStream
  };
}
