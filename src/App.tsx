import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Game } from './components/Game';
import './App.css';

type GameState = 'splash' | 'game';

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [cameFromGame, setCameFromGame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartGame = () => {
    setCameFromGame(false);
    setGameState('game');
  };

  const handleBackToMenu = () => {
    setCameFromGame(true);
    setGameState('splash');
  };

  if (isLoading) {
    return (
      <div className="loader-screen">
        <div className="grunge-overlay"></div>
        <div className="loader-content">
          <img src="/Barrzjuego.png" alt="Cargando Barrzjuego..." className="loader-logo" />
          <div className="loader-bar-container">
            <div className="loader-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {gameState === 'splash' ? (
        <Splash onStartGame={handleStartGame} fromGame={cameFromGame} />
      ) : (
        <Game onBackToMenu={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
