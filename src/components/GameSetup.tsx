import React, { useState, useEffect, useRef } from 'react';
import { Users, User, Play, Pause, ArrowLeft, Plus, Minus, UserPlus, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { BEATS_DECK, CHALLENGES_DECK } from '../data/cards';
import type { BeatCard, ChallengeCard } from '../data/cards';
import { useI18n } from '../i18n/LanguageContext';
import './GameSetup.css';

interface GameSetupProps {
  step: 'lobby_start' | 'tutorial_ask' | 'link_spotify' | 'mode_selection' | 'setup_individual' | 'setup_players' | 'setup_rounds' | 'setup_deck';
  userSession: any;
  onNext: (nextStep: string, data?: any) => void;
  onBack: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ step, userSession, onNext, onBack }) => {
  const { t } = useI18n();
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
    const rawAv = userSession?.avatar === 'crown' ? '' : userSession?.avatar;
    const defaultAvatar = userSession?.avatar_type === 'custom' && userSession?.custom_avatar_url 
      ? userSession.custom_avatar_url 
      : (rawAv || '🎤');
    return [defaultAvatar, '🔥'];
  });
  const [activeAvatarPicker, setActiveAvatarPicker] = useState<number | null>(null);
  const [roundsCount, setRoundsCount] = useState(3);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'palabras',
    'tematicas',
    'terminaciones',
    'beatbox',
    'versus',
    'freestyle'
  ]);
  const [allowRandomFreestyle, setAllowRandomFreestyle] = useState(false);

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

  // Vinculación de Spotify
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');

  const getApiUrl = (path: string) => {
    const base = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
    return `${base}${path}`;
  };

  const handleSpotifyConnect = () => {
    const token = localStorage.getItem('barrz_token');
    if (!token) {
      alert(t.auth.spotify_need_auth);
      return;
    }
    // Guardar pantalla de retorno
    sessionStorage.setItem('barrz_spotify_return_step', step);
    // Redirigir al login de Spotify
    window.location.href = getApiUrl(`/api/spotify/login?state=${encodeURIComponent(token)}`);
  };

  const handleSpotifyDisconnect = async () => {
    const token = localStorage.getItem('barrz_token');
    if (token) {
      try {
        await fetch(getApiUrl('/api/spotify/unlink'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error al desvincular Spotify en servidor:', err);
      }
    }
    localStorage.removeItem('barrz_spotify_linked');
    setIsSpotifyLinked(false);
  };

  useEffect(() => {
    const checkSpotifyStatus = async () => {
      const token = localStorage.getItem('barrz_token');
      if (!token) return;
      try {
        const res = await fetch(getApiUrl('/api/spotify/status'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.linked) {
          setIsSpotifyLinked(true);
          localStorage.setItem('barrz_spotify_linked', 'true');
        } else if (res.ok && !data.linked) {
          setIsSpotifyLinked(false);
          localStorage.removeItem('barrz_spotify_linked');
        }
      } catch (e) {
        setIsSpotifyLinked(localStorage.getItem('barrz_spotify_linked') === 'true');
      }
    };

    checkSpotifyStatus();
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
          const rawAv = userSession.avatar === 'crown' ? '' : userSession.avatar;
          next[0] = userSession.avatar_type === 'custom' && userSession.custom_avatar_url 
            ? userSession.custom_avatar_url 
            : (rawAv || '🎤');
          return next;
        }
        return prev;
      });
    }
  }, [userSession]);

  const categoriesList = [
    { id: 'palabras', label: t.categories.palabras, desc: t.categories.palabras_desc },
    { id: 'tematicas', label: t.categories.tematicas, desc: t.categories.tematicas_desc },
    { id: 'terminaciones', label: t.categories.terminaciones, desc: t.categories.terminaciones_desc },
    { id: 'beatbox', label: t.categories.beatbox, desc: t.categories.beatbox_desc },
    { id: 'versus', label: t.categories.versus, desc: t.categories.versus_desc },
    { id: 'freestyle', label: t.categories.freestyle, desc: t.categories.freestyle_desc }
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

  return (
    <div className="setup-outer-container">
      <div className="grunge-overlay"></div>

      {/* Botón de volver */}
      <button className="btn-setup-back" onClick={onBack}>
        <span>{t.common.back}</span>
      </button>

      {/* ── LOBBY START ────────────────────────────────────────────────── */}
      {step === 'lobby_start' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <div className="lobby-user-badge">
            <span className="user-icon">🔥</span>
            <span>{t.setup.session_label}: {userSession?.email || 'Freestyler'}</span>
          </div>

          <h1 className="logo-title-large">
            <img src="/Barrzjuego.png" alt="BARRZ" className="setup-logo-img" />
          </h1>
          <div className="logo-sub-urban">{t.setup.lobby_title}</div>

          <p className="lobby-desc">
            {t.setup.lobby_desc}
          </p>

          <button className="btn-comenzar pulse-pink-anim" onClick={() => onNext('tutorial_ask')}>
            <Play size={22} fill="currentColor" />
            <span>{t.setup.start_btn}</span>
          </button>
        </div>
      )}

      {/* ── TUTORIAL / REGLAS DIRECTO ──────────────────────────────────── */}
      {step === 'tutorial_ask' && (
        <div className="tutorial-card-view fade-in">
          <div className="tutorial-card-wrapper" onClick={() => onNext(isSpotifyLinked ? 'mode_selection' : 'link_spotify')}>
            <img 
              src="/CARTAS DESAFIO/carta REGLAS JUEGO.png" 
              alt="Reglas del Juego" 
              className="tutorial-full-card" 
            />
            <button 
              className="tutorial-continue-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNext(isSpotifyLinked ? 'mode_selection' : 'link_spotify');
              }}
            >
              <span>{t.setup.tutorial_continue}</span>
              <Play size={16} fill="currentColor" />
            </button>
          </div>
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
          
          <h2 className="font-graffiti text-glow-teal mt-10">{t.setup.spotify_title}</h2>
          <p className="step-description">
            {t.setup.spotify_desc}
          </p>

          <div className="spotify-link-action-box">
            <button 
              type="button" 
              className={`btn-spotify-link-setup ${isSpotifyLinked ? 'linked' : ''}`}
              onClick={isSpotifyLinked ? handleSpotifyDisconnect : handleSpotifyConnect}
            >
              {isSpotifyLinked ? t.setup.spotify_disconnect : t.setup.spotify_connect}
            </button>
            {isSpotifyLinked && (
              <span className="spotify-user-meta font-base">
                {t.setup.spotify_streaming_active}
              </span>
            )}
          </div>

          <button className="btn-neon-pink w-100 mt-20" onClick={() => onNext('mode_selection')}>
            <span>{t.setup.continue_to_modes}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ── MODE SELECTION ─────────────────────────────────────────────── */}
      {step === 'mode_selection' && (
        <div className="setup-card glass-panel glow-pink fade-in">
          <h2 className="font-graffiti text-glow-pink text-center mb-20">{t.setup.mode_title}</h2>
          <p className="step-sub text-center">{t.setup.mode_desc}</p>

          <div className="modes-stack">
            <button 
              className="mode-option-card"
              onClick={() => onNext('setup_players')}
            >
              <div className="mode-option-header">
                <Users size={20} className="pink-text" />
                <h3>{t.setup.mode_multi}</h3>
              </div>
              <p>{t.setup.mode_multi_desc}</p>
            </button>

            <button 
              className="mode-option-card"
              onClick={() => onNext('setup_individual')}
            >
              <div className="mode-option-header">
                <User size={20} className="pink-text" />
                <h3>{t.setup.mode_solo}</h3>
              </div>
              <p>{t.setup.mode_solo_desc}</p>
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
                <span>{t.common.back}</span>
              </button>
              <h2 className="font-graffiti text-glow-teal">{t.setup.individual_title}</h2>
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
                {t.setup.solo_random_tab}
              </button>
              <button
                className={`individual-tab ${individualSubMode === 'custom' ? 'active' : ''}`}
                onClick={() => setIndividualSubMode('custom')}
              >
                {t.setup.solo_custom_tab}
              </button>
            </div>

            {/* Aleatorio mode */}
            {individualSubMode === 'random' && (
              <div className="individual-random-content fade-in">
                <div className="random-mode-card glass-panel">
                  <div className="random-icon">🎲</div>
                  <h3>{t.setup.solo_random_title}</h3>
                  <p>{t.setup.solo_random_desc}</p>
                  <div className="random-features">
                    <span className="feature-chip">{t.setup.chip_random_beat}</span>
                    <span className="feature-chip">{t.setup.chip_random_challenge}</span>
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
                    <h3 className="teal-text">{t.setup.choose_beat}</h3>
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
                              title={previewingBeatId === beat.id ? 'Pausar' : 'Escuchar'}
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
                    <h3 className="pink-text">{t.setup.choose_challenge}</h3>
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
                  <span>{t.setup.select_beat_and_challenge}</span>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>{t.setup.start_solo_btn}</span>
                  </>
                )}
              </button>
            </div>

            {/* MOSAICO DE TEMÁTICAS MODAL */}
            {showThemesMosaic && (
              <div className="themes-mosaic-overlay fade-in">
                <div className="themes-mosaic-container glass-panel glow-pink">
                  <div className="themes-mosaic-header">
                    <h2 className="font-graffiti text-glow-pink">{t.setup.select_theme_title}</h2>
                    <p className="themes-mosaic-subtitle font-base">{t.setup.select_theme_desc}</p>
                  </div>

                  <div className="themes-mosaic-grid">
                    {CHALLENGES_DECK.filter(c => c.category === 'tematicas' && c.id !== 'challenge-tematicas-libre').map((card) => (
                      <div 
                        key={card.id} 
                        className="theme-mosaic-card glow-pink" 
                        onClick={() => setExpandedThemeCard(card)}
                      >
                        <h4 className="theme-card-title">{card.title}</h4>
                        <div className="theme-card-preview font-base">{card.highlightText || t.setup.theme_badge}</div>
                      </div>
                    ))}
                  </div>

                  <button className="btn-close-mosaic font-base" onClick={() => setShowThemesMosaic(false)}>
                    {t.setup.close_mosaic_btn}
                  </button>
                </div>
              </div>
            )}

            {/* CARD EXPANDED FULLSCREEN MODAL */}
            {expandedThemeCard && (
              <div className="theme-expanded-overlay fade-in">
                <div className="theme-expanded-card glass-panel glow-pink">
                  <span className="expanded-card-badge">{t.setup.theme_badge}</span>
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
                      {t.setup.confirm_theme_selection}
                    </button>
                    <button 
                      className="btn-expanded-back font-base"
                      onClick={() => setExpandedThemeCard(null)}
                    >
                      {t.setup.back_to_mosaic}
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
          <h2 className="font-graffiti text-glow-teal text-center mb-10">{t.setup.players_title}</h2>
          <p className="step-sub text-center">{t.setup.players_sub}</p>

          <div className="players-list-inputs scrollable-container">
            {players.map((playerName, index) => (
              <div key={index} className="player-input-row-container">
                <div className="player-input-row fade-in">
                  <span className="player-number-label">#{index + 1}</span>
                  
                  <button
                    type="button"
                    className="player-avatar-btn"
                    onClick={() => setActiveAvatarPicker(activeAvatarPicker === index ? null : index)}
                    title="Avatar"
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
                    placeholder={`${t.setup.player_placeholder} ${index + 1}`}
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
              <span>{t.setup.add_player} ({players.length}/8)</span>
            </button>

            <button 
              className="btn-neon-pink w-100 mt-20"
              onClick={() => onNext('setup_rounds', { players })}
            >
              <span>{t.setup.next_rounds_btn}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP ROUNDS ───────────────────────────────────────────────── */}
      {step === 'setup_rounds' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <h2 className="font-graffiti text-glow-pink mb-10">{t.setup.rounds_title}</h2>
          <p className="step-sub">{t.setup.rounds_sub}</p>

          <div className="rounds-selector-widget">
            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.max(1, prev - 1))}
            >
              <Minus size={24} />
            </button>

            <div className="rounds-count-display">
              <span className="rounds-number">{roundsCount}</span>
              <span className="rounds-label">{roundsCount === 1 ? t.common.round.toUpperCase() : t.common.rounds.toUpperCase()}</span>
            </div>

            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.min(20, prev + 1))}
            >
              <Plus size={24} />
            </button>
          </div>

          <p className="rounds-help-info">
            {t.setup.rounds_time_est} ~{roundsCount * players.length * 2} {t.setup.rounds_time_est_end}
          </p>

          <button 
            className="btn-neon-teal w-100 mt-20"
            onClick={() => onNext('setup_deck', { players, roundsCount })}
          >
            <span>{t.setup.next_deck_btn}</span>
          </button>
        </div>
      )}

      {/* ── SETUP DECK & SPIN WHEEL ─────────────────────────────────────── */}
      {step === 'setup_deck' && (
        <div className="setup-card glass-panel glow-teal fade-in">
          <h2 className="font-graffiti text-glow-teal text-center mb-10">{t.setup.deck_title}</h2>
          <p className="step-sub text-center">{t.setup.deck_sub}</p>

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

          {/* Freestyle Libre Aleatorio Toggle */}
          <div 
            className={`category-item-card ${allowRandomFreestyle ? 'active' : ''}`}
            style={{ marginTop: '20px', borderColor: allowRandomFreestyle ? 'var(--neon-pink)' : 'var(--glass-border)' }}
            onClick={() => setAllowRandomFreestyle(!allowRandomFreestyle)}
          >
            <div className="checkbox-indicator" style={{ backgroundColor: allowRandomFreestyle ? 'var(--neon-pink)' : 'transparent', borderColor: allowRandomFreestyle ? 'var(--neon-pink)' : 'var(--text-muted)' }}>
              {allowRandomFreestyle && <Check size={12} />}
            </div>
            <div className="category-card-info">
              <h4>{t.setup.allow_freestyle_random}</h4>
              <p>{t.setup.allow_freestyle_random_desc}</p>
            </div>
          </div>

          {/* Sorteo de Quién Empieza */}
          <div className="roulette-box glass-panel">
            <h3>{t.setup.who_starts}</h3>
            
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
                  <span className="winner-tag">{t.setup.starts_turn}</span>
                </div>
              ) : (
                <span className="roulette-placeholder">{t.setup.not_spun}</span>
              )}
            </div>

            <button 
              className="btn-sortear"
              onClick={startSpinWheel}
              disabled={isSpinning}
            >
              <RefreshCw size={14} className={isSpinning ? 'spin' : ''} />
              <span>{startingPlayer ? t.setup.spin_again : t.setup.spin_roulette}</span>
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
                startingPlayer: finalStartingPlayer,
                allowRandomFreestyle
              });
            }}
            disabled={isSpinning}
          >
            <span>{t.setup.start_battle_btn}</span>
          </button>
        </div>
      )}
    </div>
  );
};
