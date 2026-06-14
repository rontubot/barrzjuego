import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, RotateCw, Play, Pause, Square, Music, QrCode, Sparkles, User, SkipForward } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import { ConfirmDialog } from './ConfirmDialog';
import './Game.css';

interface GameProps {
  onBackToMenu: () => void;
}

export const Game: React.FC<GameProps> = ({ onBackToMenu }) => {
  const [turn, setTurn] = useState(1);
  const [activePlayer, setActivePlayer] = useState<'Freestyler A' | 'Freestyler B'>('Freestyler A');

  // Cartas activas
  const [activeBeat, setActiveBeat] = useState<BeatCard | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeCard | null>(null);

  // Estados de animación
  const [beatFlipped, setBeatFlipped] = useState(false);
  const [challengeFlipped, setChallengeFlipped] = useState(false);
  const [wordsRotated, setWordsRotated] = useState(false);

  // Animación de salida
  const [isExiting, setIsExiting] = useState(false);

  // Diálogos de confirmación
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Temporizador para Beatbox (90 segundos)
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Metrónomo visual
  const [isMetronomeOn, setIsMetronomeOn] = useState(true);

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

  // Al sacar una nueva carta de desafío con límite de tiempo
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

  // ── Animación de salida hacia el menú ──────────────────────────────────
  const triggerExitToMenu = () => {
    setIsExiting(true);
    setTimeout(() => onBackToMenu(), 600);
  };

  // ── Cartas aleatorias ──────────────────────────────────────────────────
  const drawBeat = () => {
    setBeatFlipped(false);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * BEATS_DECK.length);
      setActiveBeat(BEATS_DECK[randomIndex]);
      setBeatFlipped(true);
    }, 150);
  };

  const drawChallenge = () => {
    setChallengeFlipped(false);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * CHALLENGES_DECK.length);
      setActiveChallenge(CHALLENGES_DECK[randomIndex]);
      setChallengeFlipped(true);
    }, 150);
  };

  const handleNextTurn = () => {
    setBeatFlipped(false);
    setChallengeFlipped(false);
    setTimerRunning(false);
    setTimeout(() => {
      setActiveBeat(null);
      setActiveChallenge(null);
      setTurn((prev) => prev + 1);
      setActivePlayer((prev) => prev === 'Freestyler A' ? 'Freestyler B' : 'Freestyler A');
    }, 300);
  };

  // ── Reiniciar partida (confirmado) ─────────────────────────────────────
  const handleResetConfirmed = () => {
    setShowResetConfirm(false);
    setTurn(1);
    setActiveBeat(null);
    setActiveChallenge(null);
    setActivePlayer('Freestyler A');
    setTimerRunning(false);
    setTimerSeconds(90);
    setBeatFlipped(false);
    setChallengeFlipped(false);
  };

  // ── Spotify ────────────────────────────────────────────────────────────
  const openSpotify = (beat: BeatCard) => {
    window.location.href = beat.spotifyUri;
    setTimeout(() => {
      window.open(beat.spotifyUrl, '_blank');
    }, 500);
  };

  // Temporizador controls
  const startTimer = () => setTimerRunning(true);
  const pauseTimer = () => setTimerRunning(false);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(activeChallenge?.timeLimit || 90);
  };

  const bpmPulseDuration = activeBeat ? 60 / activeBeat.bpm : 0.67;

  return (
    <>
      {/* Diálogo: Volver al menú */}
      <ConfirmDialog
        isOpen={showBackConfirm}
        title="¿Salir del juego?"
        message="Perderás el progreso de la partida actual. ¿Querés volver al menú principal?"
        confirmLabel="Sí, salir"
        cancelLabel="Seguir jugando"
        variant="danger"
        onConfirm={() => {
          setShowBackConfirm(false);
          triggerExitToMenu();
        }}
        onCancel={() => setShowBackConfirm(false)}
      />

      {/* Diálogo: Reiniciar partida */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="¿Reiniciar partida?"
        message="Se borrará el turno actual y todos los jugadores vuelven al principio."
        confirmLabel="Reiniciar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleResetConfirmed}
        onCancel={() => setShowResetConfirm(false)}
      />

      <div className={`game-container ${isExiting ? 'exiting' : ''}`}>
        <div className="grunge-overlay"></div>

        {/* Cabecera / HUD */}
        <div className="game-header">
          <button className="btn-back" onClick={() => setShowBackConfirm(true)}>
            <ArrowLeft size={18} />
            <span>Inicio</span>
          </button>

          <div className="turn-indicator glass-panel">
            <div className="turn-label">TURNO {turn}</div>
            <div className="player-name">
              <User size={14} className="teal-text" />
              <span>{activePlayer}</span>
            </div>
          </div>

          <button className="btn-reset-game" onClick={() => setShowResetConfirm(true)}>
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Tablero Principal */}
        <div className="game-board">

          {/* Lado del Beat */}
          <div className="deck-column">
            <h2 className="column-title teal-text">BEATS</h2>

            {!activeBeat ? (
              <div className="deck-pile beat-pile glass-panel glow-teal" onClick={drawBeat}>
                <div className="deck-card-back teal-bg">
                  <span className="card-logo-text pink-glow-text">BEATS</span>
                  <span className="tap-instruction">TOCAR PARA SACAR</span>
                </div>
                <div className="stacked-card card-1"></div>
                <div className="stacked-card card-2"></div>
              </div>
            ) : (
              <div className="card-container-3d">
                <div className={`card-inner-3d ${beatFlipped ? 'flipped' : ''}`} onClick={() => !beatFlipped && drawBeat()}>
                  <div className="card-face card-back glow-teal" style={{ borderColor: 'var(--neon-teal)' }}>
                    <span className="card-logo-text pink-glow-text">BEATS</span>
                  </div>

                  <div className="card-face card-front glow-pink" style={{ borderColor: 'var(--neon-pink)' }}>
                    <div className="card-pattern-overlay beats-pattern"></div>

                    <div className="card-header-pink">
                      <Music size={16} />
                      <span>INST. BEAT</span>
                    </div>

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

                    <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawBeat(); }}>
                      <RefreshCw size={12} /> Cambiar Beat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lado del Desafío */}
          <div className="deck-column">
            <h2 className="column-title pink-text">DESAFÍOS</h2>

            {!activeChallenge ? (
              <div className="deck-pile challenge-pile glass-panel glow-pink" onClick={drawChallenge}>
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

                    <button className="btn-card-redraw" onClick={(e) => { e.stopPropagation(); drawChallenge(); }}>
                      <RefreshCw size={12} /> Cambiar Desafío
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Footer */}
        <div className="game-footer-actions">
          <button
            className="btn-next-turn pulse-pink-anim"
            onClick={handleNextTurn}
            disabled={!activeBeat && !activeChallenge}
            style={{ opacity: (!activeBeat && !activeChallenge) ? 0.5 : 1 }}
          >
            <span>Siguiente Turno</span>
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </>
  );
};
