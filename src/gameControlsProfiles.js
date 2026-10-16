// src/gameControlsProfiles.js
// Sistema inteligente de perfiles de controles adaptados según el juego activo.

export const DEFAULT_KEYBOARD_P1 = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  B: 'KeyZ',
  A: 'KeyX',
  Y: 'KeyA',
  X: 'KeyS',
  L: 'KeyQ',
  R: 'KeyW',
  START: 'Enter',
  SELECT: 'ShiftLeft'
};

export const DEFAULT_KEYBOARD_P2 = {
  UP: 'KeyI',
  DOWN: 'KeyK',
  LEFT: 'KeyJ',
  RIGHT: 'KeyL',
  B: 'KeyN',
  A: 'KeyM',
  Y: 'KeyG',
  X: 'KeyH',
  L: 'KeyU',
  R: 'KeyO',
  START: 'Space',
  SELECT: 'Tab'
};

export const DEFAULT_GAMEPAD = {
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  B: 0,
  A: 1,
  Y: 2,
  X: 3,
  L: 4,
  R: 5,
  SELECT: 8,
  START: 9
};

// Base de datos de juegos con descripciones y acciones contextuales reales
const GAME_PROFILES_DATABASE = [
  // Super Mario World & All-Stars (SNES)
  {
    pattern: /mario\s*world|all-stars|mario\s*all\s*stars/i,
    title: 'Super Mario World / All-Stars',
    genre: 'Plataformas & Aventura',
    actions: {
      UP: { label: 'Mirar Arriba / Subir Redes', icon: '⬆️', desc: 'Trepar rejas o mirar arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Entrar Tubería', icon: '⬇️', desc: 'Entrar a tuberías o esquivar', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar a la Izquierda', icon: '⬅️', desc: 'Moverse hacia la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar a la Derecha', icon: '➡️', desc: 'Moverse hacia la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Salto Giratorio (Spin Jump)', icon: '🔄', desc: 'Rebotar sobre púas y destruir bloques amarillos', hardware: 'Botón A' },
      B: { label: 'Saltar Normal / Aletear Yoshi', icon: '🦘', desc: 'Salto estándar de altura', hardware: 'Botón B' },
      Y: { label: 'Correr / Bola Fuego / Comer Yoshi', icon: '⚡', desc: 'Sprint rápido, lanzar fuego y lengua de Yoshi', hardware: 'Botón Y' },
      X: { label: 'Correr / Agarrar Caparazón', icon: '🏃', desc: 'Acelerar velocidad y sujetar objetos', hardware: 'Botón X' },
      L: { label: 'Mover Cámara Izquierda', icon: '👀', desc: 'Desplazar la vista panorámica', hardware: 'Gatillo L' },
      R: { label: 'Mover Cámara Derecha', icon: '👀', desc: 'Desplazar la vista panorámica', hardware: 'Gatillo R' },
      START: { label: 'Pausar Partida', icon: '⏸️', desc: 'Detener o reanudar el juego', hardware: 'Start' },
      SELECT: { label: 'Soltar Ítem de Reserva', icon: '📦', desc: 'Hacer caer el objeto guardado arriba', hardware: 'Select' }
    }
  },

  // Super Mario Bros. (NES)
  {
    pattern: /super\s*mario\s*bros(?!\s*3)|mario\s*bros(?!\s*3)/i,
    title: 'Super Mario Bros.',
    genre: 'Plataformas Clásico',
    actions: {
      UP: { label: 'Mirar Arriba / Trepar', icon: '⬆️', desc: 'Subir lianas trepadoras', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Entrar Tubería', icon: '⬇️', desc: 'Agacharse o descender a zonas secretas', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar a la Izquierda', icon: '⬅️', desc: 'Desplazarse a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar a la Derecha', icon: '➡️', desc: 'Avanzar a la meta', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar / Nadar', icon: '🦘', desc: 'Salto de altura o flotar en niveles de agua', hardware: 'Botón A' },
      B: { label: 'Correr / Bola de Fuego', icon: '⚡', desc: 'Acelerar velocidad máxima o disparar fuego', hardware: 'Botón B' },
      START: { label: 'Pausar Juego', icon: '⏸️', desc: 'Pausar o continuar', hardware: 'Start' },
      SELECT: { label: 'Elegir 1P / 2P', icon: '👥', desc: 'Seleccionar modo de un jugador o dos', hardware: 'Select' }
    }
  },

  // Super Mario Bros 3 (NES)
  {
    pattern: /mario\s*bros\.?\s*3|mario\s*3/i,
    title: 'Super Mario Bros. 3',
    genre: 'Plataformas & Aventura',
    actions: {
      UP: { label: 'Entrar Puerta / Trepar', icon: '⬆️', desc: 'Entrar por puertas o subir lianas', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Derrapar Pendiente', icon: '⬇️', desc: 'Agacharse o deslizarse colina abajo', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Avanzar a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Avanzar a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar / Aletear (Vuelo Cola)', icon: '🦘', desc: 'Saltar o planear con traje mapache', hardware: 'Botón A' },
      B: { label: 'Correr / Coletazo / Fuego', icon: '⚡', desc: 'Sprint medidor P, golpe de cola o fuego', hardware: 'Botón B' },
      START: { label: 'Pausar Juego', icon: '⏸️', desc: 'Pausar la acción', hardware: 'Start' },
      SELECT: { label: 'Abrir Caja de Ítems (Mapa)', icon: '🎒', desc: 'Usar objetos en el mapa del mundo', hardware: 'Select' }
    }
  },

  // Contra & Super C
  {
    pattern: /contra|super\s*c/i,
    title: 'Contra / Super C',
    genre: 'Run & Gun / Acción',
    actions: {
      UP: { label: 'Apuntar Arriba', icon: '⬆️', desc: 'Disparar verticalmente', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Acostarse', icon: '⬇️', desc: 'Tirarse al suelo para esquivar balas', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse a la Izquierda', icon: '⬅️', desc: 'Retroceder o apuntar izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse a la Derecha', icon: '➡️', desc: 'Avanzar disparando', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar (Voltereta)', icon: '🦘', desc: 'Salto acrobático giratorio', hardware: 'Botón A' },
      B: { label: 'Disparar Ráfaga de Arma', icon: '💥', desc: 'Disparo continuo con el arma equipada', hardware: 'Botón B' },
      START: { label: 'Iniciar / Pausar Misión', icon: '⏸️', desc: 'Pausar o reanudar el combate', hardware: 'Start' },
      SELECT: { label: 'Elegir 1P o 2P', icon: '👥', desc: 'Alternar modo cooperativo', hardware: 'Select' }
    }
  },

  // Pac-Man & Pac-Run
  {
    pattern: /pac-?man|pac-?run/i,
    title: 'Pac-Man',
    genre: 'Arcade / Laberinto',
    actions: {
      UP: { label: 'Subir (Girar Arriba)', icon: '⬆️', desc: 'Cambiar rumbo hacia arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Bajar (Girar Abajo)', icon: '⬇️', desc: 'Cambiar rumbo hacia abajo', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Girar a la Izquierda', icon: '⬅️', desc: 'Tomar pasillo izquierdo', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Girar a la Derecha', icon: '➡️', desc: 'Tomar pasillo derecho', hardware: 'D-Pad 🠊' },
      A: { label: 'Acelerar / Salto Especial', icon: '🟡', desc: 'Acción rápida en laberinto', hardware: 'Botón A' },
      B: { label: 'Giro Rápido / Freno', icon: '⚡', desc: 'Maniobra evasiva de fantasmas', hardware: 'Botón B' },
      START: { label: 'Pausar Laberinto', icon: '⏸️', desc: 'Detener la partida', hardware: 'Start' },
      SELECT: { label: 'Seleccionar Dificultad', icon: '⚙️', desc: 'Cambiar opciones', hardware: 'Select' }
    }
  },

  // Street Fighter & Fighting Games / Tenkaichi / Mortal Kombat
  {
    pattern: /street\s*fighter|mortal\s*kombat|tenkaichi|dragon\s*ball|tekken|fatal\s*fury|killer\s*instinct/i,
    title: 'Juego de Peleas / Combate',
    genre: 'Lucha / Fighting',
    actions: {
      UP: { label: 'Saltar / Salto en Diagonal', icon: '⬆️', desc: 'Salto ofensivo o evasivo', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Guardia Baja', icon: '⬇️', desc: 'Cubrirse de patadas bajas', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Retroceder / Bloquear (Guardia)', icon: '🛡️', desc: 'Defenderse de golpes', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Avanzar hacia el Rival', icon: '🥊', desc: 'Cerrar distancia', hardware: 'D-Pad 🠊' },
      Y: { label: 'Puño Débil (Jab)', icon: '👊', desc: 'Golpe de puño veloz e interrumpidor', hardware: 'Botón Y' },
      X: { label: 'Puño Fuerte / Smash', icon: '🥊', desc: 'Golpe demoledor de impacto', hardware: 'Botón X' },
      B: { label: 'Patada Débil (Short)', icon: '🦵', desc: 'Patada rápida de bajo alcance', hardware: 'Botón B' },
      A: { label: 'Patada Fuerte / Poder Especial', icon: '⚡', desc: 'Patada pesada o ataque Ki', hardware: 'Botón A' },
      L: { label: 'Puño Medio / Cargar Ki', icon: '🔥', desc: 'Golpe medio o recarga de energía', hardware: 'Gatillo L' },
      R: { label: 'Patada Media / Poder Proyectil', icon: '💥', desc: 'Ataque de media distancia o especial', hardware: 'Gatillo R' },
      START: { label: 'Pausar / Lista de Movimientos', icon: '⏸️', desc: 'Ver combos del luchador', hardware: 'Start' },
      SELECT: { label: 'Burla al Oponente', icon: '😏', desc: 'Provocar al rival', hardware: 'Select' }
    }
  },

  // Tiny Toon Adventures
  {
    pattern: /tiny\s*toon/i,
    title: 'Tiny Toon Adventures',
    genre: 'Plataformas',
    actions: {
      UP: { label: 'Mirar Arriba / Entrar Puerta', icon: '⬆️', desc: 'Acceder a puertas o mirar arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Deslizarse', icon: '⬇️', desc: 'Esquivar obstáculos', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar a la Izquierda', icon: '⬅️', desc: 'Moverse a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar a la Derecha', icon: '➡️', desc: 'Moverse a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar', icon: '🦘', desc: 'Salto elástico de conejo', hardware: 'Botón A' },
      B: { label: 'Embestir / Correr / Patada', icon: '⚡', desc: 'Habilidad de ataque del personaje', hardware: 'Botón B' },
      SELECT: { label: 'Cambiar Compañero (Relevar)', icon: '🔄', desc: 'Alternar entre Buster, Plucky, Dizzy o Furrball', hardware: 'Select' },
      START: { label: 'Pausar Juego', icon: '⏸️', desc: 'Pausa', hardware: 'Start' }
    }
  },

  // Sonic The Hedgehog
  {
    pattern: /sonic/i,
    title: 'Sonic The Hedgehog',
    genre: 'Plataformas de Alta Velocidad',
    actions: {
      UP: { label: 'Mirar Arriba', icon: '⬆️', desc: 'Ver la parte superior de la pantalla', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Cargar Spin Dash', icon: '🌀', desc: 'Mantén pulsado y presiona salto para girar', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Correr a la Izquierda', icon: '⬅️', desc: 'Acelerar a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Correr a la Derecha', icon: '➡️', desc: 'Acelerar a toda velocidad a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar / Bola Giratoria', icon: '🦘', desc: 'Salto esférico protector', hardware: 'Botón A' },
      B: { label: 'Saltar / Acelerar Giro', icon: '🌀', desc: 'Salto y propulsión', hardware: 'Botón B' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausar partida', hardware: 'Start' },
      SELECT: { label: 'Opciones', icon: '⚙️', desc: 'Configuración', hardware: 'Select' }
    }
  },

  // Teenage Mutant Ninja Turtles / Turtles in Time (SNES)
  {
    pattern: /turtles|tmnt|mutant\s*hero\s*turtles/i,
    title: 'TMNT IV: Turtles in Time',
    genre: "Beat 'em Up / Acción Ninja",
    actions: {
      UP: { label: 'Moverse Arriba', icon: '⬆️', desc: 'Moverse en el plano', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Moverse Abajo', icon: '⬇️', desc: 'Moverse en el plano', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse a la Izquierda', icon: '⬅️', desc: 'Doble tap para correr/embestir', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse a la Derecha', icon: '➡️', desc: 'Doble tap para correr/embestir', hardware: 'D-Pad 🠊' },
      Y: { label: 'Atacar con Arma Ninja', icon: '🗡️', desc: 'Combo con espada, nunchaku, sai o bastón bo', hardware: 'Botón Y' },
      B: { label: 'Saltar / Patada Voladora', icon: '🦘', desc: 'Salto ninja (presiona ataque para patada aérea)', hardware: 'Botón B' },
      A: { label: 'Ataque Especial 360°', icon: '⚡', desc: 'Ataque giratorio desesperado que limpia la zona', hardware: 'Botón A' },
      X: { label: 'Agarrar / Lanzar a Pantalla', icon: '💥', desc: 'Estampar soldados del Foot Clan', hardware: 'Botón X' },
      L: { label: 'Ataque Rápido', icon: '🥋', desc: 'Golpe alternativo', hardware: 'Gatillo L' },
      R: { label: 'Ataque Fuerte', icon: '🥋', desc: 'Golpe alternativo', hardware: 'Gatillo R' },
      START: { label: 'Pausar Partida', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Opciones / Vidas', icon: '⚙️', desc: 'Configurar vidas', hardware: 'Select' }
    }
  },

  // Pokemon (GBA / GBC)
  {
    pattern: /pokemon|pokémon/i,
    title: 'Pokémon',
    genre: 'RPG de Colección y Combate',
    actions: {
      UP: { label: 'Caminar Arriba', icon: '⬆️', desc: 'Moverse al norte', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Caminar Abajo', icon: '⬇️', desc: 'Moverse al sur', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar Izquierda', icon: '⬅️', desc: 'Moverse al oeste', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar Derecha', icon: '➡️', desc: 'Moverse al este', hardware: 'D-Pad 🠊' },
      A: { label: 'Interactuar / Hablar / Confirmar', icon: '💬', desc: 'Hablar con personas y elegir opciones', hardware: 'Botón A' },
      B: { label: 'Cancelar / Correr (Zapatillas)', icon: '🏃', desc: 'Volver atrás o correr rápido', hardware: 'Botón B' },
      START: { label: 'Menú Entrenador (Mochila / Pokédex)', icon: '🎒', desc: 'Abrir menú principal', hardware: 'Start' },
      SELECT: { label: 'Objeto Registrado (Bicicleta)', icon: '🚲', desc: 'Usar objeto rápido registrado', hardware: 'Select' },
      L: { label: 'Página Anterior (Mochila / Caja)', icon: '◀️', desc: 'Navegar menús', hardware: 'Gatillo L' },
      R: { label: 'Página Siguiente (Mochila / Caja)', icon: '▶️', desc: 'Navegar menús', hardware: 'Gatillo R' }
    }
  },

  // The Legend of Zelda
  {
    pattern: /zelda|minish\s*cap|link\s*to\s*the\s*past/i,
    title: 'The Legend of Zelda',
    genre: 'Aventura & Acción',
    actions: {
      UP: { label: 'Moverse Arriba', icon: '⬆️', desc: 'Caminar hacia arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Moverse Abajo', icon: '⬇️', desc: 'Caminar hacia abajo', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Caminar hacia la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Caminar hacia la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Espada / Ataque Giratorio', icon: '⚔️', desc: 'Atacar con la espada', hardware: 'Botón A' },
      B: { label: 'Objeto Secundario (Bomba / Arco)', icon: '🏹', desc: 'Usar objeto equipado', hardware: 'Botón B' },
      Y: { label: 'Objeto Rápido / Correr', icon: '🏃', desc: 'Botas pegaso o segundo objeto', hardware: 'Botón Y' },
      X: { label: 'Agarrar / Rodar / Interactuar', icon: '🛡️', desc: 'Levantar piedras o rodar', hardware: 'Botón X' },
      L: { label: 'Fijar Blanco / Ver Mapa', icon: '🗺️', desc: 'Orientación en mazmorra', hardware: 'Gatillo L' },
      R: { label: 'Protegerse con Escudo', icon: '🛡️', desc: 'Bloquear proyectiles', hardware: 'Gatillo R' },
      START: { label: 'Inventario de Objetos', icon: '🎒', desc: 'Elegir armas y equipo', hardware: 'Start' },
      SELECT: { label: 'Mapa General', icon: '🧭', desc: 'Ver mapa del reino', hardware: 'Select' }
    }
  },

  // Mega Man / Rockman
  {
    pattern: /mega\s*man|rockman/i,
    title: 'Mega Man',
    genre: 'Acción y Disparos',
    actions: {
      UP: { label: 'Subir Escalera', icon: '⬆️', desc: 'Trepar escaleras tubulares', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Bajar Escalera / Deslizarse', icon: '⬇️', desc: 'Descender o preparar slide', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Avanzar a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Avanzar a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar', icon: '🦘', desc: 'Salto de precisión', hardware: 'Botón A' },
      B: { label: 'Disparar (Mega Buster)', icon: '🔫', desc: 'Disparo estándar o disparo cargado', hardware: 'Botón B' },
      START: { label: 'Menú de Armas de Jefes', icon: '⚡', desc: 'Equipar poderes de Robot Masters', hardware: 'Start' },
      SELECT: { label: 'Pausar', icon: '⏸️', desc: 'Pausar el juego', hardware: 'Select' }
    }
  },

  // Castlevania
  {
    pattern: /castlevania/i,
    title: 'Castlevania',
    genre: 'Acción Gótica',
    actions: {
      UP: { label: 'Subir Escaleras / Usar Sub-Arma', icon: '⬆️', desc: 'Mantén Arriba + Ataque para sub-arma', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Bajar Escaleras', icon: '⬇️', desc: 'Agacharse para esquivar murciélagos', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar Izquierda', icon: '⬅️', desc: 'Retroceder', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar Derecha', icon: '➡️', desc: 'Avanzar en el castillo', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar', icon: '🦘', desc: 'Salto fijo de plataforma', hardware: 'Botón A' },
      B: { label: 'Látigo Sagrado (Vampire Killer)', icon: '🗡️', desc: 'Azote principal con el látigo', hardware: 'Botón B' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Opciones', icon: '⚙️', desc: 'Configurar', hardware: 'Select' }
    }
  },

  // Metroid / Super Metroid
  {
    pattern: /metroid/i,
    title: 'Metroid',
    genre: 'Metroidvania / Exploración',
    actions: {
      UP: { label: 'Apuntar al Techo', icon: '⬆️', desc: 'Disparo vertical', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Morfosfera / Agacharse', icon: '🔵', desc: 'Convertir a Samus en esfera rodante', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Correr a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Correr a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar / Salto Espacial', icon: '🦘', desc: 'Salto giratorio', hardware: 'Botón A' },
      B: { label: 'Disparar Cañón Láser', icon: '🔫', desc: 'Ráfaga de energía del brazo', hardware: 'Botón B' },
      X: { label: 'Colocar Bomba de Morfosfera', icon: '💣', desc: 'Explotar bloques rompibles', hardware: 'Botón X' },
      SELECT: { label: 'Seleccionar Misil / Super Misil', icon: '🚀', desc: 'Activar munición de puerta roja', hardware: 'Select' },
      START: { label: 'Ver Mapa de Zebes', icon: '🗺️', desc: 'Orientación geográfica', hardware: 'Start' }
    }
  },

  // Twin Dragons
  {
    pattern: /twin\s*dragons/i,
    title: 'Twin Dragons',
    genre: 'Plataformas Dragón',
    actions: {
      UP: { label: 'Mirar Arriba / Trepar', icon: '⬆️', desc: 'Subir plataformas', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse', icon: '⬇️', desc: 'Esquivar obstáculos', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Caminar hacia la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Caminar hacia la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar', icon: '🦘', desc: 'Salto de dragón', hardware: 'Botón A' },
      B: { label: 'Lanzar Fuego (Pimiento Ígneo)', icon: '🔥', desc: 'Disparo de bolas de fuego', hardware: 'Botón B' },
      SELECT: { label: 'Cambiar de Dragón', icon: '🔄', desc: 'Alternar entre Dinky y Minky', hardware: 'Select' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausa', hardware: 'Start' }
    }
  },

  // Flappy Bird
  {
    pattern: /flappy\s*bird/i,
    title: 'Flappy Bird',
    genre: 'Arcade / Habilidad',
    actions: {
      UP: { label: 'Subir', icon: '⬆️', desc: 'Aleteo', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Bajar', icon: '⬇️', desc: 'Caer', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Izquierda', icon: '⬅️', desc: 'Izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Derecha', icon: '➡️', desc: 'Derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Aletear (Salto de Vuelo)', icon: '🪽', desc: 'Batir alas para elevarse', hardware: 'Botón A' },
      B: { label: 'Aletear (Alternativo)', icon: '🪽', desc: 'Batir alas para elevarse', hardware: 'Botón B' },
      START: { label: 'Reiniciar / Pausar Partida', icon: '🔄', desc: 'Comenzar nuevo intento', hardware: 'Start' },
      SELECT: { label: 'Cambiar Pájaro', icon: '🐦', desc: 'Color del ave', hardware: 'Select' }
    }
  },

  // Space Invaders / Invaders
  {
    pattern: /invaders/i,
    title: 'Space Invaders',
    genre: 'Arcade / Shooter Espacial',
    actions: {
      LEFT: { label: 'Mover Cañón a la Izquierda', icon: '⬅️', desc: 'Esquivar bombas alienígenas', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Mover Cañón a la Derecha', icon: '➡️', desc: 'Alinear tiro hacia invasores', hardware: 'D-Pad 🠊' },
      UP: { label: 'Subir', icon: '⬆️', desc: 'Arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Abajo', icon: '⬇️', desc: 'Abajo', hardware: 'D-Pad 🠋' },
      A: { label: 'Disparar Misil Láser', icon: '🚀', desc: 'Lanzar proyectil antiaéreo', hardware: 'Botón A' },
      B: { label: 'Disparar Rápido', icon: '💥', desc: 'Fuego alternativo', hardware: 'Botón B' },
      START: { label: 'Iniciar Oleada / Pausa', icon: '⏸️', desc: 'Comenzar defensa de la Tierra', hardware: 'Start' },
      SELECT: { label: 'Modo 1P / 2P', icon: '👥', desc: 'Seleccionar jugadores', hardware: 'Select' }
    }
  },

  // Driar
  {
    pattern: /driar/i,
    title: 'Driar',
    genre: 'Plataformas & Puzzles',
    actions: {
      LEFT: { label: 'Caminar a la Izquierda', icon: '⬅️', desc: 'Moverse', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar a la Derecha', icon: '➡️', desc: 'Moverse', hardware: 'D-Pad 🠊' },
      UP: { label: 'Mirar Arriba', icon: '⬆️', desc: 'Inspeccionar', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse', icon: '⬇️', desc: 'Agacharse', hardware: 'D-Pad 🠋' },
      A: { label: 'Saltar', icon: '🦘', desc: 'Salto sobre plataformas', hardware: 'Botón A' },
      B: { label: 'Acción / Correr', icon: '⚡', desc: 'Interactuar con elementos', hardware: 'Botón B' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Reiniciar Nivel', icon: '🔄', desc: 'Reintentar puzzle', hardware: 'Select' }
    }
  },

  // Nova the Squirrel
  {
    pattern: /nova\s*the\s*squirrel|nova/i,
    title: 'Nova the Squirrel',
    genre: 'Plataformas Clásico',
    actions: {
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Caminar a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Caminar a la derecha', hardware: 'D-Pad 🠊' },
      UP: { label: 'Mirar Arriba / Entrar Puerta', icon: '⬆️', desc: 'Subir o acceder a puertas', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse', icon: '⬇️', desc: 'Esquivar proyectiles', hardware: 'D-Pad 🠋' },
      A: { label: 'Saltar / Aleteo de Ardilla', icon: '🦘', desc: 'Salto y planeo suave', hardware: 'Botón A' },
      B: { label: 'Lanzar Bellota / Habilidad Copia', icon: '🌰', desc: 'Atacar con el poder absorbido', hardware: 'Botón B' },
      SELECT: { label: 'Cambiar Habilidad Copiada', icon: '🔄', desc: 'Seleccionar poder de disfraz', hardware: 'Select' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausa', hardware: 'Start' }
    }
  },

  // Anguna
  {
    pattern: /anguna/i,
    title: 'Anguna: Warriors of Faith',
    genre: 'Action RPG / Aventura',
    actions: {
      UP: { label: 'Moverse al Norte', icon: '⬆️', desc: 'Avanzar arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Moverse al Sur', icon: '⬇️', desc: 'Avanzar abajo', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse al Oeste', icon: '⬅️', desc: 'Avanzar a la izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse al Este', icon: '➡️', desc: 'Avanzar a la derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Atacar con Espada', icon: '⚔️', desc: 'Blandir arma cuerpo a cuerpo', hardware: 'Botón A' },
      B: { label: 'Arco y Flechas / Magia', icon: '🏹', desc: 'Disparo a distancia', hardware: 'Botón B' },
      L: { label: 'Defender con Escudo', icon: '🛡️', desc: 'Bloquear ataques enemigos', hardware: 'Gatillo L' },
      R: { label: 'Correr / Sprint', icon: '🏃', desc: 'Acelerar paso', hardware: 'Gatillo R' },
      START: { label: 'Menú de Inventario y Equipo', icon: '🎒', desc: 'Ver llaves, pociones y mapa', hardware: 'Start' },
      SELECT: { label: 'Cambiar Objeto Rápido', icon: '🔄', desc: 'Alternar arma secundaria', hardware: 'Select' }
    }
  },

  // Another World (Out of this World)
  {
    pattern: /another\s*world|out\s*of\s*this\s*world/i,
    title: 'Another World',
    genre: 'Aventura Cinemática & Sci-Fi',
    actions: {
      UP: { label: 'Saltar hacia Arriba / Trepar', icon: '⬆️', desc: 'Alcanzar salientes superiores', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Gatear', icon: '⬇️', desc: 'Evitar disparos de alienígenas', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Caminar a la Izquierda', icon: '⬅️', desc: 'Moverse', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Caminar a la Derecha', icon: '➡️', desc: 'Moverse', hardware: 'D-Pad 🠊' },
      A: { label: 'Disparar Pistola Láser', icon: '🔫', desc: 'Tiro rápido de energía', hardware: 'Botón A' },
      B: { label: 'Crear Escudo de Fuerza / Super Rayo', icon: '🛡️', desc: 'Mantén pulsado para escudo o super disparo', hardware: 'Botón B' },
      START: { label: 'Pausar', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Ver Código de Nivel', icon: '🔢', desc: 'Contraseñas de fase', hardware: 'Select' }
    }
  },

  // Blast Arena Advance
  {
    pattern: /blast\s*arena/i,
    title: 'Blast Arena Advance',
    genre: 'Arena Shooter / Acción',
    actions: {
      UP: { label: 'Avanzar Nave', icon: '⬆️', desc: 'Propulsión hacia adelante', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Frenar / Marcha Atrás', icon: '⬇️', desc: 'Reducir velocidad', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Girar a la Izquierda', icon: '⬅️', desc: 'Virar nave', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Girar a la Derecha', icon: '➡️', desc: 'Virar nave', hardware: 'D-Pad 🠊' },
      A: { label: 'Disparo Láser Principal', icon: '💥', desc: 'Fuego frontal pesado', hardware: 'Botón A' },
      B: { label: 'Turbo / Propulsor de Escape', icon: '🚀', desc: 'Aceleración rápida', hardware: 'Botón B' },
      L: { label: 'Desplazamiento Lateral Izq (Strafe)', icon: '◀️', desc: 'Moverse de lado', hardware: 'Gatillo L' },
      R: { label: 'Desplazamiento Lateral Der (Strafe)', icon: '▶️', desc: 'Moverse de lado', hardware: 'Gatillo R' },
      START: { label: 'Pausar Arena', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Cambiar Modo de Disparo', icon: '🔄', desc: 'Alternar armas', hardware: 'Select' }
    }
  },

  // Astrohawk
  {
    pattern: /astrohawk/i,
    title: 'Astrohawk',
    genre: 'Space Shooter / Shmup',
    actions: {
      UP: { label: 'Subir Nave', icon: '⬆️', desc: 'Desplazarse arriba', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Bajar Nave', icon: '⬇️', desc: 'Desplazarse abajo', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Desplazarse izquierda', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Desplazarse derecha', hardware: 'D-Pad 🠊' },
      A: { label: 'Disparar Cañón Láser', icon: '🔫', desc: 'Fuego primario', hardware: 'Botón A' },
      B: { label: 'Bomba Espacial de Área', icon: '💣', desc: 'Limpiar enemigos en pantalla', hardware: 'Botón B' },
      START: { label: 'Pausa', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Modo Escudo', icon: '🛡️', desc: 'Defensa temporal', hardware: 'Select' }
    }
  },

  // Super Boss Gaiden
  {
    pattern: /super\s*boss\s*gaiden|boss\s*gaiden/i,
    title: 'Super Boss Gaiden',
    genre: 'Beat em Up / Pelea Callejera',
    actions: {
      UP: { label: 'Moverse Arriba', icon: '⬆️', desc: 'Desplazarse en el plano', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Moverse Abajo', icon: '⬇️', desc: 'Desplazarse en el plano', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse Izquierda', icon: '⬅️', desc: 'Retroceder', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse Derecha', icon: '➡️', desc: 'Avanzar al rival', hardware: 'D-Pad 🠊' },
      A: { label: 'Salto Acrobático', icon: '🦘', desc: 'Salto de combate', hardware: 'Botón A' },
      B: { label: 'Golpe Pesado / Combo Final', icon: '🥊', desc: 'Ataque fuerte de impacto', hardware: 'Botón B' },
      Y: { label: 'Combo Rápido de Golpes', icon: '👊', desc: 'Ráfaga de puños sucesivos', hardware: 'Botón Y' },
      X: { label: 'Agarrar / Lanzar Enemigo', icon: '🥋', desc: 'Proyección sobre otros rivales', hardware: 'Botón X' },
      L: { label: 'Bloqueo / Guardia', icon: '🛡️', desc: 'Cubrirse', hardware: 'Gatillo L' },
      R: { label: 'Ataque Desesperado (Super)', icon: '⚡', desc: 'Consume vida para limpiar enemigos', hardware: 'Gatillo R' },
      START: { label: 'Pausar Pelea', icon: '⏸️', desc: 'Pausa', hardware: 'Start' },
      SELECT: { label: 'Opciones', icon: '⚙️', desc: 'Opciones', hardware: 'Select' }
    }
  }
];

// Perfil genérico de reserva según la consola y género aproximado
function getGenericProfile(romName, core) {
  const cleanName = romName.replace(/\.[^/.]+$/, "");
  const lower = romName.toLowerCase();

  // Detección heurística de género
  if (/kart|race|racing|f-zero|grand\s*prix|speed|drive/i.test(lower)) {
    return {
      title: cleanName,
      genre: 'Carreras / Racing',
      actions: {
        UP: { label: 'Mirar Adelante / Acelerar', icon: '⬆️', desc: 'Acelerador o vista', hardware: 'D-Pad 🠉' },
        DOWN: { label: 'Frenar / Marcha Atrás', icon: '⬇️', desc: 'Reducir velocidad', hardware: 'D-Pad 🠋' },
        LEFT: { label: 'Girar a la Izquierda', icon: '⬅️', desc: 'Maniobrar a la izquierda', hardware: 'D-Pad 🠈' },
        RIGHT: { label: 'Girar a la Derecha', icon: '➡️', desc: 'Maniobrar a la derecha', hardware: 'D-Pad 🠊' },
        A: { label: 'Acelerar a Fondo', icon: '🏎️', desc: 'Acelerador principal', hardware: 'Botón A' },
        B: { label: 'Freno / Derrape', icon: '🛑', desc: 'Frenar o derrapar en curva', hardware: 'Botón B' },
        Y: { label: 'Freno de Mano / Turbo', icon: '⚡', desc: 'Derrape cerrado', hardware: 'Botón Y' },
        X: { label: 'Usar Ítem / Proyectil', icon: '💣', desc: 'Lanzar caparazón u objeto', hardware: 'Botón X' },
        L: { label: 'Usar Ítem / Derrape Izquierdo', icon: '◀️', desc: 'Habilidad de curva', hardware: 'Gatillo L' },
        R: { label: 'Salto de Derrape / Ítem', icon: '▶️', desc: 'Saltar para derrapar', hardware: 'Gatillo R' },
        START: { label: 'Pausar Carrera', icon: '⏸️', desc: 'Detener la carrera', hardware: 'Start' },
        SELECT: { label: 'Cambiar Vista / Cámara', icon: '🎥', desc: 'Perspectiva del vehículo', hardware: 'Select' }
      }
    };
  }

  if (/fight|kombat|punch|karate|boxing|versus|brawl|smash/i.test(lower)) {
    return {
      title: cleanName,
      genre: 'Lucha & Artes Marciales',
      actions: {
        UP: { label: 'Saltar', icon: '⬆️', desc: 'Salto vertical o diagonal', hardware: 'D-Pad 🠉' },
        DOWN: { label: 'Agacharse / Guardia Baja', icon: '⬇️', desc: 'Protegerse abajo', hardware: 'D-Pad 🠋' },
        LEFT: { label: 'Retroceder / Guardia', icon: '🛡️', desc: 'Bloquear ataques', hardware: 'D-Pad 🠈' },
        RIGHT: { label: 'Avanzar al Rival', icon: '🥊', desc: 'Cerrar distancia', hardware: 'D-Pad 🠊' },
        A: { label: 'Patada Fuerte / Poder', icon: '⚡', desc: 'Golpe pesado', hardware: 'Botón A' },
        B: { label: 'Patada Rápida', icon: '🦵', desc: 'Ataque bajo ligero', hardware: 'Botón B' },
        Y: { label: 'Puño Rápido (Jab)', icon: '👊', desc: 'Golpe de puño veloz', hardware: 'Botón Y' },
        X: { label: 'Puño Fuerte / Smash', icon: '🥊', desc: 'Golpe contundente', hardware: 'Botón X' },
        L: { label: 'Golpe Especial / Cargar Ki', icon: '🔥', desc: 'Técnica especial', hardware: 'Gatillo L' },
        R: { label: 'Proyectil / Agarre', icon: '💥', desc: 'Lanzar poder', hardware: 'Gatillo R' },
        START: { label: 'Pausar', icon: '⏸️', desc: 'Pausar', hardware: 'Start' },
        SELECT: { label: 'Provocar', icon: '😏', desc: 'Burla', hardware: 'Select' }
      }
    };
  }

  if (/rpg|fantasy|quest|chron|tales|mana|dragon|final/i.test(lower)) {
    return {
      title: cleanName,
      genre: 'Rol & Aventura (RPG)',
      actions: {
        UP: { label: 'Caminar al Norte', icon: '⬆️', desc: 'Subir en el mapa', hardware: 'D-Pad 🠉' },
        DOWN: { label: 'Caminar al Sur', icon: '⬇️', desc: 'Bajar en el mapa', hardware: 'D-Pad 🠋' },
        LEFT: { label: 'Caminar al Oeste', icon: '⬅️', desc: 'Moverse a la izquierda', hardware: 'D-Pad 🠈' },
        RIGHT: { label: 'Caminar al Este', icon: '➡️', desc: 'Moverse a la derecha', hardware: 'D-Pad 🠊' },
        A: { label: 'Interactuar / Aceptar / Hablar', icon: '💬', desc: 'Confirmar selección y hablar', hardware: 'Botón A' },
        B: { label: 'Cancelar / Correr / Salir', icon: '🏃', desc: 'Retroceder o acelerar paso', hardware: 'Botón B' },
        Y: { label: 'Menú Secundario / Mapa', icon: '🗺️', desc: 'Ver estado rápido', hardware: 'Botón Y' },
        X: { label: 'Abrir Menú de Grupo', icon: '📜', desc: 'Ver magias y objetos', hardware: 'Botón X' },
        L: { label: 'Cambiar Personaje (Anterior)', icon: '◀️', desc: 'Pestaña previa', hardware: 'Gatillo L' },
        R: { label: 'Cambiar Personaje (Siguiente)', icon: '▶️', desc: 'Pestaña siguiente', hardware: 'Gatillo R' },
        START: { label: 'Pausar / Menú Principal', icon: '🎒', desc: 'Guardar y opciones', hardware: 'Start' },
        SELECT: { label: 'Organizar Ítems / Mapa', icon: '🧭', desc: 'Acceso rápido', hardware: 'Select' }
      }
    };
  }

  // Plataformas / Acción estándar
  return {
    title: cleanName,
    genre: 'Retro Clásico',
    actions: {
      UP: { label: 'Mirar Arriba / Trepar', icon: '⬆️', desc: 'Moverse verticalmente', hardware: 'D-Pad 🠉' },
      DOWN: { label: 'Agacharse / Esquivar', icon: '⬇️', desc: 'Descender o cubrirse', hardware: 'D-Pad 🠋' },
      LEFT: { label: 'Moverse a la Izquierda', icon: '⬅️', desc: 'Desplazamiento horizontal', hardware: 'D-Pad 🠈' },
      RIGHT: { label: 'Moverse a la Derecha', icon: '➡️', desc: 'Avanzar en el escenario', hardware: 'D-Pad 🠊' },
      A: { label: 'Saltar / Aceptar', icon: '🦘', desc: 'Salto o acción principal', hardware: 'Botón A' },
      B: { label: 'Atacar / Correr / Disparar', icon: '⚡', desc: 'Acción ofensiva o aceleración', hardware: 'Botón B' },
      Y: { label: 'Ataque Especial / Correr', icon: '💥', desc: 'Habilidad secundaria', hardware: 'Botón Y' },
      X: { label: 'Acción Alternativa / Menú', icon: '✨', desc: 'Uso de ítems o menú', hardware: 'Botón X' },
      L: { label: 'Gatillo Izquierdo (L)', icon: '◀️', desc: 'Acción auxiliar izquierda', hardware: 'Gatillo L' },
      R: { label: 'Gatillo Derecho (R)', icon: '▶️', desc: 'Acción auxiliar derecha', hardware: 'Gatillo R' },
      START: { label: 'Pausar Partida', icon: '⏸️', desc: 'Pausar o continuar el juego', hardware: 'Start' },
      SELECT: { label: 'Seleccionar / Modo', icon: '🔄', desc: 'Cambiar opciones del juego', hardware: 'Select' }
    }
  };
}

// Obtener perfil completo para el juego actual
export function getGameProfile(romName = '', core = '') {
  if (!romName) {
    return getGenericProfile('Juego Actual', core);
  }

  for (const profile of GAME_PROFILES_DATABASE) {
    if (profile.pattern.test(romName)) {
      return {
        ...profile,
        title: romName.replace(/\.[^/.]+$/, "")
      };
    }
  }

  return getGenericProfile(romName, core);
}

// Formateador visual premium para mostrar qué tecla o botón está actualmente asignado
export function formatKeyDisplay(action, playerNum, mapping, isListening, connectedGamepadCount) {
  if (isListening) {
    return {
      text: 'Presiona una tecla o botón...',
      shortText: 'Presiona...',
      isListening: true,
      type: 'listening'
    };
  }

  const playerMapping = mapping?.[playerNum] || {};
  const currentVal = playerMapping[action];

  // 1. Caso Tecla de Teclado explícitamente mapeada
  if (typeof currentVal === 'string' && currentVal.startsWith('key:')) {
    const rawKey = currentVal.replace('key:', '');
    let readable = rawKey;
    if (rawKey.startsWith('Key')) readable = rawKey.replace('Key', '');
    else if (rawKey.startsWith('Digit')) readable = rawKey.replace('Digit', '');
    else if (rawKey === 'ArrowUp') readable = 'Flecha 🠉';
    else if (rawKey === 'ArrowDown') readable = 'Flecha 🠋';
    else if (rawKey === 'ArrowLeft') readable = 'Flecha 🠈';
    else if (rawKey === 'ArrowRight') readable = 'Flecha 🠊';
    else if (rawKey === 'Space') readable = 'Espacio';
    else if (rawKey === 'Enter') readable = 'Enter';
    else if (rawKey === 'ShiftLeft' || rawKey === 'ShiftRight') readable = 'Shift';
    else if (rawKey === 'ControlLeft' || rawKey === 'ControlRight') readable = 'Ctrl';
    else if (rawKey === 'AltLeft' || rawKey === 'AltRight') readable = 'Alt';
    else if (rawKey === 'Tab') readable = 'Tab';
    else if (rawKey === 'Backspace') readable = 'Borrar';

    return {
      text: `⌨️ Tecla ${readable}`,
      shortText: readable,
      isCustom: true,
      type: 'keyboard'
    };
  }

  // 2. Caso Eje de Gamepad (Stick / Gatillo analógico)
  if (typeof currentVal === 'string' && currentVal.startsWith('a')) {
    const axisIndex = currentVal.substring(1, currentVal.length - 1);
    const direction = currentVal.endsWith('+') ? 'Positivo (+)' : 'Negativo (-)';
    return {
      text: `🎮 Eje ${axisIndex} ${direction}`,
      shortText: `Eje ${axisIndex}`,
      isCustom: true,
      type: 'gamepad'
    };
  }

  // 3. Caso Botón de Gamepad personalizado
  const GAMEPAD_NAMES = {
    0: 'Botón A / Cruz',
    1: 'Botón B / Círculo',
    2: 'Botón X / Cuadrado',
    3: 'Botón Y / Triángulo',
    4: 'Gatillo L1 / LB',
    5: 'Gatillo R1 / RB',
    6: 'Gatillo L2 / LT',
    7: 'Gatillo R2 / RT',
    8: 'Select / Share',
    9: 'Start / Options',
    10: 'Stick L3',
    11: 'Stick R3',
    12: 'D-Pad 🠉 (Arriba)',
    13: 'D-Pad 🠋 (Abajo)',
    14: 'D-Pad 🠈 (Izquierda)',
    15: 'D-Pad 🠊 (Derecha)'
  };

  // Si hay mandos conectados, o si el usuario juega con Gamepad
  const isGamepadActive = (playerNum === 1 && connectedGamepadCount >= 1) || (playerNum === 2 && connectedGamepadCount >= 2);

  if (typeof currentVal === 'number') {
    const gpName = GAMEPAD_NAMES[currentVal] || `Botón ${currentVal}`;
    
    // Si el usuario no tiene mando y está en teclado, mostrarle la tecla por defecto equivalente
    if (!isGamepadActive) {
      const defKeyMap = playerNum === 1 ? DEFAULT_KEYBOARD_P1 : DEFAULT_KEYBOARD_P2;
      const defKey = defKeyMap[action] || '';
      let readableKey = defKey.replace('Key', '').replace('Arrow', 'Flecha ');
      if (defKey === 'Enter') readableKey = 'Enter';
      if (defKey === 'Space') readableKey = 'Espacio';
      if (defKey === 'ShiftLeft' || defKey === 'Shift') readableKey = 'Shift';
      if (defKey === 'Tab') readableKey = 'Tab';

      return {
        text: `⌨️ Tecla ${readableKey}`,
        shortText: readableKey,
        secondaryText: `🎮 ${gpName}`,
        isDefault: true,
        type: 'keyboard'
      };
    }

    return {
      text: `🎮 ${gpName}`,
      shortText: gpName,
      type: 'gamepad'
    };
  }

  // 4. Fallback por defecto si no está en mapping
  const defKeyMap = playerNum === 1 ? DEFAULT_KEYBOARD_P1 : DEFAULT_KEYBOARD_P2;
  const defKey = defKeyMap[action] || '';
  let readableKey = defKey.replace('Key', '').replace('Arrow', 'Flecha ');
  if (defKey === 'Enter') readableKey = 'Enter';
  if (defKey === 'Space') readableKey = 'Espacio';
  if (defKey === 'ShiftLeft' || defKey === 'Shift') readableKey = 'Shift';
  if (defKey === 'Tab') readableKey = 'Tab';

  return {
    text: `⌨️ Tecla ${readableKey}`,
    shortText: readableKey,
    isDefault: true,
    type: 'keyboard'
  };
}
