import { useState } from 'react';
import { Splash } from './components/Splash';
import { Game } from './components/Game';

type GameState = 'splash' | 'game';

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [cameFromGame, setCameFromGame] = useState(false);

  const handleStartGame = () => {
    setCameFromGame(false);
    setGameState('game');
  };

  const handleBackToMenu = () => {
    setCameFromGame(true);
    setGameState('splash');
  };

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
