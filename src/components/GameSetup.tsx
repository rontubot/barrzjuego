import React, { useState, useEffect, useRef } from 'react';
import { Users, User, Play, Pause, ArrowLeft, Plus, Minus, UserPlus, Check, RefreshCw, Volume2, Sparkles, BookOpen, Compass, Radio, ArrowRight } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import './GameSetup.css';

interface GameSetupProps {
  step: 'lobby_start' | 'tutorial_ask' | 'link_spotify' | 'mode_selection' | 'setup_individual' | 'setup_players' | 'setup_rounds' | 'setup_deck';
  userSession: any;
  onNext: (nextStep: string, data?: any) => void;
  onBack: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ step, userSession, onNext, onBack }) => {
  const avatars = [
    '🎤', '🔥', '🎧', '👑', '👽', '⚡', '🎸', '🚀', '💀', '💥', '🛹', '🕶️',
    '/avatars/female_1.png',
    '/avatars/female_2.png',
    '/avatars/female_3.png',
    '/avatars/male_1.png',
    '/avatars/male_2.png',
    '/avatars/male_3.png'
  ];
  
  // Configuración de juego
  const [players, setPlayers] = useState<string[]>(() => {
    const defaultName = userSession?.username || 'Freestyler A';
    return [defaultName, 'Freestyler B'];
  });
  const [playerAvatars, setPlayerAvatars] = useState<string[]>(() => {
    const defaultAvatar = userSession?.avatar_type === 'custom' && userSession?.custom_avatar_url 
      ? userSession.custom_avatar_url 
      : (userSession?.avatar || '🎤');
    return [defaultAvatar, '🔥'];
  });
  const [activeAvatarPicker, setActiveAvatarPicker] = useState<number | null>(null);
  const [roundsCount, setRoundsCount] = useState(3);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'palabras',
    'tematicas',
    'cypher',
    'terminaciones',
    'beatbox',
    'sacrificio'
  ]);

  // Configuración de modo individual
  const [individualSubMode, setIndividualSubMode] = useState<'random' | 'custom'>('random');
  const [selectedBeat, setSelectedBeat] = useState<BeatCard | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeCard | null>(null);
  const [previewingBeatId, setPreviewingBeatId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showThemesMosaic, setShowThemesMosaic] = useState(false);
  const [expandedThemeCard, setExpandedThemeCard] = useState<ChallengeCard | null>(null);

  // Cleanup audio preview when screen changes or sub-mode changes
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      window.dispatchEvent(new CustomEvent('barrz_resume_lobby_music'));
    };
  }, [individualSubMode, step]);

  const handleTogglePreview = (beat: BeatCard) => {
    if (!beat.audioUrl) return;

    if (previewingBeatId === beat.id) {
      // Pausar
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingBeatId(null);
      window.dispatchEvent(new CustomEvent('barrz_resume_lobby_music'));
    } else {
      // Detener anterior
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      
      // Despachar evento para pausar música de fondo del lobby
      window.dispatchEvent(new CustomEvent('barrz_pause_lobby_music'));

      // Reproducir nueva pre-escucha
      const audio = new Audio(beat.audioUrl);
      audio.loop = true;
      previewAudioRef.current = audio;
      setPreviewingBeatId(beat.id);
      
      audio.play().catch(err => {
        console.log("No se pudo reproducir la pre-escucha del beat:", err);
        setPreviewingBeatId(null);
        window.dispatchEvent(new CustomEvent('barrz_resume_lobby_music'));
      });
    }
  };
  
  // Sorteo de quién empieza
  const [startingPlayer, setStartingPlayer] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);

  // Tutorial interactivo
  const [showTutorialSlides, setShowTutorialSlides] = useState(false);
  const [tutorialSlide, setTutorialSlide] = useState(0);

  // Vinculación de Spotify
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');

  const handleSpotifyToggle = () => {
    const nextVal = !isSpotifyLinked;
    setIsSpotifyLinked(nextVal);
    localStorage.setItem('barrz_spotify_linked', String(nextVal));
  };

  useEffect(() => {
    setIsSpotifyLinked(localStorage.getItem('barrz_spotify_linked') === 'true');
  }, [step]);

  // Sincronizar el competidor 1 con los datos de perfil del usuario logueado
  useEffect(() => {
    if (userSession?.username) {
      setPlayers(prev => {
        if (prev[0] === 'Freestyler A' || prev[0] === '') {
          const next = [...prev];
          next[0] = userSession.username;
          return next;
        }
        return prev;
      });
      setPlayerAvatars(prev => {
        if (prev[0] === '🎤') {
          const next = [...prev];
          next[0] = userSession.avatar_type === 'custom' && userSession.custom_avatar_url 
            ? userSession.custom_avatar_url 
            : (userSession.avatar || '🎤');
          return next;
        }
        return prev;
      });
    }
  }, [userSession]);

  // Categorías de cartas disponibles
  const categoriesList = [
    { id: 'palabras', label: 'Palabras', desc: 'Rimar usando las 4 palabras de tu lado' },
    { id: 'tematicas', label: 'Temáticas', desc: 'Desarrollar rimas sobre un tema profundo' },
    { id: 'cypher', label: 'Cypher', desc: 'Ronda libre en equipo compartiendo micro' },
    { id: 'terminaciones', label: 'Terminaciones', desc: 'Patrones obligatorios como -ER o -AR' },
    { id: 'beatbox', label: 'Beatbox', desc: 'Base humana con cronómetro de 60 segundos' },
    { id: 'sacrificio', label: 'El Sacrificio', desc: 'Ronda final de máxima entrega y energía' }
  ];

  // Manejo de nombres de jugadores
  const handlePlayerNameChange = (index: number, name: string) => {
    const oldName = players[index];
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);

    // Si el jugador cuyo nombre cambió era el startingPlayer, actualizar el nombre
    if (startingPlayer === oldName) {
      setStartingPlayer(name);
    }
  };

  const addPlayerField = () => {
    if (players.length >= 8) return;
    setPlayers([...players, `Freestyler ${String.fromCharCode(65 + players.length)}`]);
    const nextAvatar = avatars[players.length % avatars.length];
    setPlayerAvatars([...playerAvatars, nextAvatar]);
  };

  const removePlayerField = (index: number) => {
    if (players.length <= 2) return;
    const oldName = players[index];
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
    setPlayerAvatars(playerAvatars.filter((_, i) => i !== index));

    // Si eliminamos al jugador que empezaba, resetear el empezador
    if (startingPlayer === oldName) {
      setStartingPlayer('');
    }

    // Asegurar que spinIndex no quede fuera de rango
    if (spinIndex >= newPlayers.length) {
      setSpinIndex(newPlayers.length - 1);
    }
  };

  // Toggle de categorías de juego
  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== id));
      }
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  // Efecto de la ruleta para elegir quién empieza
  useEffect(() => {
    if (!isSpinning) return;

    let counter = 0;
    const totalSteps = 15 + Math.floor(Math.random() * 10);
    let currentIndex = spinIndex;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % players.length;
      setSpinIndex(currentIndex);
      counter++;

      if (counter >= totalSteps) {
        clearInterval(interval);
        setStartingPlayer(players[currentIndex]);
        setIsSpinning(false);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isSpinning, players]);

  const startSpinWheel = () => {
    setStartingPlayer('');
    setIsSpinning(true);
  };

  // Tutorial Slides
  const tutorialSteps = [
    {
      title: "Navegación e Interacción",
      desc: "Bienvenido al laboratorio de freestyle. Navegá por los diferentes mazos de cartas, desafíos dinámicos y bases instrumentales con cronómetro de rimas incorporado y soporte en tiempo real.",
      icon: <Compass size={40} className="teal-text" />
    },
    {
      title: "Mazos y Cartas",
      desc: "El juego tiene un mazo verde de Beats (ritmos de rap) y un mazo rosa de Desafíos. ¡En cada turno deberás sacar una carta de cada mazo!",
      icon: <Sparkles size={40} className="teal-text" />
    },
    {
      title: "Bases con Spotify",
      desc: "Haz clic sobre la carta de Beat para abrir directamente el reproductor de Spotify en segundo plano. La música sonará sin interrumpir la app.",
      icon: <Volume2 size={40} className="pink-text" />
    },
    {
      title: "Puntuación en Equipo",
      desc: "Improvisa de acuerdo al desafío. Al final del turno, tus compañeros te puntuarán de 1 a 5 estrellas según tu fluidez, métrica y entrega. ¡Gana el que sume más puntos!",
      icon: <Users size={40} className="teal-text" />
    },
    {
      title: "Estadísticas y Conexión",
      desc: "Sincronizá tus bases de rap de forma fluida y accede a los informes completos y registros estadísticos de cada uno de tus combates.",
      icon: <Radio size={40} className="pink-text" />
    }
  ];

  return (
    <div className="setup-outer-container">
      <div className="grunge-overlay"></div>

      {/* Botón de volver */}
      <button className="btn-setup-back" onClick={onBack}>
        <span>Atrás</span>
      </button>

      {/* ── LOBBY START ────────────────────────────────────────────────── */}
      {step === 'lobby_start' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <div className="lobby-user-badge">
            <span className="user-icon">🔥</span>
            <span>Sesión: {userSession?.email || 'Freestyler Google'}</span>
          </div>

          <h1 className="logo-title-large">
            <img src="/Barrzjuego.png" alt="BARRZ" className="setup-logo-img" />
          </h1>
          <div className="logo-sub-urban">EDICIÓN DE COMBATE</div>

          <p className="lobby-desc">
            ¿Preparado para medir tus habilidades de improvisación? Configura tu equipo, define las rondas y que empiece el cypher.
          </p>

          <button className="btn-comenzar pulse-pink-anim" onClick={() => onNext('tutorial_ask')}>
            <Play size={22} fill="currentColor" />
            <span>COMENZAR</span>
          </button>
        </div>
      )}

      {/* ── TUTORIAL ASK ───────────────────────────────────────────────── */}
      {step === 'tutorial_ask' && (
        <div className="setup-card glass-panel glow-teal text-center fade-in">
          {!showTutorialSlides ? (
            <div className="tutorial-ask-content">
              <div className="icon-wrapper">
                <BookOpen size={48} className="teal-text" />
              </div>
              <h2 className="font-graffiti text-glow-teal">¿CÓMO ANDAMOS DE REGLAS?</h2>
              <p className="step-description">
                ¿Querés ver un breve tutorial interactivo para entender cómo jugar, las cartas y el reproductor de Spotify?
              </p>

              <div className="tutorial-actions-row">
                <button className="btn-neon-teal" onClick={() => setShowTutorialSlides(true)}>
                  SÍ, VER TUTORIAL
                </button>
                <button className="btn-neon-pink" onClick={() => onNext('link_spotify')}>
                  NO, SALTEAR
                </button>
              </div>
            </div>
          ) : (
            <div className="tutorial-slideshow fade-in">
              <div className="slide-icon-row">
                {tutorialSteps[tutorialSlide].icon}
              </div>
              <h3 className="slide-title font-graffiti">{tutorialSteps[tutorialSlide].title}</h3>
              <p className="slide-description">{tutorialSteps[tutorialSlide].desc}</p>

              <div className="slide-indicators">
                {tutorialSteps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`indicator-dot ${tutorialSlide === idx ? 'active' : ''}`}
                    onClick={() => setTutorialSlide(idx)}
                  ></span>
                ))}
              </div>

              <div className="slide-navigation">
                {tutorialSlide > 0 ? (
                  <button className="btn-nav-slide" onClick={() => setTutorialSlide(prev => prev - 1)}>
                    Anterior
                  </button>
                ) : <span className="placeholder-slide"></span>}

                {tutorialSlide < tutorialSteps.length - 1 ? (
                  <button className="btn-nav-slide highlight" onClick={() => setTutorialSlide(prev => prev + 1)}>
                    Siguiente
                  </button>
                ) : (
                  <button 
                    className="btn-nav-slide highlight" 
                    onClick={() => {
                      setShowTutorialSlides(false);
                      setTutorialSlide(0);
                      onNext('link_spotify');
                    }}
                  >
                    Entendido, Jugar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LINK SPOTIFY ───────────────────────────────────────────────── */}
      {step === 'link_spotify' && (
        <div className="setup-card glass-panel glow-teal text-center fade-in">
          <div className="illustration-wrapper">
            <div className="spotify-setup-logo-container pulse-teal-anim">
              <svg className="spotify-setup-icon" viewBox="0 0 24 24" width="56" height="56" fill="#1DB954">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.31c-.22.36-.68.48-1.04.26-2.91-1.78-6.58-2.18-10.9-1.2-.42.09-.83-.17-.92-.59-.09-.41.17-.83.59-.92 4.73-1.08 8.78-.62 12.01 1.36.36.21.48.67.26 1.09zm1.46-3.26c-.28.45-.87.6-1.32.32-3.33-2.05-8.41-2.65-12.35-1.45-.51.15-1.04-.14-1.2-.66-.15-.51.14-1.04.66-1.2 4.51-1.37 10.12-.7 13.9 1.63.45.27.6.86.31 1.36zm.1-3.38C15.2 8.35 8.86 8.14 5.17 9.26c-.57.17-1.16-.16-1.33-.73-.17-.57.16-1.16.73-1.33 4.23-1.28 11.23-1.04 15.67 1.59.51.3 1.17.47 1.47-.04.3-.51.13-1.17-.38-1.47z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="font-graffiti text-glow-teal mt-10">VINCULAR SPOTIFY</h2>
          <p className="step-description">
            Vinculá tu cuenta de Spotify Premium para que cada rima sume reproducciones reales a los beatmakers de las instrumentales. ¡Es el motor del cypher!
          </p>

          <div className="spotify-link-action-box">
            <button 
              type="button" 
              className={`btn-spotify-link-setup ${isSpotifyLinked ? 'linked' : ''}`}
              onClick={handleSpotifyToggle}
            >
              {isSpotifyLinked ? '✓ CUENTA VINCULADA' : 'CONECTAR CON SPOTIFY'}
            </button>
            {isSpotifyLinked && (
              <span className="spotify-user-meta font-base">Conectado como: <strong>BarrzUser_99</strong></span>
            )}
          </div>

          <button className="btn-neon-pink w-100 mt-20" onClick={() => onNext('mode_selection')}>
            <span>CONTINUAR A MODOS</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ── MODE SELECTION ─────────────────────────────────────────────── */}
      {step === 'mode_selection' && (
        <div className="setup-card glass-panel glow-pink fade-in">
          <h2 className="font-graffiti text-glow-pink text-center mb-20">SELECCIONAR MODO</h2>
          <p className="step-sub text-center">Elegí la modalidad de improvisación.</p>

          <div className="modes-stack">
            <button 
              className="mode-option-card"
              onClick={() => onNext('setup_players')}
            >
              <div className="mode-option-header">
                <Users size={20} className="pink-text" />
                <h3>Multijugador</h3>
              </div>
              <p>Competencia en equipo con registro de nombres, conteo de rondas, sorteo inicial y tabla de puntuaciones.</p>
            </button>

            <button 
              className="mode-option-card"
              onClick={() => onNext('setup_individual')}
            >
              <div className="mode-option-header">
                <User size={20} className="pink-text" />
                <h3>Jugar Solo</h3>
              </div>
              <p>Entrená en solitario con bases y desafíos para perfeccionar tus patrones. Admite flujo automático o selección a mano.</p>
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP INDIVIDUAL ─────────────────────────────────────────── */}
      {step === 'setup_individual' && (() => {
        const availableCategories = categoriesList;
        const canStart = individualSubMode === 'random' || (selectedBeat !== null && selectedChallenge !== null);
        
        return (
          <div className="setup-individual-screen fade-in">
            {/* Header */}
            <div className="individual-header">
              <button className="btn-back-individual" onClick={onBack}>
                <ArrowLeft size={18} />
                <span>Volver</span>
              </button>
              <h2 className="font-graffiti text-glow-teal">MODO INDIVIDUAL</h2>
            </div>

            {/* Sub-mode Tabs */}
            <div className="individual-mode-tabs">
              <button
                className={`individual-tab ${individualSubMode === 'random' ? 'active' : ''}`}
                onClick={() => {
                  setIndividualSubMode('random');
                  setSelectedBeat(null);
                  setSelectedChallenge(null);
                }}
              >
                🎲 ALEATORIO
              </button>
              <button
                className={`individual-tab ${individualSubMode === 'custom' ? 'active' : ''}`}
                onClick={() => setIndividualSubMode('custom')}
              >
                🎛️ PERSONALIZADO
              </button>
            </div>

            {/* Aleatorio mode */}
            {individualSubMode === 'random' && (
              <div className="individual-random-content fade-in">
                <div className="random-mode-card glass-panel">
                  <div className="random-icon">🎲</div>
                  <h3>Modo Aleatorio</h3>
                  <p>El sistema seleccionará un beat y un desafío automáticamente al iniciar cada turno. Perfecto para entrenamientos rápidos y variados.</p>
                  <div className="random-features">
                    <span className="feature-chip">🎵 Beat aleatorio</span>
                    <span className="feature-chip">🃏 Desafío sorpresa</span>
                    <span className="feature-chip">⚡ Sin configuración</span>
                  </div>
                </div>
              </div>
            )}

            {/* Personalizado mode */}
            {individualSubMode === 'custom' && (
              <div className="individual-custom-content fade-in">
                {/* Beats column */}
                <div className="selection-column">
                  <div className="column-header">
                    <h3 className="teal-text">🎵 ELEGÍ TU BASE</h3>
                    {selectedBeat && <span className="selection-badge">✓ {selectedBeat.name}</span>}
                  </div>
                  <div className="beats-list scrollable-list">
                    {BEATS_DECK.map(beat => (
                      <div
                        key={beat.id}
                        className={`beat-item ${selectedBeat?.id === beat.id ? 'selected' : ''}`}
                        onClick={() => setSelectedBeat(beat)}
                      >
                        <div className="beat-info">
                          <span className="beat-name">{beat.name}</span>
                          <span className="beat-bpm">{beat.bpm} BPM</span>
                        </div>
                        <div className="beat-actions">
                          {beat.audioUrl && (
                            <button
                              className={`btn-preview ${previewingBeatId === beat.id ? 'previewing' : ''}`}
                              onClick={e => { e.stopPropagation(); handleTogglePreview(beat); }}
                              title={previewingBeatId === beat.id ? 'Detener' : 'Escuchar'}
                            >
                              {previewingBeatId === beat.id ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                          <div className={`beat-select-dot ${selectedBeat?.id === beat.id ? 'active' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Challenges column */}
                <div className="selection-column">
                  <div className="column-header">
                    <h3 className="pink-text">🃏 ELEGÍ TU DESAFÍO</h3>
                    {selectedChallenge && <span className="selection-badge">✓ {selectedChallenge.title || selectedChallenge.category}</span>}
                  </div>
                  <div className="challenges-list scrollable-list">
                    {availableCategories.map(cat => (
                      <div
                        key={cat.id}
                        className={`challenge-item ${selectedChallenge?.category === cat.id ? 'selected' : ''}`}
                        onClick={() => {
                          if (cat.id === 'tematicas') {
                            setShowThemesMosaic(true);
                          } else {
                            const categoryCards = CHALLENGES_DECK.filter(c => c.category === cat.id);
                            if (categoryCards.length > 0) {
                              const randomCard = categoryCards[Math.floor(Math.random() * categoryCards.length)];
                              setSelectedChallenge(randomCard);
                            }
                          }
                        }}
                      >
                        <div className="challenge-info">
                          <span className="challenge-category">{cat.label.toUpperCase()}</span>
                          <span className="challenge-title">{cat.desc}</span>
                        </div>
                        <div className={`challenge-select-dot ${selectedChallenge?.category === cat.id ? 'active' : ''}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Start button */}
            <div className="individual-start-footer">
              <button
                className={`btn-individual-start ${!canStart ? 'disabled' : 'pulse-teal-anim'}`}
                disabled={!canStart}
                onClick={() => {
                  // Stop preview audio if playing
                  if (previewAudioRef.current) {
                    previewAudioRef.current.pause();
                    previewAudioRef.current = null;
                    setPreviewingBeatId(null);
                  }
                  onNext('game', {
                    mode: 'solo',
                    subMode: individualSubMode,
                    players: ['Mi Práctica'],
                    avatars: { 'Mi Práctica': '🎤' },
                    roundsCount: 3,
                    selectedCategories: ['palabras', 'tematicas', 'terminaciones'],
                    initialBeat: individualSubMode === 'custom' ? selectedBeat : null,
                    initialChallenge: individualSubMode === 'custom' ? selectedChallenge : null
                  });
                }}
              >
                {!canStart ? (
                  <span>Seleccioná un beat y desafío</span>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>ARRANCAR SESIÓN</span>
                  </>
                )}
              </button>
            </div>

            {/* MOSAICO DE TEMÁTICAS MODAL */}
            {showThemesMosaic && (
              <div className="themes-mosaic-overlay fade-in">
                <div className="themes-mosaic-container glass-panel glow-pink">
                  <div className="themes-mosaic-header">
                    <h2 className="font-graffiti text-glow-pink">SELECCIONAR TEMÁTICA</h2>
                    <p className="themes-mosaic-subtitle font-base">Hacé click en una temática para expandirla y leerla antes de confirmar.</p>
                  </div>

                  <div className="themes-mosaic-grid">
                    {CHALLENGES_DECK.filter(c => c.category === 'tematicas').map((card) => (
                      <div 
                        key={card.id} 
                        className="theme-mosaic-card glow-pink" 
                        onClick={() => setExpandedThemeCard(card)}
                      >
                        <h4 className="theme-card-title">{card.title}</h4>
                        <div className="theme-card-preview font-base">{card.highlightText || 'Temática'}</div>
                      </div>
                    ))}
                  </div>

                  <button className="btn-close-mosaic font-base" onClick={() => setShowThemesMosaic(false)}>
                    CERRAR
                  </button>
                </div>
              </div>
            )}

            {/* CARD EXPANDED FULLSCREEN MODAL */}
            {expandedThemeCard && (
              <div className="theme-expanded-overlay fade-in">
                <div className="theme-expanded-card glass-panel glow-pink">
                  <span className="expanded-card-badge">TEMÁTICA</span>
                  <h2 className="expanded-card-title">{expandedThemeCard.title}</h2>
                  <p className="expanded-card-desc">{expandedThemeCard.description}</p>
                  {expandedThemeCard.highlightText && (
                    <div className="expanded-card-highlight font-base">
                      {expandedThemeCard.highlightText}
                    </div>
                  )}

                  <div className="expanded-card-actions">
                    <button 
                      className="btn-expanded-confirm font-base"
                      onClick={() => {
                        setSelectedChallenge(expandedThemeCard);
                        setExpandedThemeCard(null);
                        setShowThemesMosaic(false);
                      }}
                    >
                      CONFIRMAR SELECCIÓN
                    </button>
                    <button 
                      className="btn-expanded-back font-base"
                      onClick={() => setExpandedThemeCard(null)}
                    >
                      VOLVER AL MOSAICO
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── SETUP PLAYERS ──────────────────────────────────────────────── */}
      {step === 'setup_players' && (
        <div className="setup-card glass-panel glow-teal fade-in">
          <h2 className="font-graffiti text-glow-teal text-center mb-10">PARTICIPANTES</h2>
          <p className="step-sub text-center">Registrá los nombres de los competidores (2 a 8 jugadores).</p>

          <div className="players-list-inputs scrollable-container">
            {players.map((playerName, index) => (
              <div key={index} className="player-input-row-container">
                <div className="player-input-row fade-in">
                  <span className="player-number-label">#{index + 1}</span>
                  
                  <button
                    type="button"
                    className="player-avatar-btn"
                    onClick={() => setActiveAvatarPicker(activeAvatarPicker === index ? null : index)}
                    title="Elegir Avatar"
                    style={{ padding: (playerAvatars[index]?.startsWith('/') || playerAvatars[index]?.startsWith('data:image/')) ? '0' : '' }}
                  >
                    {(playerAvatars[index]?.startsWith('/') || playerAvatars[index]?.startsWith('data:image/')) ? (
                      <img src={playerAvatars[index]} alt="" className="avatar-img" />
                    ) : (
                      playerAvatars[index] || '🎤'
                    )}
                  </button>

                  <input
                    type="text"
                    value={playerName}
                    maxLength={15}
                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    placeholder={`Jugador ${index + 1}`}
                    className="player-name-field"
                  />
                  <button 
                    className="btn-remove-player"
                    onClick={() => removePlayerField(index)}
                    disabled={players.length <= 2}
                  >
                    <Minus size={16} />
                  </button>
                </div>

                {activeAvatarPicker === index && (
                  <div className="player-avatar-picker-dropdown fade-in">
                    {avatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        className={`picker-avatar-item ${playerAvatars[index] === av ? 'selected' : ''}`}
                        onClick={() => {
                          const nextAvatars = [...playerAvatars];
                          nextAvatars[index] = av;
                          setPlayerAvatars(nextAvatars);
                          setActiveAvatarPicker(null);
                        }}
                        style={{ padding: (av.startsWith('/') || av.startsWith('data:image/')) ? '0' : '' }}
                      >
                        {(av.startsWith('/') || av.startsWith('data:image/')) ? (
                          <img src={av} alt="" className="avatar-img-picker" />
                        ) : (
                          av
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="setup-actions-footer">
            <button 
              className="btn-add-player w-100" 
              onClick={addPlayerField} 
              disabled={players.length >= 8}
            >
              <UserPlus size={16} />
              <span>Añadir Competidor ({players.length}/8)</span>
            </button>

            <button 
              className="btn-neon-pink w-100 mt-20"
              onClick={() => onNext('setup_rounds', { players })}
            >
              <span>SIGUIENTE: RONDAS</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP ROUNDS ───────────────────────────────────────────────── */}
      {step === 'setup_rounds' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <h2 className="font-graffiti text-glow-pink mb-10">CANTIDAD DE RONDAS</h2>
          <p className="step-sub">Elegí la duración de la batalla (1 a 20 rondas).</p>

          <div className="rounds-selector-widget">
            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.max(1, prev - 1))}
            >
              <Minus size={24} />
            </button>

            <div className="rounds-count-display">
              <span className="rounds-number">{roundsCount}</span>
              <span className="rounds-label">{roundsCount === 1 ? 'RONDA' : 'RONDAS'}</span>
            </div>

            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.min(20, prev + 1))}
            >
              <Plus size={24} />
            </button>
          </div>

          <p className="rounds-help-info">
            Tiempo estimado: ~{roundsCount * players.length * 2} minutos de freestyle.
          </p>

          <button 
            className="btn-neon-teal w-100 mt-20"
            onClick={() => onNext('setup_deck', { players, roundsCount })}
          >
            <span>SIGUIENTE: PALETA</span>
          </button>
        </div>
      )}

      {/* ── SETUP DECK & SPIN WHEEL ─────────────────────────────────────── */}
      {step === 'setup_deck' && (
        <div className="setup-card glass-panel glow-teal fade-in">
          <h2 className="font-graffiti text-glow-teal text-center mb-10">PALETA DE JUEGO</h2>
          <p className="step-sub text-center">Selecciona qué desafíos se incluirán en el mazo.</p>

          <div className="categories-grid scrollable-container">
            {categoriesList.map((cat) => (
              <div 
                key={cat.id} 
                className={`category-item-card ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="checkbox-indicator">
                  {selectedCategories.includes(cat.id) && <Check size={12} />}
                </div>
                <div className="category-card-info">
                  <h4>{cat.label}</h4>
                  <p>{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sorteo de Quién Empieza */}
          <div className="roulette-box glass-panel">
            <h3>🎰 ¿QUIÉN EMPIEZA EL JUEGO?</h3>
            
            <div className="roulette-display">
              {isSpinning ? (
                <span className="roulette-name spinning" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  {(playerAvatars[spinIndex]?.startsWith('/') || playerAvatars[spinIndex]?.startsWith('data:image/')) ? (
                    <img src={playerAvatars[spinIndex]} alt="" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span>{playerAvatars[spinIndex] || '🎤'}</span>
                  )}
                  <span>{players[spinIndex]}</span>
                </span>
              ) : startingPlayer ? (
                <div className="winner-announcement scale-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 245, 171, 0.1)', border: '1px solid var(--neon-teal)' }}>
                    {(playerAvatars[players.indexOf(startingPlayer)]?.startsWith('/') || playerAvatars[players.indexOf(startingPlayer)]?.startsWith('data:image/')) ? (
                      <img src={playerAvatars[players.indexOf(startingPlayer)]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.8rem' }}>{playerAvatars[players.indexOf(startingPlayer)] || '🎤'}</span>
                    )}
                  </div>
                  <span className="winner-name pink-text">{startingPlayer}</span>
                  <span className="winner-tag">¡Rima primero!</span>
                </div>
              ) : (
                <span className="roulette-placeholder">Sin sortear</span>
              )}
            </div>

            <button 
              className="btn-sortear"
              onClick={startSpinWheel}
              disabled={isSpinning}
            >
              <RefreshCw size={14} className={isSpinning ? 'spin' : ''} />
              <span>{startingPlayer ? 'SORTEAR OTRA VEZ' : 'REALIZAR SORTEO'}</span>
            </button>
          </div>

          <button 
            className="btn-neon-pink w-100 mt-20 pulse-pink-anim"
            onClick={() => {
              const finalStartingPlayer = players.includes(startingPlayer) ? startingPlayer : players[0];
              
              // Construir mapeo de jugador -> avatar emoji
              const avatarsMap: Record<string, string> = {};
              players.forEach((name, idx) => {
                avatarsMap[name] = playerAvatars[idx] || '🎤';
              });

              onNext('game', {
                mode: 'multiplayer',
                players,
                avatars: avatarsMap,
                roundsCount,
                selectedCategories,
                startingPlayer: finalStartingPlayer
              });
            }}
            disabled={isSpinning}
          >
            <span>INICIAR COMBATE</span>
          </button>
        </div>
      )}
    </div>
  );
};
