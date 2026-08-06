import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, Play, Pause, Square, Music, QrCode, Sparkles, User, SkipForward, Home, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import { ConfirmDialog } from './ConfirmDialog';
import './Game.css';

const getApiUrl = (path: string) => {
  const isProd = import.meta.env.PROD;
  const baseUrl = isProd ? window.location.origin : 'http://localhost:3001';
  return `${baseUrl}${path}`;
};

const DEATHMATCH_THEMES = [
  { title: 'EL TODO O NADA', desc: 'Improvisen sobre arriesgarlo todo en el último segundo.', highlight: 'ÚLTIMO CARTUCHO' },
  { title: 'LA CAÍDA DEL IMPERIO', desc: 'Rimen sobre el poder, la ambición y la caída inevitable de los grandes.', highlight: 'AMBICIÓN' },
  { title: 'INFRAMUNDO URBANO', desc: 'Describan las calles oscuras, los códigos del rap y la supervivencia.', highlight: 'CÓDIGO CALLEJERO' },
  { title: 'VIAJEROS DEL TIEMPO', desc: 'Hablen sobre cambiar el pasado o las consecuencias del futuro.', highlight: 'EFECTO MARIPOSA' },
  { title: 'JUICIO FINAL', desc: 'Quién merece la corona y quién será condenado al olvido.', highlight: 'SENTENCIA' },
  { title: 'FÉNIX NEGRO', desc: 'Rimen sobre resurgir de las cenizas de una derrota total.', highlight: 'RESURRECCIÓN' },
  { title: 'TIEMPO LÍMITE', desc: 'El reloj corre y no hay segundas oportunidades.', highlight: 'RELOJ DE ARENA' },
  { title: 'BATALLA ESPACIAL', desc: 'El cypher viaja a la órbita terrestre, rimas interestelares.', highlight: 'GRAVEDAD CERO' },
];

interface GameProps {
  onBackToMenu: () => void;
  onGameSaved?: (stats: any, history: any) => void;
  gameSettings?: {
    mode: 'solo' | 'multiplayer';
    subMode?: 'random' | 'custom';
    players: string[];
    avatars?: Record<string, string>;
    roundsCount: number;
    selectedCategories: string[];
    startingPlayer: string;
    initialBeat?: BeatCard | null;
    initialChallenge?: ChallengeCard | null;
    allowRandomFreestyle?: boolean;
  };
}

