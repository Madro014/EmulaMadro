import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from './supabaseClient';

// Configuración de red WebRTC idéntica a la filosofía de Tenkaichi3Decomp:
// STUN (Cloudflare + Google) para NAT traversal directo, más TURN relay para conexiones estrictas sin apertura de puertos.
const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: [
          'stun:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
  }
};

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
  const [ping, setPing] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  
  const connectionRef = useRef(null);
  const mediaConnectionRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Iniciar medición periódica de latencia (RTT / Ping en ms estilo Tenkaichi3)
  const startPingMonitoring = (conn) => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = setInterval(() => {
      if (conn && conn.open) {
        conn.send({ type: 'ping', t: Date.now() });
      }
    }, 2000);
  };

  const stopPingMonitoring = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setPing(null);
  };

  const addChatMessage = (msg) => {
    setChatMessages(prev => [...prev.slice(-20), msg]);
  };

  const sendChatMessage = (text) => {
    if (!text || !text.trim() || !connectionRef.current) return;
    const msg = {
      id: Date.now() + Math.random(),
      sender: multiplayerState.mode === 'host' ? 'Host' : 'Invitado',
      text: text.trim(),
      timestamp: Date.now()
    };
    try {
      connectionRef.current.send({ type: 'chat', ...msg });
      addChatMessage(msg);
    } catch (e) {
      console.error('[Multiplayer] Error enviando mensaje de chat:', e);
    }
  };

  useEffect(() => {
    return () => {
      stopPingMonitoring();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Host: Crear sala y esperar invitados
  const hostRoom = async (roomData) => {
    console.log('[Host] Creando sala con STUN/TURN...', roomData);
    setMultiplayerState({ mode: 'host', roomId: roomData.id, status: 'connecting', errorMsg: '' });
    
    const newPeer = new Peer(PEER_CONFIG);
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
      addChatMessage({
        id: Date.now(),
        sender: 'Sistema',
        text: `Sala [${roomData.id}] creada. Esperando al rival...`,
        isSystem: true
      });
    });

    // Cuando el invitado se conecta
    newPeer.on('connection', (conn) => {
      console.log('[Host] Conexión P2P entrante de:', conn.peer);
      connectionRef.current = conn;
      
      conn.on('data', (data) => {
        if (!data) return;
        if (data.type === 'input' && onGuestInputReceived) {
          onGuestInputReceived(data.action, data.isPressed);
        } else if (data.type === 'ping') {
          conn.send({ type: 'pong', t: data.t });
        } else if (data.type === 'pong') {
          setPing(Math.max(1, Date.now() - data.t));
        } else if (data.type === 'chat') {
          addChatMessage(data);
        }
      });
      
      conn.on('open', () => {
        console.log('[Host] Conexión P2P (Datos) abierta con éxito');
        setMultiplayerState(prev => ({ ...prev, status: 'connected' }));
        startPingMonitoring(conn);
        addChatMessage({
          id: Date.now(),
          sender: 'Sistema',
          text: '¡Rival conectado! Conexión P2P establecida.',
          isSystem: true
        });
        
        // Transmitir video y audio
        setTimeout(() => {
          broadcastStream();
        }, 150);
      });
      
      conn.on('close', () => {
        stopPingMonitoring();
        addChatMessage({
          id: Date.now(),
          sender: 'Sistema',
          text: 'El rival se ha desconectado.',
          isSystem: true
        });
        setMultiplayerState(prev => ({ ...prev, status: 'waiting' }));
      });
    });

    newPeer.on('error', (err) => {
      console.error('[Host] PeerJS error:', err);
      setMultiplayerState(prev => ({ ...prev, status: 'error', errorMsg: 'Error P2P: ' + err.type }));
    });

    setPeer(newPeer);
  };

  // Host: Transmisión de stream con captura de canvas
  const broadcastStream = () => {
    if (!peerRef.current || !connectionRef.current) {
      return;
    }
    const canvas = emuWrapperRef.current?.querySelector('canvas');
    if (canvas) {
      try {
        console.log('[Host] Transmitiendo video a 60fps...');
        const stream = canvas.captureStream(60);
        if (mediaConnectionRef.current) mediaConnectionRef.current.close();
        const mediaCall = peerRef.current.call(connectionRef.current.peer, stream);
        mediaConnectionRef.current = mediaCall;
      } catch (e) {
        console.error("[Host] Error capturando stream del canvas:", e);
      }
    }
  };

  // Guest: Unirse a una sala usando el código
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
    
    const newPeer = new Peer(PEER_CONFIG);
    
    newPeer.on('open', (guestId) => {
      console.log('[Guest] Conectando hacia Host:', hostPeerId, 'desde:', guestId);
      
      const conn = newPeer.connect(hostPeerId, { reliable: true });
      connectionRef.current = conn;
      
      conn.on('open', () => {
        console.log('[Guest] ¡Conexión P2P establecida con el Host!');
        setMultiplayerState(prev => ({ ...prev, status: 'connected' }));
        startPingMonitoring(conn);
        addChatMessage({
          id: Date.now(),
          sender: 'Sistema',
          text: `Conectado a la sala [${roomData.id}]. ¡A jugar!`,
          isSystem: true
        });
      });

      conn.on('data', (data) => {
        if (!data) return;
        if (data.type === 'ping') {
          conn.send({ type: 'pong', t: data.t });
        } else if (data.type === 'pong') {
          setPing(Math.max(1, Date.now() - data.t));
        } else if (data.type === 'chat') {
          addChatMessage(data);
        }
      });
      
      conn.on('close', () => {
        stopPingMonitoring();
        addChatMessage({
          id: Date.now(),
          sender: 'Sistema',
          text: 'El anfitrión ha cerrado la sala.',
          isSystem: true
        });
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
      call.answer(); // Contestar sin stream de retorno
      call.on('stream', (stream) => {
        console.log('[Guest] Stream de video recibido.');
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
      connectionRef.current.send({ type: 'input', action, isPressed });
    }
  };

  const disconnect = async () => {
    stopPingMonitoring();
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
    ping,
    chatMessages,
    sendChatMessage,
    hostRoom,
    joinRoom,
    sendGuestInput,
    disconnect,
    broadcastStream
  };
}
