import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, RotateCw, Play, Pause, Square, Music, QrCode, Sparkles, User, SkipForward, Star, Award, Home, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import { ConfirmDialog } from './ConfirmDialog';
import './Game.css';

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
  gameSettings?: {
    mode: 'solo' | 'multiplayer';
    players: string[];
    avatars?: Record<string, string>;
    roundsCount: number;
    selectedCategories: string[];
    startingPlayer: string;
  };
}

export const Game: React.FC<GameProps> = ({ onBackToMenu, gameSettings }) => {
  // Configuración del juego (valores de props o valores por defecto)
  const mode = gameSettings?.mode || 'multiplayer';
  const playerNames = gameSettings?.players || ['Freestyler A', 'Freestyler B'];
  const totalRounds = gameSettings?.roundsCount || 5;
  const categories = gameSettings?.selectedCategories || [
    'palabras',
    'tematicas',
    'cypher',
    'terminaciones',
    'beatbox',
    '1v1',
    'sacrificio'
  ];
  const startingPlayer = gameSettings?.startingPlayer || playerNames[0];

  // Estados de control de la partida
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  
  // Puntuación de los jugadores
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initialScores: Record<string, number> = {};
    playerNames.forEach(name => {
      initialScores[name] = 0;
    });
    return initialScores;
  });

  // Estados de sub-pantallas del juego: 'ready' | 'playing' | 'scoring' | 'replica_announcement' | 'game_over'
  const [subState, setSubState] = useState<'ready' | 'playing' | 'scoring' | 'replica_announcement' | 'game_over'>('ready');
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

  // Cartas activas
  const [activeBeat, setActiveBeat] = useState<BeatCard | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeCard | null>(null);
  const [activeCardType, setActiveCardType] = useState<'challenge' | 'beat'>('challenge');
  const [replicaTheme, setReplicaTheme] = useState<{ title: string; desc: string; highlight: string } | null>(null);

  // Estados de animación de cartas
  const [beatFlipped, setBeatFlipped] = useState(false);
  const [challengeFlipped, setChallengeFlipped] = useState(false);
  const [wordsRotated, setWordsRotated] = useState(false);

  // Animación de salida global
  const [isExiting, setIsExiting] = useState(false);

  // Diálogos de confirmación
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Temporizador para desafíos
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Metrónomo visual
  const [isMetronomeOn, setIsMetronomeOn] = useState(true);

  // Filtrar cartas de desafíos por categorías seleccionadas
  const filteredChallenges = CHALLENGES_DECK.filter(card => categories.includes(card.category));
  const availableChallenges = filteredChallenges.length > 0 ? filteredChallenges : CHALLENGES_DECK;

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

  // Simulador de barra de progreso de Spotify
  useEffect(() => {
    let interval: any = null;
    if (spotifyPlaying && subState === 'playing') {
      interval = setInterval(() => {
        setSpotifyProgress(prev => {
          if (prev >= 90) return 0;
          return prev + 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [spotifyPlaying, subState]);

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
      setTimerSeconds(activeChallenge.timeLimit);
      setTimerRunning(false);
    } else {
      setTimerRunning(false);
      setTimerSeconds(90);
    }
    setWordsRotated(false);
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
        advanceTurn(newScores);
        setIsVoterFading(false);
      }
    }, 250); // 250ms fade-out transition
  };

  // Avanzar turno, evaluar empates / réplicas o finalizar
  const advanceTurn = (currentScores: Record<string, number>) => {
    setBeatFlipped(false);
    setChallengeFlipped(false);
    setActiveBeat(null);
    setActiveChallenge(null);

    // Comprobar si era el último jugador de la lista activa en esta ronda
    if (currentPlayerIndex === activeRoundPlayers.length - 1) {
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
          // Avanzar de ronda y volver al primer jugador
          setCurrentRound(prev => prev + 1);
          setCurrentPlayerIndex(0);
          setSubState('ready');
        }
      }
    } else {
      // Siguiente jugador en la misma ronda
      setCurrentPlayerIndex(prev => prev + 1);
      setSubState('ready');
    }
  };

  const handleStartTurn = () => {
    setSubState('playing');
    setActiveCardType('challenge'); // Desafío al frente por defecto
    drawBeat(1000); // 1.0s delay for turn intro flip
    drawChallenge(1000); // 1.0s delay for turn intro flip
  };

  // Reiniciar partida actual
  const handleResetConfirmed = () => {
    setShowResetConfirm(false);
    setCurrentRound(1);
    setIsReplicaActive(false);
    setReplicaPlayers([]);
    setReplicaTheme(null);
    
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
    setTimerRunning(false);
    setTimerSeconds(90);
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
    setTimerSeconds(activeChallenge?.timeLimit || 90);
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
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{gameSettings?.avatars?.[activePlayer] || '🎤'}</span>
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
              <div className="avatar-circle" style={{ fontSize: '3rem' }}>{gameSettings?.avatars?.[activePlayer] || '🎙'}</div>
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
                : 'Es tu turno de rimar. Se te asignará un beat aleatorio y una carta de desafío. ¿Listo?'
              }
            </p>

            <button className="btn-comenzar-turno pulse-teal-anim" onClick={handleStartTurn}>
              <Play size={20} fill="currentColor" />
              <span>COMENZAR TURNO</span>
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
                      <div className="deck-card-back pink-bg">
                        <span className="card-logo-text teal-glow-text">DESAFIOS</span>
                        <span className="tap-instruction">TOCAR PARA SACAR</span>
                      </div>
                      <div className="stacked-card card-1"></div>
                      <div className="stacked-card card-2"></div>
                    </div>
                  ) : (
                    <div className="card-container-3d">
                      <div className={`card-inner-3d ${challengeFlipped ? 'flipped' : ''}`}>
                        <div className="card-face card-back glow-pink" style={{ borderColor: 'var(--neon-pink)' }}>
                          <img src="/Barrzjuego.png" alt="BARRZ Logo" className="card-back-logo" />
                          <span className="card-logo-text teal-glow-text">DESAFIOS</span>
                        </div>

                        <div className="card-face card-front glow-teal" style={{ borderColor: 'var(--neon-teal)' }}>
                          <div className={`card-pattern-overlay challenge-pattern ${activeChallenge.category}`}></div>

                          <div className={`card-header-teal category-${activeChallenge.category}`}>
                            <Sparkles size={14} />
                            <span>{activeChallenge.category.toUpperCase()}</span>
                          </div>

                          <div className="challenge-card-body">
                            {activeChallenge.category === 'palabras' && (
                              <div className={`words-challenge-layout ${wordsRotated ? 'rotated-180' : ''}`}>
                                <div className="words-side top-side">
                                  <span className="words-direction-label">TU TURNO:</span>
                                  <div className="words-grid">
                                    {activeChallenge.wordsTop?.map((w, idx) => (
                                      <span key={idx} className="word-badge pink-glow-text">{w}</span>
                                    ))}
                                  </div>
                                </div>

                                <div className="words-divider">
                                  <button className="btn-rotate-words" onClick={() => setWordsRotated(!wordsRotated)}>
                                    <RotateCw size={16} />
                                    <span>GIRAR CARTA</span>
                                  </button>
                                </div>

                                <div className="words-side bottom-side">
                                  <span className="words-direction-label">RIVAL (OPONENTE):</span>
                                  <div className="words-grid">
                                    {activeChallenge.wordsBottom?.map((w, idx) => (
                                      <span key={idx} className="word-badge teal-glow-text">{w}</span>
                                    ))}
                                  </div>
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

                          <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawChallenge(400); }}>
                            <RefreshCw size={12} /> Cambiar Desafío
                          </button>
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
                      <div className="deck-card-back teal-bg">
                        <span className="card-logo-text pink-glow-text">BEATS</span>
                        <span className="tap-instruction">TOCAR PARA SACAR</span>
                      </div>
                      <div className="stacked-card card-1"></div>
                      <div className="stacked-card card-2"></div>
                    </div>
                  ) : (
                    <div className="card-container-3d">
                      <div className={`card-inner-3d ${beatFlipped ? 'flipped' : ''}`}>
                        <div className="card-face card-back glow-teal" style={{ borderColor: 'var(--neon-teal)' }}>
                          <img src="/Barrzjuego.png" alt="BARRZ Logo" className="card-back-logo" />
                          <span className="card-logo-text pink-glow-text">BEATS</span>
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
                                  <div className="spotify-progress-bar-wrap">
                                    <div 
                                      className="spotify-progress-bar-fill" 
                                      style={{ width: `${(spotifyProgress / 90) * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="spotify-time font-base">1:30</span>
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

                          <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawBeat(400); }}>
                            <RefreshCw size={12} /> Cambiar Beat
                          </button>
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
            <div className="medal-icon-wrapper">
              <Award size={48} className="pink-text" />
            </div>

            <span className="scoring-tag">VOTACIÓN DE JUGADORES</span>
            <h2 className="scoring-title font-graffiti">TURNO DE VOTAR</h2>

            <div className={`voter-scoring-transition-wrapper ${isVoterFading ? 'fading-out' : 'fading-in'}`}>
              <div className="voter-badge-container">
                <span className="voter-label font-base">Le toca votar a:</span>
                <div className="voter-name-badge pulse-teal-anim" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{gameSettings?.avatars?.[currentVoter] || '🎤'}</span>
                  <span>{currentVoter}</span>
                </div>
              </div>
              
              <p className="scoring-player-prompt">
                Puntúa la improvisación de <strong className="teal-text">{activePlayer}</strong> (del 1 al 4):
              </p>

              {/* Estrellas interactivas 1-4 */}
              <div className="stars-rating-container">
                {[1, 2, 3, 4].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${star <= selectedRating ? 'active' : ''}`}
                    onClick={() => setSelectedRating(star)}
                  >
                    <Star size={36} fill={star <= selectedRating ? 'var(--neon-pink)' : 'none'} />
                  </button>
                ))}
              </div>

              <div className="rating-desc-pill">
                {selectedRating === 1 && '👎 Flojo - Falta práctica'}
                {selectedRating === 2 && '😐 Regular - Se trabó un poco'}
                {selectedRating === 3 && '🔥 Bueno - Buenas métricas'}
                {selectedRating === 4 && '👑 Excelente - ¡Rima épica!'}
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
            <h1 className="gameover-main-title font-accent text-glow-pink">FIN DE LA BATALLA</h1>
            <p className="gameover-subtitle">Tabla final de puntuaciones y campeones.</p>

            {/* PODIO VISUAL DINÁMICO CON EMPATES */}
            <div className="podium-container">
              {/* 2do Puesto / Slot Izquierdo */}
              {ranksList[1] && (
                <div className="podium-step step-second fade-in">
                  {ranksList[1].rank === 1 && <span className="winner-trophy">👑</span>}
                  <span className="podium-rank">{ranksList[1].rank}</span>
                  <span className={`podium-name ${ranksList[1].rank === 1 ? 'pink-text' : ''}`}>
                    <span style={{ marginRight: '6px' }}>{gameSettings?.avatars?.[ranksList[1].name] || '🎤'}</span>
                    {ranksList[1].name}
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
                  <span className="podium-name pink-text">
                    <span style={{ marginRight: '6px' }}>{gameSettings?.avatars?.[ranksList[0].name] || '🎤'}</span>
                    {ranksList[0].name}
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
                  <span className={`podium-name ${ranksList[2].rank === 1 ? 'pink-text' : ranksList[2].rank === 2 ? 'teal-text' : ''}`}>
                    <span style={{ marginRight: '6px' }}>{gameSettings?.avatars?.[ranksList[2].name] || '🎤'}</span>
                    {ranksList[2].name}
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
                      <td>
                        <span style={{ marginRight: '8px' }}>{gameSettings?.avatars?.[name] || '🎤'}</span>
                        {name}
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
