import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, History, X, LogOut, Sliders, Flame, Award, Edit2, Check, Camera, Trash2 } from 'lucide-react';
import { BattleDetailView } from './BattleDetailView';
import './UserProfilePanel.css';

const getApiUrl = (path: string) => {
  const isProd = import.meta.env.PROD;
  const baseUrl = isProd ? window.location.origin : 'http://localhost:3001';
  return `${baseUrl}${path}`;
};

interface UserProfilePanelProps {
  gameState: string;
  userSession: any;
  onLogout?: () => void;
  onProfileUpdate?: (updatedSession: any) => void;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ gameState, userSession, onLogout, onProfileUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');

  // Ajustes y Perfil persistidos localmente
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('barrz_user_avatar') || '🎤');
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('barrz_sfx') !== 'false');
  const [visualMetronome, setVisualMetronome] = useState(() => localStorage.getItem('barrz_visual_metronome') !== 'false');
  const [beatQuality, setBeatQuality] = useState(() => localStorage.getItem('barrz_beat_quality') || 'high');
  const [language, setLanguage] = useState(() => localStorage.getItem('barrz_language') || 'es');
  const [lobbyVolume, setLobbyVolume] = useState<number>(() => {
    const saved = localStorage.getItem('barrz_lobby_volume');
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const [showSavedAlert, setShowSavedAlert] = useState(false);

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

  // Determinar avatar actual y su tipo
  const isCustomAvatar = userSession?.loggedIn
    ? userSession.avatar_type === 'custom' && userSession.custom_avatar_url
    : selectedAvatar.startsWith('data:image/');

  const currentAvatarSrc = userSession?.loggedIn
    ? (userSession.avatar_type === 'custom' ? userSession.custom_avatar_url : userSession.avatar)
    : selectedAvatar;

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
            avatar: 'crown',
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
    handleAvatarChange('🎤');
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

  const toggleSfx = () => {
    const nextVal = !sfxEnabled;
    setSfxEnabled(nextVal);
    localStorage.setItem('barrz_sfx', String(nextVal));
    triggerSaveToast();
  };

  const toggleMetronome = () => {
    const nextVal = !visualMetronome;
    setVisualMetronome(nextVal);
    localStorage.setItem('barrz_visual_metronome', String(nextVal));
    triggerSaveToast();
  };

  const handleBeatQualityChange = (quality: 'high' | 'std') => {
    setBeatQuality(quality);
    localStorage.setItem('barrz_beat_quality', quality);
    triggerSaveToast();
  };

  const handleLanguageChange = (lang: 'es' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('barrz_language', lang);
    triggerSaveToast();
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
          ) : (
            <span className="user-trigger-avatar">{currentAvatarSrc || '🎤'}</span>
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
            <h2 className="font-graffiti">PANEL DE CONTROL</h2>
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
            <span>Perfil</span>
          </button>
          <button 
            type="button" 
            className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Historial</span>
          </button>
          <button 
            type="button" 
            className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={16} />
            <span>Ajustes</span>
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
                    ) : (
                      <span className="avatar-main-emoji">{currentAvatarSrc || '🎤'}</span>
                    )}
                  </div>
                  
                  {/* Botón flotante para subir foto */}
                  <button 
                    type="button" 
                    className="btn-upload-avatar-trigger"
                    onClick={() => fileInputRef.current?.click()}
                    title="Subir foto de perfil"
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
                        title="Editar nombre de usuario"
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
                  <span>PROMESA DE LA RIMA</span>
                </span>
              </div>

              {/* Selector de Avatares */}
              <div className="avatar-selection-box">
                <h4 className="section-subtitle font-base">Elegí tu Avatar</h4>
                <div className="avatars-grid">
                  {avatars.map((av) => (
                    <button 
                      key={av} 
                      type="button" 
                      className={`avatar-grid-item ${(!isCustomAvatar && currentAvatarSrc === av) ? 'selected' : ''}`}
                      onClick={() => handleAvatarChange(av)}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estadísticas de Batalla */}
              <div className="stats-box-section">
                <h4 className="section-subtitle font-base">Estadísticas de Rimas</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value text-glow-teal">{userSession?.stats?.totalBattles ?? 0}</span>
                    <span className="stat-label">Batallas</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">{userSession?.stats?.wins ?? 0}</span>
                    <span className="stat-label">Victorias</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-teal">{userSession?.stats?.winRate ?? 0}%</span>
                    <span className="stat-label">Win Rate</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">{userSession?.stats?.maxPoints ?? 0}</span>
                    <span className="stat-label">Max Pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL */}
          {activeTab === 'history' && (
            <div className="drawer-tab-content fade-in">
              <h4 className="section-subtitle font-base mb-10">Partidas Recientes</h4>
              <div className="history-list">
                {!userSession?.history || userSession.history.length === 0 ? (
                  <p className="history-empty-message">
                    Aún no jugaste ninguna batalla. ¡Inicia un combate para empezar tu registro!
                  </p>
                ) : (
                  userSession.history.map((item: any) => {
                    let badgeClass = 'win-badge';
                    let badgeText = 'VICTORIA';
                    let cardClass = 'win';

                    if (item.result === 'loss') {
                      badgeClass = 'loss-badge';
                      badgeText = 'DERROTA';
                      cardClass = 'loss';
                    } else if (item.result === 'draw') {
                      badgeClass = 'draw-badge';
                      badgeText = 'EMPATE';
                      cardClass = 'draw';
                    } else if (item.result === 'complete') {
                      badgeClass = 'complete-badge';
                      badgeText = 'COMPLETADO';
                      cardClass = 'complete';
                    }

                    const dateStr = new Date(item.battleDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const battleType = item.mode === 'solo'
                      ? `Cypher Solitario (${item.roundsCount} ${item.roundsCount === 1 ? 'ronda' : 'rondas'})`
                      : `Batalla Grupal (${item.roundsCount} ${item.roundsCount === 1 ? 'ronda' : 'rondas'})`;

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
                            +{item.points} Pts
                          </span>
                        </div>
                        <button
                          className="history-detail-toggle"
                          onClick={() => setSelectedBattle(item)}
                        >
                          Ver detalles de la batalla →
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
              <h4 className="section-subtitle font-base mb-10">Preferencias de Juego</h4>
              
              <div className="settings-controls-stack">
                {/* Control Efectos de Sonido */}
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-title font-base">Efectos de Sonido</span>
                    <span className="setting-desc">Activar clics y alertas de cronómetro</span>
                  </div>
                  <button 
                    type="button" 
                    className={`setting-switch ${sfxEnabled ? 'active' : ''}`}
                    onClick={toggleSfx}
                  >
                    <span className="switch-knob"></span>
                  </button>
                </div>

                {/* Control Metrónomo Visual */}
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-title font-base">Metrónomo en Juego</span>
                    <span className="setting-desc">Pulsación visual en altavoz de Beat</span>
                  </div>
                  <button 
                    type="button" 
                    className={`setting-switch ${visualMetronome ? 'active' : ''}`}
                    onClick={toggleMetronome}
                  >
                    <span className="switch-knob"></span>
                  </button>
                </div>

                {/* Control Volumen de Música Lobby */}
                <div className="setting-row-vertical">
                  <div className="setting-info mb-10">
                    <span className="setting-title font-base">Volumen de Música de Fondo</span>
                    <span className="setting-desc">Ajusta el volumen del beat de fondo del menú</span>
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

                {/* Calidad de Instrumentales */}
                <div className="setting-row-vertical">
                  <span className="setting-title font-base">Calidad de Beats</span>
                  <span className="setting-desc mb-10">Define la tasa de compresión del audio instrumental</span>
                  <div className="settings-buttons-group">
                    <button 
                      type="button" 
                      className={`btn-group-option ${beatQuality === 'high' ? 'active' : ''}`}
                      onClick={() => handleBeatQualityChange('high')}
                    >
                      ALTA (320kbps)
                    </button>
                    <button 
                      type="button" 
                      className={`btn-group-option ${beatQuality === 'std' ? 'active' : ''}`}
                      onClick={() => handleBeatQualityChange('std')}
                    >
                      ESTÁNDAR
                    </button>
                  </div>
                </div>

                {/* Idioma de la interfaz */}
                <div className="setting-row-vertical">
                  <span className="setting-title font-base">Idioma de la Interfaz</span>
                  <span className="setting-desc mb-10">Afecta textos de menús y desafíos</span>
                  <div className="settings-buttons-group">
                    <button 
                      type="button" 
                      className={`btn-group-option ${language === 'es' ? 'active' : ''}`}
                      onClick={() => handleLanguageChange('es')}
                    >
                      ESPAÑOL
                    </button>
                    <button 
                      type="button" 
                      className={`btn-group-option ${language === 'en' ? 'active' : ''}`}
                      onClick={() => handleLanguageChange('en')}
                    >
                      ENGLISH
                    </button>
                  </div>
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
                localStorage.removeItem('barrz_session');
                localStorage.removeItem('barrz_token');
                if (onLogout) {
                  onLogout();
                } else {
                  window.location.reload();
                }
                setIsOpen(false);
              }}
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>

        {/* Alerta de guardado */}
        <div className={`save-toast-alert ${showSavedAlert ? 'show' : ''}`}>
          Configuración guardada ✓
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
