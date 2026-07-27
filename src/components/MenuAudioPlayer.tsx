import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react';
import './MenuAudioPlayer.css';

interface MenuAudioPlayerProps {
  gameState: string;
}

interface Track {
  id: string;
  name: string;
  url: string;
}

const SOUNDTRACKS: Track[] = [
  { id: 'track-1', name: 'Back - Ruida 86', url: '/soundtracks/back.mpeg' },
  { id: 'track-2', name: 'Desconocidos - Citrico 93', url: '/soundtracks/desconocidos.mpeg' },
  { id: 'track-3', name: 'Electric-Try 3', url: '/soundtracks/electric-try 3.mp3.mpeg' },
  { id: 'track-4', name: 'Ovni 2', url: '/soundtracks/ovni 2.mp3.mpeg' }
];

export const MenuAudioPlayer: React.FC<MenuAudioPlayerProps> = ({ gameState }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => 
    Math.floor(Math.random() * SOUNDTRACKS.length)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const isPlayingRef = useRef(isPlaying);
  const setIsPlayingWithRef = (val: boolean) => {
    setIsPlaying(val);
    isPlayingRef.current = val;
  };
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const [volume, setVolume] = useState<number>(0.5); // Volumen por defecto: 50%
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  
  const [history, setHistory] = useState<number[]>([]);
  const [playedPool, setPlayedPool] = useState<number[]>([]);

  const currentTrackIndexRef = useRef(currentTrackIndex);
  const playedPoolRef = useRef(playedPool);
  const historyRef = useRef(history);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    playedPoolRef.current = playedPool;
  }, [playedPool]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Inicializar el pool con la pista inicial elegida
  useEffect(() => {
    setPlayedPool([currentTrackIndex]);
  }, []);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);
  const bannerTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevGameStateRef = useRef<string>(gameState);

  // Inicializar el elemento de audio una única vez al montar la aplicación
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch (e) {
          console.log("Error al limpiar audio:", e);
        }
      }
    };
  }, []);
  
  const currentTrack = SOUNDTRACKS[currentTrackIndex];
  const volumePercentage = (isMuted ? 0 : volume) * 100;

  const safePlay = () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.play().catch((err) => {
        console.log("SafePlay error:", err);
      });
    } catch (e) {
      console.log("SafePlay execution error:", e);
    }
  };

  const safePause = () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.pause();
    } catch (e) {
      console.log("SafePause error:", e);
    }
  };

  // 1. Manejar cambios de pista reutilizando el mismo elemento
  useEffect(() => {
    if (!audioRef.current) return;

    // Si ya existe un audio reproduciéndose, lo pausamos
    safePause();

    // Cambiar la fuente del elemento de audio existente
    audioRef.current.src = currentTrack.url;
    audioRef.current.loop = false;
    audioRef.current.volume = 0; // Iniciar en 0 para fade-in

    // Al finalizar la pista, reproducir otra sin repetir en la misma sesión
    audioRef.current.onended = () => {
      const currentIdx = currentTrackIndexRef.current;
      const pool = playedPoolRef.current;
      
      if (SOUNDTRACKS.length <= 1) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          safePlay();
        }
        return;
      }

      let unplayed = SOUNDTRACKS.map((_, i) => i).filter(i => !pool.includes(i));
      let nextIndex = 0;

      if (unplayed.length === 0) {
        unplayed = SOUNDTRACKS.map((_, i) => i).filter(i => i !== currentIdx);
        if (unplayed.length === 0) unplayed = [0];
        nextIndex = unplayed[Math.floor(Math.random() * unplayed.length)];
        setPlayedPool([nextIndex]);
      } else {
        nextIndex = unplayed[Math.floor(Math.random() * unplayed.length)];
        setPlayedPool(prev => [...prev, nextIndex]);
      }

      setHistory(prev => [...prev, currentIdx]);
      setIsPlayingWithRef(true);
      setCurrentTrackIndex(nextIndex);
    };

    // Intentar reproducir respetando políticas de navegador
    if (isPlaying && gameState !== 'game') {
      attemptPlayWithFadeIn();
    }

    // Mostrar banner deslizante estilo FIFA
    triggerBanner();

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [currentTrackIndex]);

  // Mostrar el banner de canción por unos segundos
  const triggerBanner = () => {
    setShowBanner(true);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = setTimeout(() => {
      setShowBanner(false);
    }, 4500); // Se oculta tras 4.5 segundos
  };

  // Intentar reproducir, con bypass de autoplay si es bloqueado, aplicando fade-in
  const attemptPlayWithFadeIn = () => {
    if (!audioRef.current) return;

    audioRef.current.volume = 0; // Iniciar en silencio

    const p = audioRef.current.play();
    if (p !== undefined) {
      p.then(() => {
        // Si la reproducción es exitosa, iniciar fade-in
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }

        const targetVol = isMuted ? 0 : volume;
        let curVol = 0;
        const steps = 15; // 300ms total
        const stepTime = 20; 
        const volDelta = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
          curVol = Math.min(targetVol, curVol + volDelta);
          if (audioRef.current) {
            audioRef.current.volume = curVol;
          }

          if (curVol >= targetVol) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            if (audioRef.current) {
              audioRef.current.volume = targetVol;
            }
          }
        }, stepTime);
      }).catch(() => {
        console.log("Autoplay bloqueado temporalmente por el navegador. Esperando interacción.");
        
        // Listener para desbloquear audio tras la primera interacción
        const unlockAudio = () => {
          if (audioRef.current && isPlayingRef.current && gameState !== 'game') {
            attemptPlayWithFadeIn();
          }
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        };
        
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
      });
    }
  };

  // 2. Controlar volumen y silencio
  useEffect(() => {
    if (audioRef.current) {
      // Solo actualizamos volumen de forma directa si no hay un fade-out/fade-in activo
      // que tome control del volumen
      if (!fadeIntervalRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }
  }, [volume, isMuted]);

  // 3. Manejar transiciones de estados (Menú vs Gameplay/SetupIndividual)
  useEffect(() => {
    const prevGameState = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (prevGameState === gameState) return;
    if (!audioRef.current) return;

    const isMutedScreen = (state: string) => state === 'game' || state === 'setup_individual';

    // Solo hacemos fade out si pasamos de un menú normal a una pantalla silenciada
    if (isMutedScreen(gameState) && !isMutedScreen(prevGameState)) {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      // --- FADE OUT (Transición hacia la partida o selección de beats) ---
      const startVol = audioRef.current.volume;
      let curVol = startVol;
      const steps = 15; // 15 pasos
      const stepTime = 20; // Cada 20ms -> 300ms total
      const volDelta = startVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.max(0, curVol - volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol <= 0) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          safePause();
        }
      }, stepTime);
    }
    // Solo hacemos fade in si pasamos de una pantalla silenciada a un menú normal
    else if (!isMutedScreen(gameState) && isMutedScreen(prevGameState)) {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      // --- FADE IN (Regreso al Menú) ---
      if (isPlaying) {
        audioRef.current.volume = 0;
        safePlay();

        const targetVol = isMuted ? 0 : volume;
        let curVol = 0;
        const steps = 20;
        const stepTime = 20; // 400ms total
        const volDelta = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
          curVol = Math.min(targetVol, curVol + volDelta);
          if (audioRef.current) {
            audioRef.current.volume = curVol;
          }

          if (curVol >= targetVol) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            if (audioRef.current) {
              audioRef.current.volume = targetVol;
            }
          }
        }, stepTime);
      }
    }
  }, [gameState, isPlaying, volume, isMuted]);

  // Cambiar canción aplicando un fade-out suave antes de pasar a la siguiente
  const changeTrackWithFade = (nextIndex: number) => {
    if (!audioRef.current || !isPlaying || isMuted || gameState === 'game') {
      // Si está en silencio, pausado o en combate, cambiar tema instantáneamente
      setIsPlaying(true);
      setCurrentTrackIndex(nextIndex);
      return;
    }

    // Si el volumen ya es muy bajo (por spam de clicks o final de pista), cambiar tema al instante para mantener la respuesta
    if (audioRef.current.volume < 0.1) {
      setIsPlaying(true);
      setCurrentTrackIndex(nextIndex);
      return;
    }

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // --- FADE OUT DE LA CANCIÓN ACTUAL ---
    const startVol = audioRef.current.volume;
    let curVol = startVol;
    const steps = 10; // 200ms total
    const stepTime = 20; 
    const volDelta = startVol / steps;

    fadeIntervalRef.current = setInterval(() => {
      curVol = Math.max(0, curVol - volDelta);
      if (audioRef.current) {
        audioRef.current.volume = curVol;
      }

      if (curVol <= 0) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        // Al finalizar el fade out, cambiamos el track (esto disparará el useEffect con su respectivo fade-in)
        setIsPlayingWithRef(true);
        setCurrentTrackIndex(nextIndex);
      }
    }, stepTime);
  };

  // Selección de siguiente pista (aleatoria sin repetir temas en la sesión)
  const playNextRandom = () => {
    if (SOUNDTRACKS.length <= 1) {
      changeTrackWithFade(0);
      return;
    }

    let unplayed = SOUNDTRACKS.map((_, i) => i).filter(i => !playedPool.includes(i));
    let nextIndex = 0;

    if (unplayed.length === 0) {
      unplayed = SOUNDTRACKS.map((_, i) => i).filter(i => i !== currentTrackIndex);
      if (unplayed.length === 0) unplayed = [0];
      nextIndex = unplayed[Math.floor(Math.random() * unplayed.length)];
      setPlayedPool([nextIndex]);
    } else {
      nextIndex = unplayed[Math.floor(Math.random() * unplayed.length)];
      setPlayedPool(prev => [...prev, nextIndex]);
    }

    setHistory(prev => [...prev, currentTrackIndex]);
    changeTrackWithFade(nextIndex);
  };

  // Selección de pista anterior (regresar a la canción que ya pasó en la sesión)
  const playPrevRandom = () => {
    if (history.length === 0) {
      // Si no hay historial, no retroceder
      return;
    }

    const prevHistory = [...history];
    const prevIndex = prevHistory.pop()!;
    
    setHistory(prevHistory);
    // Quitar del pool de reproducidas para que pueda volver a salir
    setPlayedPool(prev => prev.filter(i => i !== currentTrackIndex));
    
    changeTrackWithFade(prevIndex);
  };

  // Toggle Play / Pausa
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    // Cancelar cualquier fade activo para que responda instantáneamente
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (isPlaying) {
      // --- FADE OUT AL PAUSAR ---
      setIsPlayingWithRef(false); // Respuesta visual instantánea al pausar
      const startVol = audioRef.current.volume;
      let curVol = startVol;
      const steps = 12; // 240ms total
      const stepTime = 20; 
      const volDelta = startVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.max(0, curVol - volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol <= 0) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          safePause();
        }
      }, stepTime);
    } else {
      // --- FADE IN AL REPRODUCIR ---
      audioRef.current.volume = 0;
      safePlay();
      setIsPlayingWithRef(true); // Respuesta visual instantánea al reproducir
      triggerBanner(); // Al darle play, volvemos a mostrar qué está sonando

      const targetVol = isMuted ? 0 : volume;
      let curVol = 0;
      const steps = 15; // 300ms total
      const stepTime = 20; 
      const volDelta = targetVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.min(targetVol, curVol + volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol >= targetVol) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          if (audioRef.current) {
            audioRef.current.volume = targetVol;
          }
        }
      }, stepTime);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    // Si hay fade activo, lo limpiamos
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  // Cambio manual del deslizador de volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  // 4. Escuchar eventos de pre-escucha para pausar/reanudar música de fondo
  useEffect(() => {
    const handlePauseLobby = () => {
      if (audioRef.current && isPlaying) {
        safePause();
      }
    };

    const handleResumeLobby = () => {
      if (audioRef.current && isPlaying && gameState !== 'game' && gameState !== 'setup_individual') {
        safePlay();
      }
    };

    window.addEventListener('barrz_pause_lobby_music', handlePauseLobby);
    window.addEventListener('barrz_resume_lobby_music', handleResumeLobby);

    return () => {
      window.removeEventListener('barrz_pause_lobby_music', handlePauseLobby);
      window.removeEventListener('barrz_resume_lobby_music', handleResumeLobby);
    };
  }, [gameState, isPlaying]);

  // Cerrar el panel al hacer clic fuera del contenedor (para touch / mouse click)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPanelOpen]);

  const isGameOrIndividualSetup = gameState === 'game' || gameState === 'setup_individual';

  return (
    <div className="menu-audio-container">
      {/* 1. NOTIFICACIÓN DE CANCIÓN - ESTILO FIFA (Abajo Izquierda) */}
      <div className={`song-banner-overlay ${showBanner && !isGameOrIndividualSetup ? 'visible' : ''} ${isGameOrIndividualSetup ? 'game-faded' : ''}`}>
        <div className="song-banner-icon">
          <Music size={20} />
        </div>
        <div className="song-banner-info">
          <span className="song-banner-tag">Soundtrack</span>
          <span className="song-banner-title">{currentTrack.name}</span>
        </div>
      </div>

      {/* 2. REPRODUCTOR / CONTROLES DE AUDIO (Abajo Derecha) */}
      <div className={`music-controls-wrapper ${isGameOrIndividualSetup ? 'game-faded' : ''}`} ref={containerRef}>
        {/* Panel Flotante Suplementario (Abierto al hacer click / touch) */}
        <div className={`music-controls-panel ${isPanelOpen && !isGameOrIndividualSetup ? 'open' : ''}`}>
          <div className="music-panel-track-title">{currentTrack.name}</div>
          
          <div className="music-panel-actions">
            {/* Botón Atrás */}
            <button 
              type="button" 
              className="music-ctrl-btn" 
              onClick={playPrevRandom}
              title="Pista anterior"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>

            {/* Botón Play / Pausa */}
            <button 
              type="button" 
              className="music-ctrl-btn play-pause" 
              onClick={togglePlayPause}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            {/* Botón Siguiente */}
            <button 
              type="button" 
              className="music-ctrl-btn" 
              onClick={playNextRandom}
              title="Siguiente pista"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Control Deslizante de Volumen */}
          <div className="volume-control-section">
            <button 
              type="button" 
              className="btn-mute-toggle" 
              onClick={toggleMute}
              title={isMuted ? 'Desmutear' : 'Mutear'}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              title="Ajustar volumen"
              style={{
                background: `linear-gradient(to right, var(--neon-teal) 0%, var(--neon-pink) ${volumePercentage}%, rgba(255, 255, 255, 0.15) ${volumePercentage}%, rgba(255, 255, 255, 0.15) 100%)`
              }}
            />
          </div>
        </div>

        {/* Botón Circular Principal */}
        <button 
          type="button" 
          className={`btn-music-trigger ${isMuted || volume === 0 ? 'muted' : ''} ${isPanelOpen && !isGameOrIndividualSetup ? 'active' : ''}`}
          onClick={() => {
            if (!isGameOrIndividualSetup) {
              setIsPanelOpen(!isPanelOpen);
            }
          }}
          title="Configuración de Música"
        >
          {isPlaying && !isGameOrIndividualSetup && !isMuted && volume > 0 ? (
            <Music size={20} className="pulse-music" />
          ) : (
            <VolumeX size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
