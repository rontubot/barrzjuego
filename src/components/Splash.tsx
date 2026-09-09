import React, { useState } from 'react';
import { Play, BookOpen } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import './Splash.css';

interface SplashProps {
  onStartGame: () => void;
  fromGame?: boolean;
}

export const Splash: React.FC<SplashProps> = ({ onStartGame, fromGame = false }) => {
  const { t } = useI18n();
  const [showRules, setShowRules] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  return (
    <div className="splash-container">
      <div className="grunge-overlay"></div>
      
      {/* Cabecera / Logo */}
      <div className={`logo-section ${isLaunching ? 'launching-logo' : ''} ${fromGame ? 'return-from-game' : ''}`}>
        <h1 className="logo-title">
          <img src="/Barrzjuego.png" alt="BARRZJUEGO" className="logo-img" />
        </h1>
        <div className="logo-badge">{t.splash.badge}</div>
        <p className="logo-description">{t.splash.desc}</p>
      </div>

      {/* Menú de Botones Principales */}
      {!showRules && (
        <div className={`menu-section ${isLaunching ? 'launching' : ''} ${fromGame ? 'return-from-game' : 'fade-in'}`}>
          <button
            className="btn-play pulse-pink-anim"
            onClick={() => {
              setIsLaunching(true);
              setTimeout(() => onStartGame(), 700);
            }}
            disabled={isLaunching}
          >
            <Play size={24} fill="currentColor" />
            {isLaunching ? t.splash.loading_btn : t.splash.play_now}
          </button>
          
          <button className="btn-menu-option" onClick={() => setShowRules(true)} disabled={isLaunching}>
            <BookOpen size={20} />
            {t.splash.instructions_btn}
          </button>
        </div>
      )}

      {/* Panel de Instrucciones */}
      {showRules && (
        <div className="overlay-panel glass-panel glow-pink fade-in">
          <div className="panel-header">
            <BookOpen className="header-icon pink-text" size={24} />
            <h2>{t.splash.rules_title}</h2>
          </div>
          
          <div className="panel-content scrollable">
            <div className="rule-item">
              <span className="rule-num">1</span>
              <div>
                <h3>{t.splash.rules_1_title}</h3>
                <p>{t.splash.rules_1_desc}</p>
              </div>
            </div>
            
            <div className="rule-item">
              <span className="rule-num">2</span>
              <div>
                <h3>{t.splash.rules_2_title}</h3>
                <p>{t.splash.rules_2_desc}</p>
              </div>
            </div>
            
            <div className="rule-item">
              <span className="rule-num">3</span>
              <div>
                <h3>{t.splash.rules_3_title}</h3>
                <p>{t.splash.rules_3_desc}</p>
              </div>
            </div>

            <div className="rule-item">
              <span className="rule-num">4</span>
              <div>
                <h3>{t.splash.rules_4_title}</h3>
                <p>{t.splash.rules_4_desc}</p>
              </div>
            </div>
          </div>
          
          <button className="btn-close" onClick={() => setShowRules(false)}>
            {t.splash.back_to_menu}
          </button>
        </div>
      )}

      {/* Footer corporativo / informativo */}
      <div className="splash-footer">
        <span>{t.splash.footer}</span>
      </div>
    </div>
  );
};

