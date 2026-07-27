import React, { useState, useEffect } from 'react';
import { Play, BookOpen } from 'lucide-react';
import './Splash.css';

interface SplashProps {
  onStartGame: () => void;
  fromGame?: boolean;
}

export const Splash: React.FC<SplashProps> = ({ onStartGame, fromGame = false }) => {
  const [showRules, setShowRules] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const playIntroSFX = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Sub-bass frequency sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 1.2);
      
      // High scratch overlay
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6);
      
      // Low pass filter sweep
      filter.type = 'lowpass';
      filter.Q.value = 8;
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.2);
      
      // Gain envelope
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.6);
      osc2.stop(ctx.currentTime + 1.6);
    } catch (e) {
      console.log("AudioContext blocked or failed to initialize:", e);
    }
  };

  useEffect(() => {
    // Only play intro SFX if not returning from active gameplay
    if (!fromGame) {
      playIntroSFX();
    }
  }, [fromGame]);

  return (
    <div className="splash-container">
      <div className="grunge-overlay"></div>
      
      {/* Cabecera / Logo */}
      <div className={`logo-section ${isLaunching ? 'launching-logo' : ''} ${fromGame ? 'return-from-game' : ''}`}>
        <h1 className="logo-title">
          <img src="/Barrzjuego.png" alt="BARRZJUEGO" className="logo-img" />
        </h1>
        <div className="logo-badge">FREESTYLE CARD GAME</div>
        <p className="logo-description">El juego definitivo de improvisación, rimas y beats.</p>
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
            {isLaunching ? 'CARGANDO...' : 'JUGAR AHORA'}
          </button>
          
          <button className="btn-menu-option" onClick={() => setShowRules(true)} disabled={isLaunching}>
            <BookOpen size={20} />
            Instrucciones y Consejos
          </button>
        </div>
      )}

      {/* Panel de Instrucciones */}
      {showRules && (
        <div className="overlay-panel glass-panel glow-pink fade-in">
          <div className="panel-header">
            <BookOpen className="header-icon pink-text" size={24} />
            <h2>CÓMO JUGAR</h2>
          </div>
          
          <div className="panel-content scrollable">
            <div className="rule-item">
              <span className="rule-num">1</span>
              <div>
                <h3>Dos Mazos de Combate</h3>
                <p>El juego se compone de un mazo verde de <strong>Beats</strong> y un mazo rosa de <strong>Desafíos</strong>.</p>
              </div>
            </div>
            
            <div className="rule-item">
              <span className="rule-num">2</span>
              <div>
                <h3>Establece el Ritmo (Beat)</h3>
                <p>En tu turno, saca una carta de Beat. Verás el nombre, los BPM (ritmo) y un enlace a Spotify. Haz clic en la carta para abrir Spotify y reproducir el beat sin que se pause la app.</p>
              </div>
            </div>
            
            <div className="rule-item">
              <span className="rule-num">3</span>
              <div>
                <h3>Acepta el Desafío</h3>
                <p>Saca una carta de Desafío. El juego se divide en 5 modalidades dinámicas:</p>
                <ul className="challenges-list">
                  <li><strong>Palabras:</strong> Rima usando las palabras. Pulsa "Rotar" para que el otro freestyler lea cómodamente sus palabras invertidas.</li>
                  <li><strong>Temáticas:</strong> Desarrolla tus rimas en base a un tema profundo (Sueños, Miedos, Apocalipsis).</li>
                  <li><strong>Terminaciones:</strong> Patrones obligatorios (ej. terminar en -ER o -AR).</li>
                  <li><strong>Beatbox:</strong> Saca tu caja de ritmos humana. Un compañero hace la base mientras corre el cronómetro integrado de 60 segundos.</li>
                  <li><strong>Cypher:</strong> Rondas en equipo en formato 4x4 continuo.</li>
                </ul>
              </div>
            </div>

            <div className="rule-item">
              <span className="rule-num">4</span>
              <div>
                <h3>Puntuación y Turnos</h3>
                <p>Sumen puntos por estilo, métrica y cumplimiento de las palabras clave. ¡Pasen al siguiente turno para un nuevo desafío!</p>
              </div>
            </div>
          </div>
          
          <button className="btn-close" onClick={() => setShowRules(false)}>
            Volver al Menú
          </button>
        </div>
      )}

      
      {/* Footer corporativo / informativo */}
      <div className="splash-footer">
        <span>© 2026 Barrzjuego - Creado para Freestyle Players</span>
      </div>
    </div>
  );
};