export const Game: React.FC<GameProps> = ({ onBackToMenu, onGameSaved, gameSettings }) => {
  // Configuración del juego (valores de props o valores por defecto)
  const mode = gameSettings?.mode || 'multiplayer';
  const playerNames = gameSettings?.players || ['Freestyler A', 'Freestyler B'];
  const totalRounds = gameSettings?.roundsCount || 5;
  const categories = gameSettings?.selectedCategories || [
    'palabras',
    'tematicas',
    'terminaciones',
    'beatbox',
    'versus'
  ];
  const startingPlayer = gameSettings?.startingPlayer || playerNames[0];

  // Estados de control de la partida
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedBeatForTurn, setSelectedBeatForTurn] = useState<BeatCard | null>(null);
  const [selectedChallengeForTurn, setSelectedChallengeForTurn] = useState<ChallengeCard | null>(null);
  
  // Puntuación de los jugadores
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initialScores: Record<string, number> = {};
    playerNames.forEach(name => {
      initialScores[name] = 0;
    });
    return initialScores;
  });

  // Registro detallado de turnos jugados (para historial detallado)
  type TurnLog = {
    round: number;
    player: string;
    challengeTitle: string;
    challengeCategory: string;
    challengePrompt: string;
    beatName: string;
    beatBpm: number;
    votes: Record<string, number>;
    totalScore: number;
    isDeathmatch?: boolean;
  };
  const [gameLog, setGameLog] = useState<TurnLog[]>([]);



  // Estados de sub-pantallas del juego: 'ready' | 'playing' | 'scoring' | 'replica_announcement' | 'game_over'
  const [subState, setSubState] = useState<'ready' | 'playing' | 'scoring' | 'replica_announcement' | 'game_over'>(
    gameSettings?.mode === 'solo' ? 'playing' : 'ready'
  );
  
  const [selectedRating, setSelectedRating] = useState<number>(3); // Estrellas por defecto: 3
  const [currentVoterIndex, setCurrentVoterIndex] = useState<number>(0);
  const [votesReceived, setVotesReceived] = useState<Record<string, number>>({});
  
  const [showSpotifyPlayer, setShowSpotifyPlayer] = useState(true);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');
  const [isVoterFading, setIsVoterFading] = useState(false);

  // Estados para Réplicas (Desempate)
  const [isReplicaActive, setIsReplicaActive] = useState(false);
  const [replicaPlayers, setReplicaPlayers] = useState<string[]>([]);
  const [turnsPlayedInRound, setTurnsPlayedInRound] = useState(0);

  // Filtrar cartas de desafíos por categorías seleccionadas (en réplica forzar palabras y tematicas)
  const activeCategoriesForDraw = isReplicaActive ? ['palabras', 'tematicas'] : categories;
  const filteredChallenges = CHALLENGES_DECK.filter(card => activeCategoriesForDraw.includes(card.category));
  const availableChallenges = filteredChallenges.length > 0 ? filteredChallenges : CHALLENGES_DECK;

  // Cartas activas
  const [activeBeat, setActiveBeat] = useState<BeatCard | null>(() => {
    if (gameSettings?.initialBeat) return gameSettings.initialBeat;
    if (gameSettings?.mode === 'solo' && gameSettings?.subMode === 'random') {
      return BEATS_DECK[Math.floor(Math.random() * BEATS_DECK.length)];
    }
    return null;
  });

  const [activeChallenge, setActiveChallenge] = useState<ChallengeCard | null>(() => {
    if (gameSettings?.initialChallenge) return gameSettings.initialChallenge;
    if (gameSettings?.mode === 'solo' && gameSettings?.subMode === 'random') {
      return availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    }
    return null;
  });

  const [activeCardType, setActiveCardType] = useState<'challenge' | 'beat'>('challenge');
  const [replicaTheme, setReplicaTheme] = useState<{ title: string; desc: string; highlight: string } | null>(null);

  // Estados de animación de cartas
  const [beatFlipped, setBeatFlipped] = useState(gameSettings?.mode === 'solo');
  const [challengeFlipped, setChallengeFlipped] = useState(gameSettings?.mode === 'solo');


  // Animación de salida global
  const [isExiting, setIsExiting] = useState(false);

  // Diálogos de confirmación
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Temporizador para desafíos
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Metrónomo visual
  const [isMetronomeOn, setIsMetronomeOn] = useState(true);



  // Lista de competidores activos en la ronda actual (en réplica solo participan los empatados)
  const activeRoundPlayers = isReplicaActive ? replicaPlayers : playerNames;
  const activePlayer = activeRoundPlayers[currentPlayerIndex] || activeRoundPlayers[0];
  const votingPlayers = playerNames.filter(name => name !== activePlayer);
  const currentVoter = votingPlayers[currentVoterIndex] || 'Votante';

  // Establecer el índice del jugador inicial al comenzar (solo en ronda 1 normal)
  useEffect(() => {
    if (!isReplicaActive) {
      const startIndex = playerNames.indexOf(startingPlayer);
      if (startIndex !== -1) {
        setCurrentPlayerIndex(startIndex);
      }
    }
  }, [startingPlayer, playerNames, isReplicaActive]);

  // Enviar resultados al backend cuando finalice la partida
  useEffect(() => {
    if (subState === 'game_over') {
      const saveGameResult = async () => {
        const token = localStorage.getItem('barrz_token');
        if (!token) return; // Si es invitado, no guarda en DB

        const userSessionStr = localStorage.getItem('barrz_session');
        if (!userSessionStr) return;
        const userSession = JSON.parse(userSessionStr);

        // El usuario logueado en la aplicación es siempre el Jugador 1 (índice 0)
        const targetPlayer = playerNames[0];
        const userScore = scores[targetPlayer] || 0;
        
        let result = 'complete';
        let playerRank = 1;

        if (mode === 'multiplayer') {
          const myRank = ranksList.find(r => r.name === targetPlayer);
          playerRank = myRank ? myRank.rank : 1;
          result = playerRank === 1 ? 'win' : 'loss';
        }

        try {
          const res = await fetch(getApiUrl('/api/auth/save-game'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              mode: mode,
              roundsCount: totalRounds,
              points: userScore,
              result: result,
              playerRank: playerRank,
              players: playerNames,
              scores: scores,
              details: gameLog
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            console.log('Resultados de batalla guardados en base de datos.');
            if (data.stats && data.history) {
              const updatedSession = {
                ...userSession,
                stats: data.stats,
                history: data.history
              };
              localStorage.setItem('barrz_session', JSON.stringify(updatedSession));
              if (onGameSaved) onGameSaved(data.stats, data.history);
            }
          }
        } catch (err) {
          console.error('Error al guardar partida:', err);
        }
      };

      saveGameResult();
    }
  }, [subState]);

  // Simulador de barra de progreso de Spotify
  useEffect(() => {
    let interval: any = null;
    if (spotifyPlaying && subState === 'playing') {
      const isFreestyleLibre = activeChallenge?.id === 'challenge-tematicas-libre';
      const limit = isFreestyleLibre ? 180 : 60;
      interval = setInterval(() => {
        setSpotifyProgress(prev => {
          if (prev >= limit) return 0;
          return prev + 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [spotifyPlaying, subState, activeChallenge]);

  // Resetear progreso al cambiar de beat o turno
  useEffect(() => {
    setSpotifyProgress(0);
    setSpotifyPlaying(false);
    setIsSpotifyLinked(localStorage.getItem('barrz_spotify_linked') === 'true');
  }, [activeBeat, subState]);

  // Manejo del temporizador
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Restablecer tiempo al cambiar de carta de desafío
  useEffect(() => {
    if (activeChallenge?.timeLimit) {
      setTimerSeconds(Math.min(activeChallenge.timeLimit, 60));
      setTimerRunning(false);
    } else {
      setTimerRunning(false);
      setTimerSeconds(60);
    }
  }, [activeChallenge]);



  // Volver al menú
  const triggerExitToMenu = () => {
    setIsExiting(true);
    setTimeout(() => onBackToMenu(), 600);
  };

  // Sacar cartas aleatorias
  const drawBeat = (delay = 150) => {
    setBeatFlipped(false);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * BEATS_DECK.length);
      setActiveBeat(BEATS_DECK[randomIndex]);
      setBeatFlipped(true);
    }, delay);
  };

  const drawChallenge = (delay = 150) => {
    setChallengeFlipped(false);
    setTimeout(() => {
      // Si está activa la opción de freestyle libre aleatorio en multijugador, hay un 15% de probabilidad de forzarlo
      if (mode === 'multiplayer' && gameSettings?.allowRandomFreestyle && Math.random() < 0.15) {
        const libreCard = CHALLENGES_DECK.find(c => c.id === 'challenge-tematicas-libre');
        if (libreCard) {
          setActiveChallenge(libreCard);
          setChallengeFlipped(true);
          return;
        }
      }
      const randomIndex = Math.floor(Math.random() * availableChallenges.length);
      setActiveChallenge(availableChallenges[randomIndex]);
      setChallengeFlipped(true);
    }, delay);
  };

  // Terminar improvisación e ir a puntuar
  const handleFinishImprovisation = () => {
    setTimerRunning(false);
    if (mode === 'solo') {
      // En modo Solo, no hay puntuación. Pasamos de turno directamente
      advanceTurn(scores);
    } else {
      setSelectedRating(3); // Restablecer estrellas a 3
      setCurrentVoterIndex(0);
      setVotesReceived({});
      setSubState('scoring');
    }
  };

  // Registrar voto de un jugador y avanzar cuando voten todos
  const handleVoteSubmit = () => {
    setIsVoterFading(true);
    
    setTimeout(() => {
      const nextVotes = {
        ...votesReceived,
        [currentVoter]: selectedRating
      };
      setVotesReceived(nextVotes);

      if (currentVoterIndex < votingPlayers.length - 1) {
        // Avanzar al siguiente votante
        setCurrentVoterIndex(prev => prev + 1);
        setSelectedRating(3); // Reset de selección a 3 por defecto
        setIsVoterFading(false);
      } else {
        // Todos los votantes terminaron, sumamos y guardamos
        const totalTurnScore = Object.values(nextVotes).reduce((sum, val) => sum + val, 0);
        const newScores = {
          ...scores,
          [activePlayer]: scores[activePlayer] + totalTurnScore
        };
        setScores(newScores);

        // Registrar turno en el log detallado
        const turnEntry: TurnLog = {
          round: currentRound,
          player: activePlayer,
          challengeTitle: activeChallenge?.title || selectedChallengeForTurn?.title || 'Sin desafío',
          challengeCategory: activeChallenge?.category || selectedChallengeForTurn?.category || '',
          challengePrompt: (activeChallenge as any)?.prompt || (selectedChallengeForTurn as any)?.prompt || '',
          beatName: activeBeat?.name || selectedBeatForTurn?.name || 'Sin beat',
          beatBpm: activeBeat?.bpm || selectedBeatForTurn?.bpm || 0,
          votes: { ...nextVotes },
          totalScore: totalTurnScore,
          isDeathmatch: isReplicaActive
        };
        setGameLog(prev => [...prev, turnEntry]);

        advanceTurn(newScores);
        setIsVoterFading(false);
      }
    }, 250); // 250ms fade-out transition
  };

  // Avanzar turno, evaluar empates / réplicas o finalizar
  const advanceTurn = (currentScores: Record<string, number>) => {
    // Si estamos en modo solo y ya terminamos las rondas, terminar juego
    if (mode === 'solo' && currentRound >= totalRounds) {
      setSubState('game_over');
      return;
    }

    if (mode === 'solo') {
      // Avanzar de ronda
      setCurrentRound(prev => prev + 1);
      
      // Auto-iniciar siguiente turno sin pasar por 'ready'
      setSubState('playing');
      setActiveCardType('challenge');
      
      if (gameSettings?.subMode === 'random') {
        setBeatFlipped(false);
        setChallengeFlipped(false);
        drawBeat(200);
        drawChallenge(200);
      } else {
        // En custom, mantenemos las cartas actuales en pantalla
        // simplemente reiniciamos el timer
        setTimerSeconds(activeChallenge?.timeLimit ? Math.min(activeChallenge.timeLimit, 60) : 60);
      }
      return;
    }

    // --- FLUJO MULTIJUGADOR NORMAL ---
    setBeatFlipped(false);
    setChallengeFlipped(false);
    setActiveBeat(null);
    setActiveChallenge(null);
    setSelectedBeatForTurn(null);
    setSelectedChallengeForTurn(null);

    const nextTurnsPlayed = turnsPlayedInRound + 1;

    // Comprobar si ya jugaron todos los competidores en la ronda actual
    if (nextTurnsPlayed === activeRoundPlayers.length) {
      // Fin de la ronda
      setTurnsPlayedInRound(0);

      // El siguiente jugador inicial de la siguiente ronda será el startingPlayer
      const startIndex = playerNames.indexOf(startingPlayer);
      setCurrentPlayerIndex(startIndex !== -1 ? startIndex : 0);

      if (isReplicaActive) {
        // --- PROCESO EN MODO RÉPLICA ---
        const maxScore = Math.max(...Object.values(currentScores));
        const leaders = Object.keys(currentScores).filter(name => currentScores[name] === maxScore);

        if (leaders.length > 1) {
          // Continúa el empate por el primer lugar, otra ronda de réplica
          setReplicaPlayers(leaders);
          const randomIndex = Math.floor(Math.random() * DEATHMATCH_THEMES.length);
          setReplicaTheme(DEATHMATCH_THEMES[randomIndex]);
          setSubState('replica_announcement');
        } else {
          // Ya hay un ganador indiscutido
          setIsReplicaActive(false);
          setSubState('game_over');
        }
      } else {
        // --- PROCESO EN MODO NORMAL ---
        if (currentRound >= totalRounds) {
          // Fin del total de rondas normales: Evaluar si hay empate por el 1er puesto
          const maxScore = Math.max(...Object.values(currentScores));
          const leaders = Object.keys(currentScores).filter(name => currentScores[name] === maxScore);

          if (leaders.length > 1) {
            // ¡HAY RÉPLICA!
            setIsReplicaActive(true);
            setReplicaPlayers(leaders);
            const randomIndex = Math.floor(Math.random() * DEATHMATCH_THEMES.length);
            setReplicaTheme(DEATHMATCH_THEMES[randomIndex]);
            setSubState('replica_announcement');
          } else {
            // Ganador único de inmediato
            setSubState('game_over');
          }
        } else {
          // Avanzar de ronda
          setCurrentRound(prev => prev + 1);
          setSubState('ready');
        }
      }
    } else {
      // Siguiente jugador en la misma ronda
      setTurnsPlayedInRound(nextTurnsPlayed);
      setCurrentPlayerIndex(prev => (prev + 1) % activeRoundPlayers.length);
      setSubState('ready');
    }
  };

  const handleStartTurn = () => {
    setSubState('playing');
    setActiveCardType('challenge'); // Desafío al frente por defecto
    if (gameSettings?.subMode === 'custom' && selectedBeatForTurn && selectedChallengeForTurn) {
      setActiveBeat(selectedBeatForTurn);
      setActiveChallenge(selectedChallengeForTurn);
      setBeatFlipped(true);
      setChallengeFlipped(true);
    } else {
      drawBeat(1000); // 1.0s delay for turn intro flip
      drawChallenge(1000); // 1.0s delay for turn intro flip
    }
  };

  // Reiniciar partida actual
  const handleResetConfirmed = () => {
    setShowResetConfirm(false);
    setCurrentRound(1);
    setIsReplicaActive(false);
    setReplicaPlayers([]);
    setReplicaTheme(null);
    setTurnsPlayedInRound(0);
    
    // Poner puntuaciones en 0
    const resetScores: Record<string, number> = {};
    playerNames.forEach(name => {
      resetScores[name] = 0;
    });
    setScores(resetScores);

    // Poner jugador inicial
    const startIndex = playerNames.indexOf(startingPlayer);
    setCurrentPlayerIndex(startIndex !== -1 ? startIndex : 0);

    setActiveBeat(null);
    setActiveChallenge(null);
    setSelectedBeatForTurn(null);
    setSelectedChallengeForTurn(null);
    setTimerRunning(false);
    setTimerSeconds(60);
    setBeatFlipped(false);
    setChallengeFlipped(false);
    setSubState('ready');
  };

  // Spotify Link Launcher
  const openSpotify = (beat: BeatCard) => {
    window.open(beat.spotifyUrl, '_blank');
  };

  const startTimer = () => setTimerRunning(true);
  const pauseTimer = () => setTimerRunning(false);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(activeChallenge?.timeLimit ? Math.min(activeChallenge.timeLimit, 60) : 60);
  };

  const renderStars = (count: number) => {
    return (
      <div className="star-rating-display">
        {[1, 2, 3, 4].map((star) => (
          <span key={star} className={`star-item ${star <= count ? 'filled' : 'empty'}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const changeChallengeWithFlip = (newChallenge: ChallengeCard) => {
    setChallengeFlipped(false);
    setTimeout(() => {
      setActiveChallenge(newChallenge);
      setTimeout(() => {
        setChallengeFlipped(true);
      }, 50);
    }, 300);
  };

  const bpmPulseDuration = activeBeat ? 60 / activeBeat.bpm : 0.67;

  // Ordenar puntuaciones para la tabla y el podio
  const sortedLeaderboard = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  // Calcular puestos (rangos) teniendo en cuenta empates matemáticos
  let currentRank = 1;
  const ranksList = sortedLeaderboard.map(([name, points], index) => {
    if (index > 0 && points < sortedLeaderboard[index - 1][1]) {
      currentRank = index + 1;
    }
    return { name, points, rank: currentRank };
  });

  return (
    <>
      <ConfirmDialog
        isOpen={showBackConfirm}
        title="¿Salir del juego?"
        message="Se perderá el progreso de la partida actual. ¿Querés volver al menú principal?"
        confirmLabel="Sí, salir"
        cancelLabel="Seguir jugando"
        variant="danger"
        onConfirm={() => {
          setShowBackConfirm(false);
          triggerExitToMenu();
        }}
        onCancel={() => setShowBackConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="¿Reiniciar partida?"
        message="Se borrará el puntaje de todos los competidores y volverán al principio del primer turno."
        confirmLabel="Reiniciar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleResetConfirmed}
        onCancel={() => setShowResetConfirm(false)}
      />

      <div className={`game-container ${isExiting ? 'exiting' : ''}`}>
        <div className="grunge-overlay"></div>

        {/* HUD DE CABECERA (Visible excepto en pantalla de carga, réplica o gameover) */}
        {subState !== 'game_over' && subState !== 'replica_announcement' && (
          <div className="game-header">
            <button className="btn-back" onClick={() => setShowBackConfirm(true)}>
              <ArrowLeft size={18} />
              <span>Salir</span>
            </button>

            <div className="turn-indicator glass-panel">
              <div className="turn-label">
                {isReplicaActive ? `RÉPLICA (RONDA ${currentRound})` : `RONDA ${currentRound} / ${mode === 'solo' ? '∞' : totalRounds}`}
              </div>
              <div className="player-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', lineHeight: 1, width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '50%' }}>
                  {(gameSettings?.avatars?.[activePlayer]?.startsWith('/') || gameSettings?.avatars?.[activePlayer]?.startsWith('data:image/')) ? (
                    <img src={gameSettings?.avatars?.[activePlayer]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    gameSettings?.avatars?.[activePlayer] || '🎤'
                  )}
                </span>
                <span>{activePlayer}</span>
              </div>
            </div>

            <button className="btn-reset-game" onClick={() => setShowResetConfirm(true)}>
              <RefreshCw size={16} />
            </button>
          </div>
        )}

        {/* ── 1. READY SCREEN (PREPÁRATE PARA TU TURNO) ────────────────────── */}
        {subState === 'ready' && (
          <div className="ready-screen-content glass-panel glow-teal text-center fade-in">
            <div className="ready-avatar-wrapper">
              <div className="avatar-circle" style={{ fontSize: (gameSettings?.avatars?.[activePlayer]?.startsWith('/') || gameSettings?.avatars?.[activePlayer]?.startsWith('data:image/')) ? '0' : '3rem', overflow: 'hidden' }}>
                {(gameSettings?.avatars?.[activePlayer]?.startsWith('/') || gameSettings?.avatars?.[activePlayer]?.startsWith('data:image/')) ? (
                  <img src={gameSettings?.avatars?.[activePlayer]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  gameSettings?.avatars?.[activePlayer] || '🎙'
                )}
              </div>
            </div>
            
            <span className="ready-round-tag">
              {isReplicaActive ? 'RÉPLICA DE COMBATE' : `PREPÁRATE - RONDA ${currentRound}`}
            </span>
            <h2 className="ready-player-title font-graffiti text-glow-teal">{activePlayer}</h2>
            
            {mode !== 'solo' && (
              <p className="ready-score-hint">
                Puntaje acumulado: <strong className="pink-text">{scores[activePlayer]} pts</strong>
              </p>
            )}

            <p className="ready-description">
              {isReplicaActive 
                ? '¡Esta es la ronda de desempate! Mostrá de qué estás hecho para tomar el primer puesto.'
                : (gameSettings?.subMode === 'custom'
                  ? 'Modo Personalizado: Elegí a mano tu base de rap (Beat) y tu desafío antes de arrancar.'
                  : 'Es tu turno de rimar. Se te asignará un beat aleatorio y una carta de desafío. ¿Listo?')
              }
            </p>

            {gameSettings?.subMode === 'custom' && (
              <div className="custom-setup-selectors">
                <div className="selector-group">
                  <label className="selector-label">1. ELEGÍ TU BEAT</label>
                  <select 
                    className="custom-select beat-select"
                    value={selectedBeatForTurn?.id || ''}
                    onChange={(e) => {
                      const beat = BEATS_DECK.find(b => b.id === e.target.value);
                      setSelectedBeatForTurn(beat || null);
                    }}
                  >
                    <option value="">-- Seleccionar Beat --</option>
                    {BEATS_DECK.map(beat => (
                      <option key={beat.id} value={beat.id}>
                        🎵 {beat.name} ({beat.bpm} BPM)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selector-group">
                  <label className="selector-label">2. ELEGÍ TU DESAFÍO</label>
                  <select 
                    className="custom-select challenge-select"
                    value={selectedChallengeForTurn?.id || ''}
                    onChange={(e) => {
                      const challenge = availableChallenges.find(c => c.id === e.target.value);
                      setSelectedChallengeForTurn(challenge || null);
                    }}
                  >
                    <option value="">-- Seleccionar Desafío --</option>
                    {availableChallenges.map(c => (
                      <option key={c.id} value={c.id}>
                        🃏 [{c.category.toUpperCase()}] {c.title || (c.category === 'palabras' ? 'Palabras' : c.description.substring(0, 30) + '...')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button 
              className={`btn-comenzar-turno pulse-teal-anim ${(gameSettings?.subMode === 'custom' && (!selectedBeatForTurn || !selectedChallengeForTurn)) ? 'disabled-btn' : ''}`} 
              onClick={handleStartTurn}
              disabled={gameSettings?.subMode === 'custom' && (!selectedBeatForTurn || !selectedChallengeForTurn)}
            >
              <Play size={20} fill="currentColor" />
              <span>{gameSettings?.subMode === 'custom' ? 'ARRANCAR TURNO' : 'COMENZAR TURNO'}</span>
            </button>
          </div>
        )}

        {/* ── 2. GAMEPLAY ZONE ────────────────────────────────────────────── */}
        {subState === 'playing' && (
          <>
            <div className="game-board-carousel-wrapper">
              {/* Botón Flecha Izquierda */}
              <button 
                type="button"
                className="btn-carousel-nav left"
                onClick={() => setActiveCardType(activeCardType === 'challenge' ? 'beat' : 'challenge')}
                title="Cambiar de carta"
              >
                <ChevronLeft size={28} />
              </button>

              <div className="card-stack-carousel">
                {/* 1. CARTA DE DESAFÍO (ESTILO DE JUEGO) */}
                <div 
                  className={`carousel-card-wrapper ${activeCardType === 'challenge' ? 'front-card' : 'back-card'}`}
                  onClick={() => {
                    if (activeCardType !== 'challenge') {
                      setActiveCardType('challenge');
                    }
                  }}
                >
                  <h3 className="carousel-card-tag pink-text">Desafío (Estilo de Juego)</h3>
                  {!activeChallenge ? (
                    <div className="deck-pile challenge-pile glass-panel glow-pink" onClick={() => drawChallenge(400)}>
                      <div className="deck-card-back" style={{ backgroundImage: 'url("/images/dorso_desafio.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                      </div>
                      <div className="stacked-card card-1"></div>
                      <div className="stacked-card card-2"></div>
                    </div>
                  ) : (
                    <div className="card-container-3d">
                      <div className={`card-inner-3d ${challengeFlipped ? 'flipped' : ''}`}>
                        <div className="card-face card-back glow-pink" style={{ backgroundImage: 'url("/images/dorso_desafio.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderColor: 'var(--neon-pink)' }}>
                        </div>

                        <div className="card-face card-front glow-teal" style={{ borderColor: 'var(--neon-teal)', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          {activeChallenge.imageUrl ? (
                            <div className="image-challenge-card-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                              <img 
                                src={activeChallenge.imageUrl} 
                                alt={activeChallenge.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                              />
                              
                              {activeChallenge.category === 'beatbox' && (
                                <div className="timer-overlay" style={{
                                  position: 'absolute',
                                  bottom: '20px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '90%',
                                  zIndex: 10
                                }}>
                                  <div className="timer-widget glass-panel" style={{ margin: 0, padding: '10px', background: 'rgba(15, 16, 21, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className={`timer-display ${timerSeconds <= 10 && timerRunning ? 'critical-time' : ''}`} style={{ marginBottom: '8px' }}>
                                      <span className="timer-digits" style={{ fontSize: '1.4rem' }}>
                                        {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                                      </span>
                                    </div>

                                    <div className="timer-controls" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      {!timerRunning ? (
                                        <button className="timer-btn btn-play-timer" onClick={(e) => { e.stopPropagation(); startTimer(); }} style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <Play size={10} fill="currentColor" /> Iniciar
                                        </button>
                                      ) : (
                                        <button className="timer-btn btn-pause-timer" onClick={(e) => { e.stopPropagation(); pauseTimer(); }} style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <Pause size={10} fill="currentColor" /> Pausar
                                        </button>
                                      )}
                                      <button className="timer-btn btn-reset-timer" onClick={(e) => { e.stopPropagation(); resetTimer(); }} style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Square size={8} fill="currentColor" /> Reset
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {activeChallenge.category === 'palabras' && (
                                <button
                                  className="btn-variar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const palabrasCards = CHALLENGES_DECK.filter(c => c.category === 'palabras' && c.id !== activeChallenge.id);
                                    if (palabrasCards.length > 0) {
                                      const next = palabrasCards[Math.floor(Math.random() * palabrasCards.length)];
                                      changeChallengeWithFlip(next);
                                    }
                                  }}
                                  style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 10,
                                    padding: '8px 16px',
                                    fontSize: '0.8rem',
                                    background: 'rgba(15, 16, 21, 0.85)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid var(--neon-teal)',
                                    borderRadius: '20px',
                                    color: 'var(--neon-teal)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <RefreshCw size={12} />
                                  <span>Más palabras</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className={`card-pattern-overlay challenge-pattern ${activeChallenge.category}`}></div>

                              <div className={`card-header-teal category-${activeChallenge.category}`}>
                                <Sparkles size={14} />
                                <span>{activeChallenge.category.toUpperCase()}</span>
                              </div>

                              <div className="challenge-card-body">
                                {activeChallenge.category === 'palabras' && (
                                  <div className="words-challenge-layout-new">
                                    <div className="words-grid-8">
                                      {activeChallenge.wordsTop?.map((w, idx) => (
                                        <span key={idx} className="word-badge-8 pink-glow-text">{w}</span>
                                      ))}
                                    </div>
                                    <div className="words-variar-divider">
                                      <button
                                        className="btn-variar"
                                        onClick={() => {
                                          const palabrasCards = CHALLENGES_DECK.filter(c => c.category === 'palabras' && c.id !== activeChallenge.id);
                                          if (palabrasCards.length > 0) {
                                            const next = palabrasCards[Math.floor(Math.random() * palabrasCards.length)];
                                            changeChallengeWithFlip(next);
                                          }
                                        }}
                                      >
                                        <RefreshCw size={14} />
                                        <span>Más palabras</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {activeChallenge.category === 'beatbox' && (
                                  <div className="beatbox-challenge-layout">
                                    <h3 className="challenge-main-title">{activeChallenge.title}</h3>
                                    <p className="challenge-desc-text">{activeChallenge.description}</p>

                                    <div className="beatbox-keyword-box">
                                      <span className="keyword-label">TEMÁTICA:</span>
                                      <h4 className="keyword-highlight">{activeChallenge.highlightText}</h4>
                                    </div>

                                    <div className="timer-widget glass-panel">
                                      <div className={`timer-display ${timerSeconds <= 10 && timerRunning ? 'critical-time' : ''}`}>
                                        <span className="timer-digits">
                                          {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>

                                      <div className="timer-controls">
                                        {!timerRunning ? (
                                          <button className="timer-btn btn-play-timer" onClick={startTimer}>
                                            <Play size={14} fill="currentColor" /> Iniciar
                                          </button>
                                        ) : (
                                          <button className="timer-btn btn-pause-timer" onClick={pauseTimer}>
                                            <Pause size={14} fill="currentColor" /> Pausar
                                          </button>
                                        )}
                                        <button className="timer-btn btn-reset-timer" onClick={resetTimer}>
                                          <Square size={12} fill="currentColor" /> Reset
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {activeChallenge.category !== 'palabras' && activeChallenge.category !== 'beatbox' && (
                                  <div className="standard-challenge-layout">
                                    <h3 className="challenge-main-title">{activeChallenge.title}</h3>
                                    <p className="challenge-desc-text">{activeChallenge.description}</p>

                                    <div className="concept-large-box">
                                      <h4 className="concept-large-text pink-glow-text">
                                        {activeChallenge.highlightText}
                                      </h4>
                                    </div>

                                    <div className="street-sticker">
                                      <span>FREESTYLE RULE</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="challenge-card-footer">
                                <span className="card-brand">BARRZJUEGO ©</span>
                              </div>
                            </>
                          )}

                          {gameSettings?.subMode !== 'custom' && (
                            <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawChallenge(400); }}>
                              <RefreshCw size={12} /> Cambiar Desafío
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CARTA DE BEAT (MÚSICA) */}
                <div 
                  className={`carousel-card-wrapper ${activeCardType === 'beat' ? 'front-card' : 'back-card'}`}
                  onClick={() => {
                    if (activeCardType !== 'beat') {
                      setActiveCardType('beat');
                    }
                  }}
                >
                  <h3 className="carousel-card-tag teal-text">Beat (Instrumental)</h3>
                  {!activeBeat ? (
                    <div className="deck-pile beat-pile glass-panel glow-teal" onClick={() => drawBeat(400)}>
                      <div className="deck-card-back" style={{ backgroundImage: 'url("/images/dorso_beat.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                      </div>
                      <div className="stacked-card card-1"></div>
                      <div className="stacked-card card-2"></div>
                    </div>
                  ) : (
                    <div className="card-container-3d">
                      <div className={`card-inner-3d ${beatFlipped ? 'flipped' : ''}`}>
                        <div className="card-face card-back glow-teal" style={{ backgroundImage: 'url("/images/dorso_beat.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderColor: 'var(--neon-teal)' }}>
                        </div>

                        <div className="card-face card-front glow-pink" style={{ borderColor: 'var(--neon-pink)' }}>
                          <div className="card-pattern-overlay beats-pattern"></div>

                          <div className="card-header-pink">
                            <Music size={16} />
                            <span>INST. BEAT</span>
                            <button 
                              type="button" 
                              className={`btn-spotify-card-toggle ${showSpotifyPlayer ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setShowSpotifyPlayer(!showSpotifyPlayer); }}
                              title="Alternar Reproductor Spotify"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.31c-.22.36-.68.48-1.04.26-2.91-1.78-6.58-2.18-10.9-1.2-.42.09-.83-.17-.92-.59-.09-.41.17-.83.59-.92 4.73-1.08 8.78-.62 12.01 1.36.36.21.48.67.26 1.09zm1.46-3.26c-.28.45-.87.6-1.32.32-3.33-2.05-8.41-2.65-12.35-1.45-.51.15-1.04-.14-1.2-.66-.15-.51.14-1.04.66-1.2 4.51-1.37 10.12-.7 13.9 1.63.45.27.6.86.31 1.36zm.1-3.38C15.2 8.35 8.86 8.14 5.17 9.26c-.57.17-1.16-.16-1.33-.73-.17-.57.16-1.16.73-1.33 4.23-1.28 11.23-1.04 15.67 1.59.51.3 1.17.47 1.47-.04.3-.51.13-1.17-.38-1.47z"/>
                              </svg>
                            </button>
                          </div>

                          {showSpotifyPlayer ? (
                            <div className="spotify-card-overlay fade-in">
                              <div className="spotify-overlay-header">
                                <div className="spotify-api-badge">
                                  <span className={`pulse-dot ${spotifyPlaying ? 'pulsing' : ''}`}></span>
                                  <span>SPOTIFY PREMIUM API</span>
                                </div>
                                <span className="spotify-stream-indicator">
                                  {isSpotifyLinked ? '✓ Cuenta Vinculada' : '⚠ Cuenta No Vinculada'}
                                </span>
                              </div>

                              <div className="spotify-overlay-body">
                                <div className={`spotify-vinyl-container ${spotifyPlaying ? 'spinning' : ''}`}>
                                  <div className="spotify-vinyl-disc">
                                    <div className="spotify-vinyl-center"></div>
                                  </div>
                                </div>

                                <h3 className="spotify-overlay-title">{activeBeat.name}</h3>
                                <span className="spotify-overlay-artist font-base">BARRZ PRODUCER</span>
                              </div>

                              <div className="spotify-overlay-footer">
                                <div className="spotify-progress-container">
                                  <span className="spotify-time font-base">
                                    {Math.floor(spotifyProgress / 60)}:{(spotifyProgress % 60).toString().padStart(2, '0')}
                                  </span>
                                  {(() => {
                                    const isFreestyleLibre = activeChallenge?.id === 'challenge-tematicas-libre';
                                    const limit = isFreestyleLibre ? 180 : 60;
                                    const limitStr = isFreestyleLibre ? '3:00' : '1:00';
                                    return (
                                      <>
                                        <div className="spotify-progress-bar-wrap">
                                          <div 
                                            className="spotify-progress-bar-fill" 
                                            style={{ width: `${(spotifyProgress / limit) * 100}%` }}
                                          ></div>
                                        </div>
                                        <span className="spotify-time font-base">{limitStr}</span>
                                      </>
                                    );
                                  })()}
                                </div>

                                <div className="spotify-controls">
                                  <button type="button" className="spotify-btn-sub" title="Aleatorio">
                                    <span style={{ fontSize: '1rem', color: '#1DB954' }}>⇄</span>
                                  </button>
                                  <button type="button" className="spotify-btn-sub" title="Anterior">
                                    <span style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>⏮</span>
                                  </button>
                                  <button 
                                    type="button" 
                                    className={`spotify-btn-play-pause ${spotifyPlaying ? 'playing' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setSpotifyPlaying(!spotifyPlaying); }}
                                    title={spotifyPlaying ? 'Pausar' : 'Reproducir'}
                                  >
                                    {spotifyPlaying ? '⏸' : '▶'}
                                  </button>
                                  <button type="button" className="spotify-btn-sub" title="Siguiente">
                                    <span style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>⏭</span>
                                  </button>
                                  <button type="button" className="spotify-btn-sub" title="Repetir">
                                    <span style={{ fontSize: '1rem' }}>↻</span>
                                  </button>
                                </div>

                                <div className="spotify-monetization-msg">
                                  {isSpotifyLinked ? (
                                    <span className="monetized font-base">✓ Monetizando rimas (Streaming activo)</span>
                                  ) : (
                                    <span className="not-monetized font-base">⚠ Conectá Spotify para sumar reproducciones</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="beat-card-body">
                                <h3 className="beat-title">{activeBeat.name}</h3>

                                <div
                                  className={`bpm-indicator ${isMetronomeOn ? 'pulsing' : ''}`}
                                  style={{
                                    animationDuration: `${bpmPulseDuration}s`,
                                    borderColor: 'var(--neon-teal)'
                                  }}
                                  onClick={(e) => { e.stopPropagation(); setIsMetronomeOn(!isMetronomeOn); }}
                                >
                                  <Volume2 size={36} className="teal-text" />
                                  <span className="bpm-number">{activeBeat.bpm}</span>
                                  <span className="bpm-label">BPM</span>
                                </div>

                                <p className="bpm-help-text">El altavoz pulsa al ritmo de la instrumental.</p>
                              </div>

                              <div className="beat-card-footer">
                                <div className="qr-container-sim" onClick={(e) => { e.stopPropagation(); openSpotify(activeBeat); }}>
                                  <QrCode size={48} className="pink-text" />
                                  <span className="qr-scan-label">CLICK PARA ABRIR</span>
                                </div>

                                <button className="btn-spotify-link" onClick={(e) => { e.stopPropagation(); openSpotify(activeBeat); }}>
                                  <Play size={14} fill="currentColor" />
                                  ABRIR EN SPOTIFY
                                </button>
                              </div>
                            </>
                          )}

                          {gameSettings?.subMode !== 'custom' && (
                            <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawBeat(400); }}>
                              <RefreshCw size={12} /> Cambiar Beat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Flecha Derecha */}
              <button 
                type="button"
                className="btn-carousel-nav right"
                onClick={() => setActiveCardType(activeCardType === 'challenge' ? 'beat' : 'challenge')}
                title="Cambiar de carta"
              >
                <ChevronRight size={28} />
              </button>
            </div>

            {/* Acciones de Footer */}
            <div className="game-footer-actions">
              <button
                className={`btn-next-turn ${(activeChallenge && activeBeat) ? 'pulse-pink-anim' : ''}`}
                onClick={handleFinishImprovisation}
                disabled={!activeChallenge || !activeBeat}
              >
                <span>
                  {(!activeChallenge || !activeBeat) 
                    ? 'Revisá ambas cartas' 
                    : (mode === 'solo' ? 'Siguiente Turno' : 'Terminar Turno')
                  }
                </span>
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>
          </>
        )}

        {/* ── 3. SCORING PANEL (PUNTUAR AL COMPETIDOR) ────────────────────── */}
        {subState === 'scoring' && (
          <div className="scoring-screen-content glass-panel glow-pink text-center fade-in">

            <h2 className="scoring-title font-graffiti">TURNO DE VOTAR</h2>

            <div className={`voter-scoring-transition-wrapper ${isVoterFading ? 'fading-out' : 'fading-in'}`}>
              <div className="voter-badge-container">
                <span className="voter-label font-base">Le toca votar a:</span>
                <div className="voter-name-badge pulse-teal-anim" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '50%' }}>
                    {(gameSettings?.avatars?.[currentVoter]?.startsWith('/') || gameSettings?.avatars?.[currentVoter]?.startsWith('data:image/')) ? (
                      <img src={gameSettings?.avatars?.[currentVoter]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      gameSettings?.avatars?.[currentVoter] || '🎤'
                    )}
                  </span>
                  <span>{currentVoter}</span>
                </div>
              </div>
              
              <p className="scoring-player-prompt">
                Puntúa la improvisación de <strong className="teal-text">{activePlayer}</strong> (del 1 al 4):
              </p>

              <div className="voting-options-list">
                {[
                  { value: 1, emoji: '👎', label: 'Flojo', desc: 'Falta práctica', pts: '1 pt' },
                  { value: 2, emoji: '😐', label: 'Regular', desc: 'Se trabó un poco', pts: '2 pts' },
                  { value: 3, emoji: '🔥', label: 'Bueno', desc: 'Buenas métricas', pts: '3 pts' },
                  { value: 4, emoji: '👑', label: 'Excelente', desc: '¡Rima épica!', pts: '4 pts' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`voting-option-btn ${selectedRating === opt.value ? 'selected' : ''}`}
                    onClick={() => setSelectedRating(opt.value)}
                  >
                    <div className="voting-option-left">
                      <span className="voting-option-number">+{opt.value} PTS</span>
                      <span className="voting-option-emoji">{opt.emoji}</span>
                    </div>
                    <div className="voting-option-center">
                      <span className="voting-option-label">{opt.label} - {opt.desc}</span>
                      {renderStars(opt.value)}
                    </div>
                    <span className="voting-option-pts">{opt.pts}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-neon-pink w-100 mt-20 pulse-pink-anim" onClick={handleVoteSubmit}>
              <span>
                {currentVoterIndex < votingPlayers.length - 1 
                  ? `GUARDAR VOTO (${selectedRating} pts)` 
                  : `FINALIZAR VOTACIÓN (+${Object.values(votesReceived).reduce((a,b)=>a+b, 0) + selectedRating} pts)`
                }
              </span>
            </button>
          </div>
        )}

        {/* ── 4. RÉPLICA ANNOUNCEMENT (¡HAY RÉPLICA!) ────────────────────────── */}
        {subState === 'replica_announcement' && (
          <div className="replica-screen-content glass-panel glow-red text-center fade-in">
            <div className="ready-avatar-wrapper">
              <div className="avatar-circle" style={{ borderColor: '#ff3333', boxShadow: '0 0 15px rgba(255, 51, 51, 0.4)' }}>💀</div>
            </div>

            <span className="replica-round-tag">¡EMPATE DE TITANES!</span>
            <h2 className="replica-title">¡RÉPLICA DE {replicaPlayers.length} COMPETIDORES!</h2>
            
            <div className="replica-versus-box">
              <div className="replica-versus-names">
                {replicaPlayers.map((name, idx) => (
                  <React.Fragment key={name}>
                    {idx > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>VS</span>}
                    <span style={{ color: '#ff3333', textShadow: '0 0 8px rgba(255, 51, 51, 0.3)' }}>{name}</span>
                  </React.Fragment>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                Se jugará una ronda extra en formato <strong>Deathmatch</strong>. Todos los empatados deberán improvisar sobre la misma temática.
              </p>
            </div>

            {replicaTheme && (
              <div className="replica-theme-card text-center">
                <span className="replica-theme-badge">DEATHMATCH</span>
                <h3 className="replica-theme-title">{replicaTheme.title}</h3>
                <p className="replica-theme-desc">{replicaTheme.desc}</p>
                <div className="replica-theme-highlight-box">
                  {replicaTheme.highlight}
                </div>
              </div>
            )}

            <button className="btn-deathmatch" onClick={() => {
              setCurrentRound(prev => prev + 1);
              setCurrentPlayerIndex(0);
              setSubState('ready');
            }}>
              <span>INICIAR DEATHMATCH</span>
            </button>
          </div>
        )}

        {/* ── 5. GAME OVER (PODIO Y RESULTADOS) ───────────────────────────── */}
        {subState === 'game_over' && (
          <div className="gameover-screen-content glass-panel glow-pink text-center fade-in">
            <div className="gameover-logo-container">
              <img src="/Barrzjuego.png" alt="BARRZ" className="gameover-logo-img" />
            </div>
            <h1 className="gameover-main-title font-accent text-glow-pink">FIN DE LA BATALLA</h1>
            <p className="gameover-subtitle">Tabla final de puntuaciones y campeones.</p>

            {/* PODIO VISUAL DINÁMICO CON EMPATES */}
            <div className="podium-container">
              {/* 2do Puesto / Slot Izquierdo */}
              {ranksList[1] && (
                <div className="podium-step step-second fade-in">
                  {ranksList[1].rank === 1 && <span className="winner-trophy">👑</span>}
                  <span className="podium-rank">{ranksList[1].rank}</span>
                  <span className={`podium-name ${ranksList[1].rank === 1 ? 'pink-text' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    {(gameSettings?.avatars?.[ranksList[1].name]?.startsWith('/') || gameSettings?.avatars?.[ranksList[1].name]?.startsWith('data:image/')) ? (
                      <img src={gameSettings?.avatars?.[ranksList[1].name]} alt="" style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{gameSettings?.avatars?.[ranksList[1].name] || '🎤'}</span>
                    )}
                    <span>{ranksList[1].name}</span>
                  </span>
                  <span className="podium-score">{ranksList[1].points} pts</span>
                  <div className={`podium-pillar ${ranksList[1].rank === 1 ? 'pillar-first glow-pink' : 'pillar-second'}`}>
                    <User size={32} className="podium-pillar-icon" />
                  </div>
                </div>
              )}

              {/* 1er Puesto / Slot Central */}
              {ranksList[0] && (
                <div className="podium-step step-first fade-in">
                  <span className="winner-trophy">👑</span>
                  <span className="podium-rank">{ranksList[0].rank}</span>
                  <span className="podium-name pink-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    {(gameSettings?.avatars?.[ranksList[0].name]?.startsWith('/') || gameSettings?.avatars?.[ranksList[0].name]?.startsWith('data:image/')) ? (
                      <img src={gameSettings?.avatars?.[ranksList[0].name]} alt="" style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{gameSettings?.avatars?.[ranksList[0].name] || '🎤'}</span>
                    )}
                    <span>{ranksList[0].name}</span>
                  </span>
                  <span className="podium-score">{ranksList[0].points} pts</span>
                  <div className="podium-pillar pillar-first glow-pink">
                    <User size={40} className="podium-pillar-icon first-place" />
                  </div>
                </div>
              )}

              {/* 3er Puesto / Slot Derecho */}
              {ranksList[2] && (
                <div className="podium-step step-third fade-in">
                  {ranksList[2].rank === 1 && <span className="winner-trophy">👑</span>}
                  <span className="podium-rank">{ranksList[2].rank}</span>
                  <span className={`podium-name ${ranksList[2].rank === 1 ? 'pink-text' : ranksList[2].rank === 2 ? 'teal-text' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    {(gameSettings?.avatars?.[ranksList[2].name]?.startsWith('/') || gameSettings?.avatars?.[ranksList[2].name]?.startsWith('data:image/')) ? (
                      <img src={gameSettings?.avatars?.[ranksList[2].name]} alt="" style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{gameSettings?.avatars?.[ranksList[2].name] || '🎤'}</span>
                    )}
                    <span>{ranksList[2].name}</span>
                  </span>
                  <span className="podium-score">{ranksList[2].points} pts</span>
                  <div className={`podium-pillar ${
                    ranksList[2].rank === 1 
                      ? 'pillar-first glow-pink' 
                      : ranksList[2].rank === 2 
                        ? 'pillar-second' 
                        : 'pillar-third'
                  }`}>
                    <User size={28} className="podium-pillar-icon" />
                  </div>
                </div>
              )}
            </div>

            {/* TABLA DE DETALLES COMPLETA */}
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rango</th>
                    <th>Competidor</th>
                    <th>Puntos Totales</th>
                  </tr>
                </thead>
                <tbody>
                  {ranksList.map(({ name, points, rank }) => (
                    <tr key={name} className={rank === 1 ? 'winner-row' : ''}>
                      <td>#{rank}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        {(gameSettings?.avatars?.[name]?.startsWith('/') || gameSettings?.avatars?.[name]?.startsWith('data:image/')) ? (
                          <img src={gameSettings?.avatars?.[name]} alt="" style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ marginRight: '8px' }}>{gameSettings?.avatars?.[name] || '🎤'}</span>
                        )}
                        <span>{name}</span>
                      </td>
                      <td><strong>{points}</strong> pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acciones de reinicio */}
            <div className="gameover-actions-row">
              <button 
                className="btn-gameover btn-replay"
                onClick={() => {
                  // Repetir misma partida (resetear scores y rondas)
                  const resetScores: Record<string, number> = {};
                  playerNames.forEach(name => {
                    resetScores[name] = 0;
                  });
                  setScores(resetScores);
                  setCurrentRound(1);
                  setIsReplicaActive(false);
                  setReplicaPlayers([]);
                  setTurnsPlayedInRound(0);
                  const startIndex = playerNames.indexOf(startingPlayer);
                  setCurrentPlayerIndex(startIndex !== -1 ? startIndex : 0);
                  setActiveBeat(null);
                  setActiveChallenge(null);
                  setSubState('ready');
                }}
              >
                <RotateCcw size={16} />
                <span>REPETIR COMBATE</span>
              </button>

              <button className="btn-gameover btn-exit-menu" onClick={triggerExitToMenu}>
                <Home size={16} />
                <span>VOLVER AL MENÚ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
