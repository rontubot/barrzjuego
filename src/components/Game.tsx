import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Play, Pause, Square, Music, Sparkles, User, SkipForward, Home, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import { ConfirmDialog } from './ConfirmDialog';
import { spotifyPlayer } from '../services/spotifyPlayer';
import { useI18n } from '../i18n/LanguageContext';
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
  const { t } = useI18n();
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

  // Registro detallado de turnos jugados
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

  // Lista de competidores activos en la ronda actual (en réplica solo participan los empatados)
  const activeRoundPlayers = isReplicaActive ? replicaPlayers : playerNames;
  const activePlayer = activeRoundPlayers[currentPlayerIndex] || activeRoundPlayers[0];
  const votingPlayers = playerNames.filter(name => name !== activePlayer);
  const currentVoter = votingPlayers[currentVoterIndex] || 'Votante';

  // Helper de animación de salida para volver al menú
  const triggerExitToMenu = () => {
    spotifyPlayer.pause();
    setIsExiting(true);
    setTimeout(() => {
      onBackToMenu();
    }, 450);
  };

  // Reproducir automáticamente el beat si el reproductor está listo
  useEffect(() => {
    if (activeBeat && spotifyPlayer.isPlayerReady() && subState === 'playing') {
      spotifyPlayer.playTrack(activeBeat.spotifyUri);
    }
  }, [activeBeat, subState]);

  // Manejador del temporizador
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  useEffect(() => {
    if (subState === 'game_over' && onGameSaved) {
      onGameSaved(scores, gameLog);
    }
  }, [subState, onGameSaved, scores, gameLog]);

  // Sacar carta de Beat
  const drawBeat = (delay: number = 0) => {
    setBeatFlipped(false);
    setTimeout(() => {
      let nextBeat: BeatCard;
      do {
        nextBeat = BEATS_DECK[Math.floor(Math.random() * BEATS_DECK.length)];
      } while (BEATS_DECK.length > 1 && nextBeat.id === activeBeat?.id);

      setActiveBeat(nextBeat);
      setTimeout(() => {
        setBeatFlipped(true);
      }, 50);
    }, delay);
  };

  // Sacar carta de Desafío
  const drawChallenge = (delay: number = 0) => {
    setChallengeFlipped(false);
    setTimeout(() => {
      let nextChallenge: ChallengeCard;
      do {
        nextChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
      } while (availableChallenges.length > 1 && nextChallenge.id === activeChallenge?.id);

      setActiveChallenge(nextChallenge);
      setTimerSeconds(nextChallenge.timeLimit ? Math.min(nextChallenge.timeLimit, 60) : 60);
      setTimerRunning(false);
      setTimeout(() => {
        setChallengeFlipped(true);
      }, 50);
    }, delay);
  };

  const handlePrevBeat = () => {
    const currentIndex = BEATS_DECK.findIndex(b => b.id === activeBeat?.id);
    const prevIndex = (currentIndex - 1 + BEATS_DECK.length) % BEATS_DECK.length;
    setActiveBeat(BEATS_DECK[prevIndex]);
  };

  const handleNextBeat = () => {
    const currentIndex = BEATS_DECK.findIndex(b => b.id === activeBeat?.id);
    const nextIndex = (currentIndex + 1) % BEATS_DECK.length;
    setActiveBeat(BEATS_DECK[nextIndex]);
  };

  const handleFinishImprovisation = () => {
    setTimerRunning(false);
    spotifyPlayer.pause();
    
    if (mode === 'solo') {
      advanceToNextTurn(scores);
    } else {
      setSelectedRating(3);
      setCurrentVoterIndex(0);
      setVotesReceived({});
      setSubState('scoring');
    }
  };

  const handleVoteSubmit = () => {
    const newVotes = { ...votesReceived, [currentVoter]: selectedRating };
    setVotesReceived(newVotes);

    if (currentVoterIndex < votingPlayers.length - 1) {
      setIsVoterFading(true);
      setTimeout(() => {
        setCurrentVoterIndex(prev => prev + 1);
        setSelectedRating(3);
        setIsVoterFading(false);
      }, 200);
    } else {
      const turnScore = Object.values(newVotes).reduce((a, b) => a + b, 0);
      const updatedScores = {
        ...scores,
        [activePlayer]: (scores[activePlayer] || 0) + turnScore
      };
      setScores(updatedScores);

      const newLogEntry: TurnLog = {
        round: currentRound,
        player: activePlayer,
        challengeTitle: activeChallenge?.title || 'Desafío',
        challengeCategory: activeChallenge?.category || 'general',
        challengePrompt: activeChallenge?.highlightText || activeChallenge?.description || '',
        beatName: activeBeat?.name || 'Sin beat',
        beatBpm: activeBeat?.bpm || 0,
        votes: newVotes,
        totalScore: turnScore,
        isDeathmatch: isReplicaActive
      };
      setGameLog(prev => [...prev, newLogEntry]);

      advanceToNextTurn(updatedScores);
    }
  };

  const advanceToNextTurn = (currentScores: Record<string, number>) => {
    if (mode === 'solo') {
      setCurrentRound(prev => prev + 1);
      setSubState('playing');
      setActiveCardType('challenge');
      
      if (gameSettings?.subMode === 'random') {
        setBeatFlipped(false);
        setChallengeFlipped(false);
        drawBeat(200);
        drawChallenge(200);
      } else {
        setTimerSeconds(activeChallenge?.timeLimit ? Math.min(activeChallenge.timeLimit, 60) : 60);
      }
      return;
    }

    setBeatFlipped(false);
    setChallengeFlipped(false);
    setActiveBeat(null);
    setActiveChallenge(null);
    setSelectedBeatForTurn(null);
    setSelectedChallengeForTurn(null);

    const nextTurnsPlayed = turnsPlayedInRound + 1;

    if (nextTurnsPlayed === activeRoundPlayers.length) {
      setTurnsPlayedInRound(0);
      const startIndex = playerNames.indexOf(startingPlayer);
      setCurrentPlayerIndex(startIndex !== -1 ? startIndex : 0);

      if (isReplicaActive) {
        const maxScore = Math.max(...Object.values(currentScores));
        const leaders = Object.keys(currentScores).filter(name => currentScores[name] === maxScore);

        if (leaders.length > 1) {
          setReplicaPlayers(leaders);
          const randomIndex = Math.floor(Math.random() * DEATHMATCH_THEMES.length);
          setReplicaTheme(DEATHMATCH_THEMES[randomIndex]);
          setSubState('replica_announcement');
        } else {
          setIsReplicaActive(false);
          setSubState('game_over');
        }
      } else {
        if (currentRound >= totalRounds) {
          const maxScore = Math.max(...Object.values(currentScores));
          const leaders = Object.keys(currentScores).filter(name => currentScores[name] === maxScore);

          if (leaders.length > 1) {
            setIsReplicaActive(true);
            setReplicaPlayers(leaders);
            const randomIndex = Math.floor(Math.random() * DEATHMATCH_THEMES.length);
            setReplicaTheme(DEATHMATCH_THEMES[randomIndex]);
            setSubState('replica_announcement');
          } else {
            setSubState('game_over');
          }
        } else {
          setCurrentRound(prev => prev + 1);
          setSubState('ready');
        }
      }
    } else {
      setTurnsPlayedInRound(nextTurnsPlayed);
      setCurrentPlayerIndex(prev => (prev + 1) % activeRoundPlayers.length);
      setSubState('ready');
    }
  };

  const handleStartTurn = () => {
    setSubState('playing');
    setActiveCardType('challenge');
    if (gameSettings?.subMode === 'custom' && selectedBeatForTurn && selectedChallengeForTurn) {
      setActiveBeat(selectedBeatForTurn);
      setActiveChallenge(selectedChallengeForTurn);
      setBeatFlipped(true);
      setChallengeFlipped(true);
    } else {
      drawBeat(1000);
      drawChallenge(1000);
    }
  };

  const handleResetConfirmed = () => {
    setShowResetConfirm(false);
    setCurrentRound(1);
    setIsReplicaActive(false);
    setReplicaPlayers([]);
    setReplicaTheme(null);
    setTurnsPlayedInRound(0);
    
    const resetScores: Record<string, number> = {};
    playerNames.forEach(name => {
      resetScores[name] = 0;
    });
    setScores(resetScores);

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

  const sortedLeaderboard = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

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
        title={t.game.exit_confirm_title}
        message={t.game.exit_confirm_msg}
        confirmLabel={t.game.exit_confirm_btn}
        cancelLabel={t.game.exit_cancel_btn}
        variant="danger"
        onConfirm={() => {
          setShowBackConfirm(false);
          triggerExitToMenu();
        }}
        onCancel={() => setShowBackConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title={t.game.reset_confirm_title}
        message={t.game.reset_confirm_msg}
        confirmLabel={t.game.reset_confirm_btn}
        cancelLabel={t.game.reset_cancel_btn}
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
              <span>{t.game.exit_hud_btn}</span>
            </button>

            <div className="turn-indicator glass-panel">
              <div className="turn-label">
                {isReplicaActive ? `${t.game.replica_hud_tag} ${currentRound})` : `${t.profile.round_header} ${currentRound} / ${mode === 'solo' ? '∞' : totalRounds}`}
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
              {isReplicaActive ? t.game.ready_replica_tag : `${t.game.ready_round_tag} ${currentRound}`}
            </span>
            <h2 className="ready-player-title font-graffiti text-glow-teal">{activePlayer}</h2>
            
            {mode !== 'solo' && (
              <p className="ready-score-hint">
                {t.game.ready_score_hint} <strong className="pink-text">{scores[activePlayer]} {t.common.points}</strong>
              </p>
            )}

            <p className="ready-description">
              {isReplicaActive 
                ? t.game.ready_desc_replica
                : (gameSettings?.subMode === 'custom'
                  ? t.game.ready_desc_custom
                  : t.game.ready_desc_normal)
              }
            </p>

            {gameSettings?.subMode === 'custom' && (
              <div className="custom-setup-selectors">
                <div className="selector-group">
                  <label className="selector-label">{t.game.custom_choose_beat}</label>
                  <select 
                    className="custom-select beat-select"
                    value={selectedBeatForTurn?.id || ''}
                    onChange={(e) => {
                      const beat = BEATS_DECK.find(b => b.id === e.target.value);
                      setSelectedBeatForTurn(beat || null);
                    }}
                  >
                    <option value="">{t.game.custom_select_beat_placeholder}</option>
                    {BEATS_DECK.map(beat => (
                      <option key={beat.id} value={beat.id}>
                        🎵 {beat.name} ({beat.bpm} BPM)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selector-group">
                  <label className="selector-label">{t.game.custom_choose_challenge}</label>
                  <select 
                    className="custom-select challenge-select"
                    value={selectedChallengeForTurn?.id || ''}
                    onChange={(e) => {
                      const challenge = availableChallenges.find(c => c.id === e.target.value);
                      setSelectedChallengeForTurn(challenge || null);
                    }}
                  >
                    <option value="">{t.game.custom_select_challenge_placeholder}</option>
                    {availableChallenges.map(c => (
                      <option key={c.id} value={c.id}>
                        🃏 [{c.category.toUpperCase()}] {c.title || (c.category === 'palabras' ? t.categories.palabras : c.description.substring(0, 30) + '...')}
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
              <span>{gameSettings?.subMode === 'custom' ? t.game.start_turn_custom : t.game.start_turn_normal}</span>
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

                                      {/* Timer integrado en la carta */}
                                      <div className="card-timer-widget">
                                        <div className={`card-timer-display ${timerSeconds <= 10 && timerRunning ? 'critical-time' : ''}`}>
                                          <span className="card-timer-digits">
                                            {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                                          </span>
                                        </div>
                                        <div className="card-timer-controls">
                                          {!timerRunning ? (
                                            <button className="card-timer-btn btn-play" onClick={(e) => { e.stopPropagation(); startTimer(); }}>
                                              <Play size={12} fill="currentColor" /> {t.game.timer_start}
                                            </button>
                                          ) : (
                                            <button className="card-timer-btn btn-pause" onClick={(e) => { e.stopPropagation(); pauseTimer(); }}>
                                              <Pause size={12} fill="currentColor" /> {t.game.timer_pause}
                                            </button>
                                          )}
                                          <button className="card-timer-btn btn-reset" onClick={(e) => { e.stopPropagation(); resetTimer(); }}>
                                            <Square size={10} fill="currentColor" /> {t.game.timer_reset}
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
                    <h3 className="carousel-card-tag teal-text">{t.game.beat_carousel_tag}</h3>
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
                              <span>INST. BEAT ({activeBeat.bpm} BPM)</span>
                            </div>

                            <div className="spotify-embed-card-container fade-in">
                              <iframe
                                title={activeBeat.name}
                                src={`https://open.spotify.com/embed/track/${activeBeat.spotifyUri?.replace('spotify:track:', '') || activeBeat.spotifyUrl?.split('/track/')[1]?.split('?')[0]}?utm_source=generator&theme=0`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                                className="spotify-official-embed-iframe"
                              />
                            </div>
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

              {/* PANEL DE CONTROL DE CARTAS */}
              {((activeCardType === 'challenge' && activeChallenge) || (activeCardType === 'beat' && activeBeat)) && (
                <div className="card-controls-panel glass-panel">
                  {activeCardType === 'challenge' && activeChallenge && (
                    <div className="card-controls-group fade-in">
                      {/* Botón Más Palabras si aplica */}
                      {activeChallenge.category === 'palabras' && (
                        <button
                          className="btn-variar-new"
                          onClick={() => {
                            const palabrasCards = CHALLENGES_DECK.filter(c => c.category === 'palabras' && c.id !== activeChallenge.id);
                            if (palabrasCards.length > 0) {
                              const next = palabrasCards[Math.floor(Math.random() * palabrasCards.length)];
                              changeChallengeWithFlip(next);
                            }
                          }}
                        >
                          <RefreshCw size={14} />
                          <span>{t.game.more_words}</span>
                        </button>
                      )}

                      {/* Cambiar Desafío */}
                      {gameSettings?.subMode !== 'custom' && (
                        <button className="btn-card-redraw-new" onClick={() => drawChallenge(400)}>
                          <RefreshCw size={12} /> {t.game.change_challenge}
                        </button>
                      )}
                    </div>
                  )}

                  {activeCardType === 'beat' && activeBeat && (
                    <div className="card-controls-group fade-in">
                      <div className="beat-nav-row">
                        <button className="btn-beat-nav" onClick={handlePrevBeat} title={t.game.prev_beat}>
                          <ChevronLeft size={18} />
                          <span>{t.game.prev_beat}</span>
                        </button>
                        <span className="beat-counter-tag">
                          {BEATS_DECK.findIndex(b => b.id === activeBeat.id) + 1} / {BEATS_DECK.length}
                        </span>
                        <button className="btn-beat-nav" onClick={handleNextBeat} title={t.game.next_beat}>
                          <span>{t.game.next_beat}</span>
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones de Footer */}
              <div className="game-footer-actions">
                <button
                  className={`btn-next-turn ${(activeChallenge && activeBeat) ? 'pulse-pink-anim' : ''}`}
                  onClick={handleFinishImprovisation}
                  disabled={!activeChallenge || !activeBeat}
                >
                  <span>
                    {(!activeChallenge || !activeBeat) 
                      ? t.game.check_both_cards 
                      : (mode === 'solo' ? t.game.next_turn_solo : t.game.end_turn_multi)
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

              <h2 className="scoring-title font-graffiti">{t.game.scoring_title}</h2>

              <div className={`voter-scoring-transition-wrapper ${isVoterFading ? 'fading-out' : 'fading-in'}`}>
                <div className="voter-badge-container">
                  <span className="voter-label font-base">{t.game.voter_turn_label}</span>
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
                  {t.game.scoring_rate_prompt_prefix} <strong className="teal-text">{activePlayer}</strong> {t.game.scoring_rate_prompt_suffix}
                </p>

                <div className="voting-options-list">
                  {[
                    { value: 1, emoji: '👎', label: t.game.rating_1_label, desc: t.game.rating_1_desc, pts: `1 ${t.common.points}` },
                    { value: 2, emoji: '😐', label: t.game.rating_2_label, desc: t.game.rating_2_desc, pts: `2 ${t.common.points}` },
                    { value: 3, emoji: '🔥', label: t.game.rating_3_label, desc: t.game.rating_3_desc, pts: `3 ${t.common.points}` },
                    { value: 4, emoji: '👑', label: t.game.rating_4_label, desc: t.game.rating_4_desc, pts: `4 ${t.common.points}` }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`voting-option-btn ${selectedRating === opt.value ? 'selected' : ''}`}
                      onClick={() => setSelectedRating(opt.value)}
                    >
                      <div className="voting-option-left">
                        <span className="voting-option-number">+{opt.value} {t.common.points.toUpperCase()}</span>
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
                    ? `${t.game.save_vote_btn} (${selectedRating} ${t.common.points})` 
                    : `${t.game.finish_vote_btn} (+${Object.values(votesReceived).reduce((a,b)=>a+b, 0) + selectedRating} ${t.common.points})`
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

              <span className="replica-round-tag">{t.game.replica_tie_title}</span>
              <h2 className="replica-title">{t.game.replica_count_title} {replicaPlayers.length} {t.game.replica_count_suffix}</h2>
              
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
                  {t.game.replica_deathmatch_notice}
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
                <span>{t.game.start_deathmatch_btn}</span>
              </button>
            </div>
          )}

          {/* ── 5. GAME OVER (PODIO Y RESULTADOS) ───────────────────────────── */}
          {subState === 'game_over' && (
            <div className="gameover-screen-content glass-panel glow-pink text-center fade-in">
              <div className="gameover-logo-container">
                <img src="/Barrzjuego.png" alt="BARRZ" className="gameover-logo-img" />
              </div>
              <h1 className="gameover-main-title font-accent text-glow-pink">{t.game.game_over_title}</h1>
              <p className="gameover-subtitle">{t.game.game_over_sub}</p>

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
                    <span className="podium-score">{ranksList[1].points} {t.common.points}</span>
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
                    <span className="podium-score">{ranksList[0].points} {t.common.points}</span>
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
                    <span className="podium-score">{ranksList[2].points} {t.common.points}</span>
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
                      <th>{t.game.leaderboard_rank_col}</th>
                      <th>{t.game.leaderboard_player_col}</th>
                      <th>{t.game.leaderboard_pts_col}</th>
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
                        <td><strong>{points}</strong> {t.common.points}</td>
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
                  <span>{t.game.repeat_battle_btn}</span>
                </button>

                <button className="btn-gameover btn-exit-menu" onClick={triggerExitToMenu}>
                  <Home size={16} />
                  <span>{t.game.return_to_menu_btn}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

