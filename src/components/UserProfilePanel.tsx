import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, History, X, LogOut, Sliders, Flame, Award, Edit2, Check, Camera, Trash2, Globe } from 'lucide-react';
import { BattleDetailView } from './BattleDetailView';
import { useI18n } from '../i18n/LanguageContext';
import './UserProfilePanel.css';

const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
  return `${base}${path}`;
};

interface UserProfilePanelProps {
  gameState: string;
  userSession: any;
  onLogout?: () => void;
  onProfileUpdate?: (updatedSession: any) => void;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ gameState, userSession, onLogout, onProfileUpdate }) => {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');

  // Ajustes y Perfil persistidos localmente
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('barrz_user_avatar') || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [lobbyVolume, setLobbyVolume] = useState<number>(() => {
    const saved = localStorage.getItem('barrz_lobby_volume');
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');

  // Verificar estado de vinculación de Spotify al abrir el panel
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('barrz_token');
      if (token) {
        fetch(getApiUrl('/api/spotify/status'), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.linked) {
              setIsSpotifyLinked(true);
              localStorage.setItem('barrz_spotify_linked', 'true');
            } else {
              setIsSpotifyLinked(false);
              localStorage.removeItem('barrz_spotify_linked');
            }
          })
          .catch(() => {
            setIsSpotifyLinked(localStorage.getItem('barrz_spotify_linked') === 'true');
          });
      } else {
        setIsSpotifyLinked(false);
      }
    }
  }, [isOpen]);

  const handleConnectSpotify = () => {
    const token = localStorage.getItem('barrz_token');
    if (!token) {
      alert('Debes iniciar sesión con tu cuenta para asociar Spotify.');
      return;
    }
    sessionStorage.setItem('barrz_spotify_return_step', gameState);
    window.location.href = getApiUrl(`/api/spotify/login?state=${encodeURIComponent(token)}`);
  };

  const handleDisconnectSpotify = async () => {
    const token = localStorage.getItem('barrz_token');
    if (token) {
      try {
        await fetch(getApiUrl('/api/spotify/unlink'), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Error al desvincular Spotify:', err);
      }
    }
    localStorage.removeItem('barrz_spotify_linked');
    setIsSpotifyLinked(false);
    triggerSaveToast();
  };

  // Estados para la edición de perfil
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado para la pantalla de detalle de partida
  const [selectedBattle, setSelectedBattle] = useState<any | null>(null);

  // Avatares disponibles (Emojis estilo Hip-Hop y Urbano)
  const avatars = ['🎤', '🔥', '🎧', '👑', '👽', '⚡', '🎸', '🚀', '💀', '💥', '🛹', '🕶️'];

  // Sincronizar campo temporal de nombre cuando cambie la sesión
  useEffect(() => {
    if (userSession?.username) {
      setTempUsername(userSession.username);
    }
  }, [userSession]);

  // Determinar avatar actual y su tipo (descartar 'crown' por defecto a vacío)
  const rawAvatar = userSession?.loggedIn
    ? (userSession.avatar_type === 'custom' ? userSession.custom_avatar_url : userSession.avatar)
    : selectedAvatar;

  const currentAvatarSrc = (rawAvatar === 'crown' || rawAvatar === 'null' || !rawAvatar) ? '' : rawAvatar;

  const isCustomAvatar = userSession?.loggedIn
    ? userSession.avatar_type === 'custom' && Boolean(userSession.custom_avatar_url)
    : currentAvatarSrc.startsWith('data:image/');

  // Guardar configuración en localStorage o en base de datos si está logueado
  const handleAvatarChange = async (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('barrz_user_avatar', avatar);

    if (userSession?.loggedIn) {
      try {
        const token = localStorage.getItem('barrz_token');
        const res = await fetch(getApiUrl('/api/auth/update-profile'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            avatar: avatar,
            avatar_type: 'preset',
            custom_avatar_url: null
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (onProfileUpdate) {
            onProfileUpdate({
              ...userSession,
              avatar: data.user.avatar,
              avatar_type: data.user.avatar_type,
              custom_avatar_url: data.user.custom_avatar_url
            });
          }
          triggerSaveToast();
        }
      } catch (err) {
        console.error('Error al actualizar avatar:', err);
      }
    } else {
      triggerSaveToast();
    }
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite es de 10MB.');
      return;
    }

    // Comprimir con canvas antes de subir (max 300x300, JPEG 80%)
    const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const MAX_SIZE = 300;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
        img.src = objectUrl;
      });
    };

    try {
      const base64String = await compressImage(file);

      if (userSession?.loggedIn) {
        const token = localStorage.getItem('barrz_token');
        const res = await fetch(getApiUrl('/api/auth/update-profile'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            avatar: 'custom',
            avatar_type: 'custom',
            custom_avatar_url: base64String
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (onProfileUpdate) {
            onProfileUpdate({
              ...userSession,
              avatar: data.user.avatar,
              avatar_type: data.user.avatar_type,
              custom_avatar_url: data.user.custom_avatar_url
            });
          }
          triggerSaveToast();
        } else {
          alert(data.error || 'Error al subir imagen.');
        }
      } else {
        setSelectedAvatar(base64String);
        localStorage.setItem('barrz_user_avatar', base64String);
        triggerSaveToast();
      }
    } catch (err) {
      console.error('Error al subir avatar:', err);
      alert('Error al procesar la imagen. Intenta con otra foto.');
    }
  };

  const handleRemoveCustomAvatar = async () => {
    handleAvatarChange('');
  };

  const handleSaveUsername = async () => {
    if (tempUsername.trim().length < 3) {
      setErrorMsg('Mínimo 3 caracteres.');
      return;
    }
    setErrorMsg('');

    if (userSession?.loggedIn) {
      try {
        const token = localStorage.getItem('barrz_token');
        const res = await fetch(getApiUrl('/api/auth/update-profile'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            username: tempUsername.trim()
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (onProfileUpdate) {
            onProfileUpdate({
              ...userSession,
              username: data.user.username
            });
          }
          setIsEditingUsername(false);
          triggerSaveToast();
        } else {
          setErrorMsg(data.error || 'Error al actualizar.');
        }
      } catch (err) {
        console.error('Error al actualizar nombre de usuario:', err);
        setErrorMsg('Error al conectar con el servidor.');
      }
    } else {
      setIsEditingUsername(false);
      triggerSaveToast();
    }
  };

  const handleLobbyVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLobbyVolume(val);
    localStorage.setItem('barrz_lobby_volume', String(val));
    window.dispatchEvent(new CustomEvent('barrz_lobby_volume_changed', { detail: val }));
  };

  const triggerSaveToast = () => {
    setShowSavedAlert(true);
    setTimeout(() => setShowSavedAlert(false), 1500);
  };

  if (gameState === 'game') return null;

  return (
    <>
      {/* Botones de Control en Esquina Superior Derecha */}
      <div className="top-profile-bar-row">
        <button 
          type="button" 
          className="btn-top-profile-action btn-settings-trigger"
          onClick={() => { setActiveTab('settings'); setIsOpen(true); }}
          title="Ajustes de Usuario"
        >
          <Settings size={20} />
        </button>

        <button 
          type="button" 
          className="btn-top-profile-action btn-user-trigger glow-pink-btn"
          onClick={() => { setActiveTab('profile'); setIsOpen(true); }}
          title="Perfil de Competidor"
          style={{ padding: isCustomAvatar ? '0' : '' }}
        >
          {isCustomAvatar ? (
            <img src={currentAvatarSrc} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : currentAvatarSrc ? (
            <span className="user-trigger-avatar">{currentAvatarSrc}</span>
          ) : (
            <User size={19} className="user-trigger-empty-icon" />
          )}
        </button>
      </div>

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div className="profile-drawer-backdrop" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Cajón Lateral Deslizable */}
      <div className={`profile-side-drawer glass-panel ${isOpen ? 'open' : ''}`}>
        
        {/* Encabezado del Cajón */}
        <div className="drawer-header">
          <div className="drawer-title-wrapper">
            <User size={22} className="pink-text" />
            <h2 className="font-graffiti">{t.profile.control_panel}</h2>
          </div>
          <button type="button" className="btn-drawer-close" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="drawer-tabs-bar">
          <button 
            type="button" 
            className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Flame size={16} />
            <span>{t.profile.tab_profile}</span>
          </button>
          <button 
            type="button" 
            className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>{t.profile.tab_history}</span>
          </button>
          <button 
            type="button" 
            className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={16} />
            <span>{t.profile.tab_settings}</span>
          </button>
        </div>

        {/* Contenido del Cajón */}
        <div className="drawer-body">
          
          {/* TAB 1: PERFIL */}
          {activeTab === 'profile' && (
            <div className="drawer-tab-content fade-in">
              <div className="profile-hero-section">
                
                {/* Visualización de Avatar con opción de carga de foto */}
                <div className="profile-avatar-display-wrapper">
                  <div className="profile-avatar-display" style={{ padding: isCustomAvatar ? '0' : '' }}>
                    {isCustomAvatar ? (
                      <img src={currentAvatarSrc} alt="Avatar" className="avatar-img-round-full" />
                    ) : currentAvatarSrc ? (
                      <span className="avatar-main-emoji">{currentAvatarSrc}</span>
                    ) : (
                      <User size={34} className="avatar-empty-user-icon" />
                    )}
                  </div>
                  
                  {/* Botón flotante para subir foto */}
                  <button 
                    type="button" 
                    className="btn-upload-avatar-trigger"
                    onClick={() => fileInputRef.current?.click()}
                    title={t.profile.upload_photo}
                  >
                    <Camera size={14} />
                  </button>
                  
                  {/* Botón flotante para eliminar foto si es custom */}
                  {isCustomAvatar && (
                    <button 
                      type="button" 
                      className="btn-remove-avatar-trigger"
                      onClick={handleRemoveCustomAvatar}
                      title="Quitar foto y usar predeterminado"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                  />
                </div>

                {/* Nombre de usuario editable */}
                <div className="profile-username-container">
                  {isEditingUsername ? (
                    <div className="username-edit-inline-row">
                      <input 
                        type="text" 
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        maxLength={15}
                        className="username-edit-input"
                        placeholder="Nombre de usuario"
                        autoFocus
                      />
                      <button 
                        type="button" 
                        className="btn-username-save"
                        onClick={handleSaveUsername}
                        title="Guardar nombre"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="btn-username-cancel"
                        onClick={() => {
                          setIsEditingUsername(false);
                          setTempUsername(userSession?.username || '');
                          setErrorMsg('');
                        }}
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="username-view-row">
                      <h3 className="profile-name-text font-base">{userSession?.username || 'Invitado'}</h3>
                      <button 
                        type="button" 
                        className="btn-username-edit-trigger"
                        onClick={() => setIsEditingUsername(true)}
                        title={t.profile.username_edit}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  {errorMsg && <p className="username-error-inline">{errorMsg}</p>}
                  <p className="profile-email-sub">{userSession?.email || 'Sesión local (Invitado)'}</p>
                </div>

                <span className="profile-rank-pill">
                  <Award size={12} />
                  <span>{t.profile.rank_pill}</span>
                </span>
              </div>

              {/* Selector Desplegable de Avatares */}
              <div className="avatar-picker-compact-section">
                <button 
                  type="button" 
                  className={`btn-toggle-avatar-picker ${showAvatarPicker ? 'active' : ''}`}
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                >
                  <span>{showAvatarPicker ? t.profile.hide_avatars : t.profile.choose_preset_avatar}</span>
                </button>

                {showAvatarPicker && (
                  <div className="avatar-selection-box fade-in">
                    <div className="avatars-grid">
                      {avatars.map((av) => (
                        <button 
                          key={av} 
                          type="button" 
                          className={`avatar-grid-item ${(!isCustomAvatar && currentAvatarSrc === av) ? 'selected' : ''}`}
                          onClick={() => {
                            handleAvatarChange(av);
                            setShowAvatarPicker(false);
                          }}
                          title={`Seleccionar avatar ${av}`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Estadísticas de Batalla */}
              <div className="stats-box-section">
                <h4 className="section-subtitle font-base">{t.profile.stats_subtitle}</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value text-glow-teal">{userSession?.stats?.totalBattles ?? 0}</span>
                    <span className="stat-label">{t.profile.battles}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">{userSession?.stats?.wins ?? 0}</span>
                    <span className="stat-label">{t.profile.wins}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-teal">{userSession?.stats?.winRate ?? 0}%</span>
                    <span className="stat-label">{t.profile.win_rate}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">{userSession?.stats?.maxPoints ?? 0}</span>
                    <span className="stat-label">{t.profile.max_pts}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL */}
          {activeTab === 'history' && (
            <div className="drawer-tab-content fade-in">
              <h4 className="section-subtitle font-base mb-10">{t.profile.recent_battles}</h4>
              <div className="history-list">
                {!userSession?.history || userSession.history.length === 0 ? (
                  <p className="history-empty-message">
                    {t.profile.no_history}
                  </p>
                ) : (
                  userSession.history.map((item: any) => {
                    let badgeClass = 'win-badge';
                    let badgeText = t.common.win;
                    let cardClass = 'win';

                    if (item.result === 'loss') {
                      badgeClass = 'loss-badge';
                      badgeText = t.common.loss;
                      cardClass = 'loss';
                    } else if (item.result === 'draw') {
                      badgeClass = 'draw-badge';
                      badgeText = t.common.draw;
                      cardClass = 'draw';
                    } else if (item.result === 'complete') {
                      badgeClass = 'complete-badge';
                      badgeText = t.common.complete;
                      cardClass = 'complete';
                    }

                    const dateStr = new Date(item.battleDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const battleType = item.mode === 'solo'
                      ? `${t.common.solo_mode} (${item.roundsCount} ${item.roundsCount === 1 ? t.common.round : t.common.rounds})`
                      : `${t.common.multi_mode} (${item.roundsCount} ${item.roundsCount === 1 ? t.common.round : t.common.rounds})`;

                    return (
                      <div key={item.id} className={`history-card ${cardClass}`}>
                        <div className="history-card-header">
                          <span className={`history-badge ${badgeClass}`}>{badgeText}</span>
                          <span className="history-time-ago font-base">{dateStr}</span>
                        </div>
                        <div className="history-card-body">
                          <span className="history-battle-type">{battleType}</span>
                          <span className="history-score-val font-base">
                            {item.playerRank ? `#${item.playerRank} • ` : ''}
                            +{item.points} {t.common.points}
                          </span>
                        </div>
                        <button
                          className="history-detail-toggle"
                          onClick={() => setSelectedBattle(item)}
                        >
                          {t.profile.view_details}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AJUSTES */}
          {activeTab === 'settings' && (
            <div className="drawer-tab-content fade-in">
              <h4 className="section-subtitle font-base mb-10">{t.settings.title}</h4>
              
              <div className="settings-controls-stack">
                {/* Control de Idioma */}
                <div className="setting-row-vertical">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Globe size={18} className="teal-text" />
                    <span className="setting-title font-base">{t.settings.language_title}</span>
                  </div>
                  <span className="setting-desc mb-10">{t.settings.language_desc}</span>
                  <div className="settings-buttons-group">
                    <button 
                      type="button" 
                      className={`btn-group-option ${language === 'es' ? 'active' : ''}`}
                      onClick={() => {
                        setLanguage('es');
                        triggerSaveToast();
                      }}
                    >
                      ESPAÑOL 🇪🇸
                    </button>
                    <button 
                      type="button" 
                      className={`btn-group-option ${language === 'en' ? 'active' : ''}`}
                      onClick={() => {
                        setLanguage('en');
                        triggerSaveToast();
                      }}
                    >
                      ENGLISH 🇺🇸
                    </button>
                  </div>
                </div>

                {/* Control Volumen de Música Lobby */}
                <div className="setting-row-vertical">
                  <div className="setting-info mb-10">
                    <span className="setting-title font-base">{t.settings.lobby_volume_title}</span>
                    <span className="setting-desc">{t.settings.lobby_volume_desc}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={lobbyVolume}
                      onChange={handleLobbyVolumeChange}
                      style={{
                        flex: 1,
                        accentColor: 'var(--neon-pink)',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    />
                    <span className="font-base" style={{ fontSize: '0.8rem', color: 'var(--neon-teal)', minWidth: '40px', textAlign: 'right' }}>
                      {Math.round(lobbyVolume * 100)}%
                    </span>
                  </div>
                </div>

                {/* Integración de Spotify */}
                <div className="setting-row-vertical" style={{ background: 'rgba(29, 185, 84, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(29, 185, 84, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#1DB954">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.31c-.22.36-.68.48-1.04.26-2.91-1.78-6.58-2.18-10.9-1.2-.42.09-.83-.17-.92-.59-.09-.41.17-.83.59-.92 4.73-1.08 8.78-.62 12.01 1.36.36.21.48.67.26 1.09zm1.46-3.26c-.28.45-.87.6-1.32.32-3.33-2.05-8.41-2.65-12.35-1.45-.51.15-1.04-.14-1.2-.66-.15-.51.14-1.04.66-1.2 4.51-1.37 10.12-.7 13.9 1.63.45.27.6.86.31 1.36zm.1-3.38C15.2 8.35 8.86 8.14 5.17 9.26c-.57.17-1.16-.16-1.33-.73-.17-.57.16-1.16.73-1.33 4.23-1.28 11.23-1.04 15.67 1.59.51.3 1.17.47 1.47-.04.3-.51.13-1.17-.38-1.47z"/>
                      </svg>
                      <span className="setting-title font-base">{t.settings.spotify_title}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSpotifyLinked ? '#1DB954' : 'var(--text-muted)' }}>
                      {isSpotifyLinked ? t.settings.spotify_linked_badge : t.settings.spotify_unlinked_badge}
                    </span>
                  </div>
                  <span className="setting-desc mb-10">
                    {isSpotifyLinked 
                      ? t.settings.spotify_desc_linked 
                      : t.settings.spotify_desc_unlinked}
                  </span>
                  <button
                    type="button"
                    className={`btn-group-option ${isSpotifyLinked ? 'active' : ''}`}
                    onClick={isSpotifyLinked ? handleDisconnectSpotify : handleConnectSpotify}
                    style={{
                      width: '100%',
                      borderColor: isSpotifyLinked ? 'rgba(255, 0, 127, 0.4)' : '#1DB954',
                      color: isSpotifyLinked ? 'var(--neon-pink)' : '#1DB954',
                      background: 'rgba(0, 0, 0, 0.35)'
                    }}
                  >
                    {isSpotifyLinked ? t.settings.spotify_btn_disconnect : t.settings.spotify_btn_connect}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer del Cajón */}
        <div className="drawer-footer">
          <div className="drawer-footer-text font-base">
            BARRZ FREESTYLE LAB v1.0.0
          </div>
          {userSession && (
            <button 
              type="button" 
              className="btn-drawer-logout"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  localStorage.removeItem('barrz_session');
                  localStorage.removeItem('barrz_token');
                  localStorage.removeItem('barrz_spotify_linked');
                  window.location.reload();
                }
                setIsOpen(false);
              }}
            >
              <LogOut size={16} />
              <span>{t.profile.logout}</span>
            </button>
          )}
        </div>

        {/* Alerta de guardado */}
        <div className={`save-toast-alert ${showSavedAlert ? 'show' : ''}`}>
          {t.common.saved}
        </div>

      </div>

      {/* Pantalla completa de detalle de la batalla */}
      {selectedBattle && (
        <BattleDetailView 
          battle={selectedBattle} 
          onBack={() => setSelectedBattle(null)} 
        />
      )}
    </>
  );
};
