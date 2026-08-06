import React, { useState, useEffect, useRef } from 'react';
import { Music, VolumeX } from 'lucide-react';
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
  { id: 'track-1', name: 'LOOP RUIDA BEAT BARRZ APP', url: '/soundtracks/LOOP RUIDA BEAT BARRZ APP.wav' }
];

export const MenuAudioPlayer: React.FC<MenuAudioPlayerProps> = ({ gameState }) => {
  const [currentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const isPlayingRef = useRef(isPlaying);
  const setIsPlayingWithRef = (val: boolean) => {
    setIsPlaying(val);
    isPlayingRef.current = val;
  };
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Volumen por defecto de la app: 35%
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('barrz_lobby_volume');
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const [isMuted] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);
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
    audioRef.current.loop = true;
    audioRef.current.volume = 0; // Iniciar en 0 para fade-in

    audioRef.current.onended = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay();
      }
    };

    // Intentar reproducir respetando políticas de navegador
    if (isPlaying && gameState !== 'game') {
      attemptPlayWithFadeIn();
    }

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [currentTrackIndex]);

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

    const handleVolumeChangedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      const newVol = customEvent.detail;
      setVolume(newVol);
      if (audioRef.current) {
        audioRef.current.volume = newVol;
      }
    };

    window.addEventListener('barrz_pause_lobby_music', handlePauseLobby);
    window.addEventListener('barrz_resume_lobby_music', handleResumeLobby);
    window.addEventListener('barrz_lobby_volume_changed', handleVolumeChangedEvent);

    return () => {
      window.removeEventListener('barrz_pause_lobby_music', handlePauseLobby);
      window.removeEventListener('barrz_resume_lobby_music', handleResumeLobby);
      window.removeEventListener('barrz_lobby_volume_changed', handleVolumeChangedEvent);
    };
  }, [gameState, isPlaying]);

  const isGameOrIndividualSetup = gameState === 'game' || gameState === 'setup_individual';

  return (
    <div className="menu-audio-container">
      {/* 2. REPRODUCTOR / CONTROLES DE AUDIO (Abajo Derecha) */}
      <div className={`music-controls-wrapper ${isGameOrIndividualSetup ? 'game-faded' : ''}`}>
        
        {/* Botón Circular Principal — Toggle directo Encendido / Apagado (Sonido ON / OFF) */}
        <button 
          type="button" 
          className={`btn-music-trigger ${!isPlaying || isMuted || volume === 0 ? 'muted' : ''}`}
          onClick={togglePlayPause}
          title={isPlaying ? 'Apagar Sonido' : 'Encender Sonido'}
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
