import React, { useState } from 'react';
import { User, Settings, History, X, LogOut, Sliders, Flame, Award } from 'lucide-react';
import './UserProfilePanel.css';

interface UserProfilePanelProps {
  gameState: string;
  userSession: any;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ gameState, userSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');

  // Ajustes y Perfil persistidos localmente
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('barrz_user_avatar') || '🎤');
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('barrz_sfx') !== 'false');
  const [visualMetronome, setVisualMetronome] = useState(() => localStorage.getItem('barrz_visual_metronome') !== 'false');
  const [beatQuality, setBeatQuality] = useState(() => localStorage.getItem('barrz_beat_quality') || 'high');
  const [language, setLanguage] = useState(() => localStorage.getItem('barrz_language') || 'es');
  const [showSavedAlert, setShowSavedAlert] = useState(false);

  // Avatares disponibles (Emojis estilo Hip-Hop y Urbano)
  const avatars = ['🎤', '🔥', '🎧', '👑', '👽', '⚡', '🎸', '🚀', '💀', '💥', '🛹', '🕶️'];

  // Guardar configuración en localStorage
  const handleAvatarChange = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('barrz_user_avatar', avatar);
    triggerSaveToast();
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

  const triggerSaveToast = () => {
    setShowSavedAlert(true);
    setTimeout(() => setShowSavedAlert(false), 1500);
  };

  // Ocultar botones y panel durante el juego activo
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
        >
          <span className="user-trigger-avatar">{selectedAvatar}</span>
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
                <div className="profile-avatar-display">
                  <span className="avatar-main-emoji">{selectedAvatar}</span>
                </div>
                <h3 className="profile-name-text font-base">{userSession?.email || 'Freestyler Google'}</h3>
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
                      className={`avatar-grid-item ${selectedAvatar === av ? 'selected' : ''}`}
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
                    <span className="stat-value text-glow-teal">32</span>
                    <span className="stat-label">Batallas</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">24</span>
                    <span className="stat-label">Victorias</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-teal">75%</span>
                    <span className="stat-label">Win Rate</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value text-glow-pink">185</span>
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
                <div className="history-card win">
                  <div className="history-card-header">
                    <span className="history-badge win-badge">VICTORIA</span>
                    <span className="history-time-ago font-base">Hace 2 horas</span>
                  </div>
                  <div className="history-card-body">
                    <span className="history-battle-type">Cypher Urbano (Modo Libre)</span>
                    <span className="history-score-val font-base">+185 Pts</span>
                  </div>
                </div>

                <div className="history-card loss">
                  <div className="history-card-header">
                    <span className="history-badge loss-badge">DERROTA</span>
                    <span className="history-time-ago font-base">Ayer</span>
                  </div>
                  <div className="history-card-body">
                    <span className="history-battle-type">Duelo 1v1 vs Bot</span>
                    <span className="history-score-val font-base">+120 Pts</span>
                  </div>
                </div>

                <div className="history-card win">
                  <div className="history-card-header">
                    <span className="history-badge win-badge">VICTORIA</span>
                    <span className="history-time-ago font-base">Hace 3 días</span>
                  </div>
                  <div className="history-card-body">
                    <span className="history-battle-type">Desafío Temático (Multijugador)</span>
                    <span className="history-score-val font-base">+160 Pts</span>
                  </div>
                </div>

                <div className="history-card win">
                  <div className="history-card-header">
                    <span className="history-badge win-badge">VICTORIA</span>
                    <span className="history-time-ago font-base">Hace 5 días</span>
                  </div>
                  <div className="history-card-body">
                    <span className="history-battle-type">Cypher de Práctica</span>
                    <span className="history-score-val font-base">+140 Pts</span>
                  </div>
                </div>
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
                window.location.reload(); // Recarga simple para limpiar sesión mock
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
    </>
  );
};
