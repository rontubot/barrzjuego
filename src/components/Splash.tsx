import React, { useState } from 'react';
import { Play, BookOpen, DollarSign, Smartphone, Database, Server, Award, Layers, CheckCircle2 } from 'lucide-react';
import './Splash.css';

interface SplashProps {
  onStartGame: () => void;
  fromGame?: boolean;
}

export const Splash: React.FC<SplashProps> = ({ onStartGame, fromGame = false }) => {
  const [showRules, setShowRules] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  
  // Opciones de presupuesto interactivo (tildadas por defecto)
  const [includeBackend, setIncludeBackend] = useState(true);
  const [includeDatabase, setIncludeDatabase] = useState(true);
  const includePlayStore = true; // Google Play Store obligatorio como núcleo de la propuesta

  // Precios estimados en USD (ejemplo realista de mercado)
  const baseCostWeb = 450; // Prototipo Web + Hosting básico
  const baseCostNative = 850; // Migración completa a React Native Android
  const backendCost = includeBackend ? 350 : 0;
  const dbCost = includeDatabase ? 250 : 0;
  const playStoreCost = includePlayStore ? 150 : 0; // Configuración, compilación de producción y subida a la consola de Google

  const totalBudget = baseCostWeb + baseCostNative + backendCost + dbCost + playStoreCost;

  return (
    <div className="splash-container">
      <div className="grunge-overlay"></div>
      
      {/* Cabecera / Logo */}
      <div className={`logo-section ${isLaunching ? 'launching-logo' : ''} ${fromGame ? 'return-from-game' : ''}`}>
        <h1 className="logo-text">PROTOTIPO</h1>
        <div className="logo-badge">FREESTYLE CARD GAME</div>
        <p className="logo-description">El juego definitivo de improvisación urbana, rimas y beats.</p>
      </div>

      {/* Menú de Botones Principales */}
      {!showRules && !showBudget && (
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
          
          <button className="btn-menu-option btn-premium-glow" onClick={() => setShowBudget(true)} disabled={isLaunching}>
            <DollarSign size={20} />
            Ver Propuesta y Presupuesto
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
                <p>Saca una carta de Desafío. El juego se divide en 6 modalidades dinámicas:</p>
                <ul className="challenges-list">
                  <li><strong>Palabras:</strong> Rima usando las 4 palabras. Si juegas 1v1, pulsa "Rotar" para que tu rival lea cómodamente sus palabras invertidas.</li>
                  <li><strong>Temáticas:</strong> Desarrolla tus rimas en base a un tema profundo (Sueños, Miedos, Apocalipsis).</li>
                  <li><strong>Terminaciones:</strong> Patrones obligatorios (ej. terminar en -ER o -AR).</li>
                  <li><strong>Beatbox:</strong> Saca tu caja de ritmos humana. Un compañero hace la base mientras corre el cronómetro integrado de 90 segundos.</li>
                  <li><strong>1v1 / Cypher:</strong> Batallas directas y rondas en equipo 4x4.</li>
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

      {/* Panel Comercial Interactivo (Presupuesto) */}
      {showBudget && (
        <div className="overlay-panel glass-panel glow-teal budget-panel fade-in">
          <div className="panel-header">
            <Award className="header-icon teal-text" size={24} />
            <h2>PROPUESTA TÉCNICA Y PRESUPUESTO</h2>
          </div>
          
          <div className="panel-content scrollable">
            <p className="budget-intro">
              Este prototipo web es la <strong>Fase 1 (MVP)</strong> del proyecto. Está estructurado modularmente para escalar fluidamente a una aplicación móvil nativa en <strong>React Native (Android / iOS)</strong> y servidores en la nube.
            </p>
            
            <div className="budget-grid">
              {/* Columna Izquierda: Configurador */}
              <div className="budget-configurator">
                <h3>🛠️ Personalizar Propuesta</h3>
                <p className="config-desc">Configura los componentes del proyecto para ver el impacto en el presupuesto real en tiempo real:</p>
                
                <div className="config-toggle-list">
                  <div className="config-item disabled-config">
                    <div className="config-info">
                      <span className="config-title">Fase 1: Prototipo Web Responsivo</span>
                      <span className="config-price">+$450 USD</span>
                    </div>
                    <CheckCircle2 className="teal-text" size={20} />
                  </div>

                  <div className="config-item disabled-config">
                    <div className="config-info">
                      <span className="config-title">Fase 2: App Android Nativa (React Native)</span>
                      <span className="config-price">+$850 USD</span>
                    </div>
                    <CheckCircle2 className="teal-text" size={20} />
                  </div>

                   <div className="config-item disabled-config">
                    <div className="config-info">
                      <span className="config-title">Fase 3: Publicación y Soporte en Google Play Store</span>
                      <span className="config-price">+$150 USD</span>
                      <span className="config-details">Creación de ficha de Play Store, optimización ASO, empaquetado de compilación firmada y subida a producción para facilitar actualizaciones y mantenimiento.</span>
                    </div>
                    <CheckCircle2 className="teal-text" size={20} />
                  </div>

                  <label className={`config-item clickable ${includeBackend ? 'active' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={includeBackend} 
                      onChange={(e) => setIncludeBackend(e.target.checked)} 
                    />
                    <div className="config-info">
                      <span className="config-title">Servidor Railway (Cloud API Backend)</span>
                      <span className="config-price">+$350 USD</span>
                      <span className="config-details">Para permitir en el futuro actualizaciones de cartas en tiempo real desde la nube y modo online sin actualizar la App.</span>
                    </div>
                  </label>

                  <label className={`config-item clickable ${includeDatabase ? 'active' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={includeDatabase} 
                      onChange={(e) => setIncludeDatabase(e.target.checked)} 
                    />
                    <div className="config-info">
                      <span className="config-title">Base de Datos PostgreSQL Dedicada</span>
                      <span className="config-price">+$250 USD</span>
                      <span className="config-details">Para almacenar estadísticas de partidas de usuarios, registro de perfiles, puntuaciones históricas y favoritos de Spotify.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Columna Derecha: Resumen de Precios */}
              <div className="budget-summary glass-panel">
                <h3>📊 RESUMEN DEL PRESUPUESTO</h3>
                
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Diseño UX/UI & Web App MVP:</span>
                    <span>$450 USD</span>
                  </div>
                  <div className="summary-row">
                    <span>Desarrollo Android (React Native):</span>
                    <span>$850 USD</span>
                  </div>
                  {includePlayStore && (
                    <div className="summary-row">
                      <span>Publicación en Google Play:</span>
                      <span>$150 USD</span>
                    </div>
                  )}
                  {includeBackend && (
                    <div className="summary-row">
                      <span>Servidor Cloud Railway API:</span>
                      <span>$350 USD</span>
                    </div>
                  )}
                  {includeDatabase && (
                    <div className="summary-row">
                      <span>Base de datos PostgreSQL:</span>
                      <span>$250 USD</span>
                    </div>
                  )}
                  
                  <div className="summary-total">
                    <span>PRESUPUESTO TOTAL:</span>
                    <span className="total-amount">${totalBudget} USD</span>
                  </div>
                </div>

                <div className="tech-stack-badges">
                  <h4>Pila Tecnológica Recomendada:</h4>
                  <div className="badge-row">
                    <span className="tech-badge"><Smartphone size={12} /> React Native / Expo</span>
                    <span className="tech-badge"><Server size={12} /> Railway Cloud</span>
                    <span className="tech-badge"><Database size={12} /> PostgreSQL</span>
                    <span className="tech-badge"><Layers size={12} /> Node.js Express</span>
                  </div>
                </div>

                <div className="road-map-info">
                  <h4>🚀 Hoja de Ruta Propuesta:</h4>
                  <ol>
                    <li><strong>Semana 1:</strong> Aprobación de prototipos visuales (este prototipo) e identidad.</li>
                    <li><strong>Semana 2-3:</strong> Maquetación en React Native y pruebas en emuladores Android reales.</li>
                    <li><strong>Semana 4:</strong> Integración de APIs, Spotify y base de datos local / remota.</li>
                    <li><strong>Semana 5:</strong> Pruebas Beta Cerrada y subida a Railway / Google Play.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          
          <button className="btn-close" onClick={() => setShowBudget(false)}>
            Volver al Menú
          </button>
        </div>
      )}
      
      {/* Footer corporativo / informativo */}
      <div className="splash-footer">
        <span>© 2026 Prototipo - Creado para Freestyle Players</span>
      </div>
    </div>
  );
};
