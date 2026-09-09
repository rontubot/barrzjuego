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
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return localStorage.getItem('barrz_lobby_music_enabled') !== 'false';
  });
  const isPlayingRef = useRef(isPlaying);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Volumen por defecto de la app: 35%
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('barrz_lobby_volume');
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevGameStateRef = useRef<string>(gameState);

  // Inicializar el elemento de audio una única vez al montar la aplicación
  useEffect(() => {
    const audio = new Audio();
    audio.src = SOUNDTRACKS[0].url;
    audio.loop = true;
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const playIfAllowed = () => {
      if (!audioRef.current || !isPlayingRef.current) return;
      const isMutedScreen = gameState === 'game' || gameState === 'setup_individual';
      if (isMutedScreen) return;

      audioRef.current.volume = volumeRef.current;
      audioRef.current.play().catch(() => {
        // Autoplay bloqueado: esperar primera interacción del usuario
        const unlock = () => {
          if (audioRef.current && isPlayingRef.current) {
            const muted = gameState === 'game' || gameState === 'setup_individual';
            if (!muted) {
              audioRef.current.volume = volumeRef.current;
              audioRef.current.play().catch(() => {});
            }
          }
        };

        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    };

    playIfAllowed();

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

  // Controlar cambios de volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Manejar transiciones de pantallas (Menú vs Gameplay/SetupIndividual)
  useEffect(() => {
    const prevGameState = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (!audioRef.current) return;

    const isMutedScreen = (state: string) => state === 'game' || state === 'setup_individual';

    if (isMutedScreen(gameState)) {
      audioRef.current.pause();
    } else if (!isMutedScreen(gameState) && isMutedScreen(prevGameState)) {
      if (isPlaying) {
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
      }
    } else if (!isMutedScreen(gameState) && isPlaying && audioRef.current.paused) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [gameState, isPlaying, volume]);

  // Toggle Play / Pausa
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('barrz_lobby_music_enabled', 'false');
    } else {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      localStorage.setItem('barrz_lobby_music_enabled', 'true');
    }
  };

  // Escuchar eventos de pre-escucha y volumen desde otros componentes
  useEffect(() => {
    const handlePauseLobby = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
      }
    };

    const handleResumeLobby = () => {
      if (audioRef.current && isPlaying && gameState !== 'game' && gameState !== 'setup_individual') {
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
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
  }, [gameState, isPlaying, volume]);

  const isGameOrIndividualSetup = gameState === 'game' || gameState === 'setup_individual';

  return (
    <div className="menu-audio-container">
      <div className={`music-controls-wrapper ${isGameOrIndividualSetup ? 'game-faded' : ''}`}>
        <button 
          type="button" 
          className={`btn-music-trigger ${!isPlaying || volume === 0 ? 'muted' : ''}`}
          onClick={togglePlayPause}
          title={isPlaying ? 'Silenciar Música' : 'Activar Música'}
        >
          {isPlaying && !isGameOrIndividualSetup && volume > 0 ? (
            <Music size={20} className="pulse-music" />
          ) : (
            <VolumeX size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
