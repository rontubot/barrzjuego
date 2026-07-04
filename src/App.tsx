import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { OnboardingAuth } from './components/OnboardingAuth';
import { GameSetup } from './components/GameSetup';
import { Game } from './components/Game';
import { MenuAudioPlayer } from './components/MenuAudioPlayer';
import { UserProfilePanel } from './components/UserProfilePanel';
import './App.css';

type GameState =
  | 'splash'
  | 'onboarding_1'
  | 'onboarding_2'
  | 'auth_choice'
  | 'auth_password'
  | 'auth_verify'
  | 'lobby_start'
  | 'tutorial_ask'
  | 'link_spotify'
  | 'mode_selection'
  | 'setup_players'
  | 'setup_rounds'
  | 'setup_deck'
  | 'game';

interface UserSession {
  email: string;
  loggedIn: boolean;
  method: string;
}

interface GameSettings {
  mode: 'solo' | 'multiplayer';
  players: string[];
  avatars?: Record<string, string>;
  roundsCount: number;
  selectedCategories: string[];
  startingPlayer: string;
}

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [cameFromGame, setCameFromGame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoaderBar, setShowLoaderBar] = useState(false);
  
  // Datos compartidos de sesión y partida
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  // Secuencia de carga: 3s logo solo + 4s barra de carga
  useEffect(() => {
    const showBarTimer = setTimeout(() => {
      setShowLoaderBar(true);
    }, 3000);

    const finishLoadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 7000);

    return () => {
      clearTimeout(showBarTimer);
      clearTimeout(finishLoadingTimer);
    };
  }, []);

  // Restaurar y verificar sesión una vez terminada la carga
  useEffect(() => {
    if (!isLoading) {
      const savedSession = localStorage.getItem('barrz_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setUserSession(session);
          setGameState('splash'); // Va al inicio (Jugar Ahora)
        } catch (e) {
          setGameState('auth_choice');
        }
      } else {
        setGameState('auth_choice'); // Login por primera vez
      }
    }
  }, [isLoading]);

  const handleStartGame = () => {
    setCameFromGame(false);
    setGameState('tutorial_ask');
  };

  const handleBackToMenu = () => {
    setCameFromGame(true);
    // Al volver al menú desde el juego, regresamos directamente a Splash
    setGameState('splash');
  };

  // Enrutador de avance de pantallas
  const handleNextStep = (nextStep: string, data?: any) => {
    if (data) {
      // Registrar sesión de usuario
      if (data.loggedIn) {
        const session = {
          email: data.email,
          loggedIn: true,
          method: data.method
        };
        setUserSession(session);
        localStorage.setItem('barrz_session', JSON.stringify(session));
      }

      // Al iniciar el combate directo (desde deck selection, solo mode o rápido)
      if (nextStep === 'game' && data.mode) {
        setGameSettings({
          mode: data.mode,
          players: data.players,
          avatars: data.avatars,
          roundsCount: data.roundsCount,
          selectedCategories: data.selectedCategories,
          startingPlayer: data.startingPlayer || data.players[0]
        });
      }
    }
    
    // Al finalizar el login (que iba a lobby_start), ir directamente a splash
    if (nextStep === 'lobby_start') {
      setGameState('splash');
    } else {
      setGameState(nextStep as GameState);
    }
  };

  // Enrutador de retroceso de pantallas (volver atrás)
  const handleBackStep = () => {
    switch (gameState) {
      case 'auth_choice':
        // Primer pantalla de autenticación, no vuelve atrás para no saltar el login
        break;
      case 'auth_password':
        setGameState('auth_choice');
        break;
      case 'auth_verify':
        setGameState('auth_password');
        break;
      case 'lobby_start':
        // Log out y volver al registro
        setUserSession(null);
        localStorage.removeItem('barrz_session');
        setGameState('auth_choice');
        break;
      case 'tutorial_ask':
        setGameState('splash');
        break;
      case 'link_spotify':
        setGameState('tutorial_ask');
        break;
      case 'mode_selection':
        setGameState('link_spotify');
        break;
      case 'setup_players':
        setGameState('mode_selection');
        break;
      case 'setup_rounds':
        setGameState('setup_players');
        break;
      case 'setup_deck':
        setGameState('setup_rounds');
        break;
      default:
        setGameState('splash');
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="loader-screen">
        <div className="grunge-overlay"></div>
        <div className="loader-content">
          <img src="/Barrzjuego.png" alt="Cargando Barrzjuego..." className="loader-logo" />
          {showLoaderBar && (
            <div className="loader-bar-container">
              <div className="loader-bar"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  let mainContent = null;

  // 1. Pantalla Inicial (Splash)
  if (gameState === 'splash') {
    mainContent = <Splash onStartGame={handleStartGame} fromGame={cameFromGame} />;
  }

  // 2. Pantallas de Onboarding y Autenticación
  else if (
    gameState === 'onboarding_1' ||
    gameState === 'onboarding_2' ||
    gameState === 'auth_choice' ||
    gameState === 'auth_password' ||
    gameState === 'auth_verify'
  ) {
    mainContent = (
      <OnboardingAuth
        step={gameState}
        onNext={handleNextStep}
        onBack={handleBackStep}
      />
    );
  }

  // 3. Pantallas de Lobbies y Configuraciones de Juego
  else if (
    gameState === 'lobby_start' ||
    gameState === 'tutorial_ask' ||
    gameState === 'link_spotify' ||
    gameState === 'mode_selection' ||
    gameState === 'setup_players' ||
    gameState === 'setup_rounds' ||
    gameState === 'setup_deck'
  ) {
    mainContent = (
      <GameSetup
        step={gameState}
        userSession={userSession}
        onNext={handleNextStep}
        onBack={handleBackStep}
      />
    );
  }

  // 4. Zona de Juego Activa (Gameplay & Resultados)
  else if (gameState === 'game') {
    if (!gameSettings) {
      return (
        <div className="loader-screen">
          <div className="grunge-overlay"></div>
          <div className="loader-content">
            <div className="loader-bar-container">
              <div className="loader-bar"></div>
            </div>
          </div>
        </div>
      );
    }
    mainContent = (
      <Game
        key={`${gameSettings.players.join(',')}-${gameSettings.mode}-${gameSettings.roundsCount}`}
        onBackToMenu={handleBackToMenu}
        gameSettings={gameSettings}
      />
    );
  }

  return (
    <div className="app-root">
      {mainContent}
      <MenuAudioPlayer gameState={gameState} />
      <UserProfilePanel gameState={gameState} userSession={userSession} />
    </div>
  );
}

export default App;
