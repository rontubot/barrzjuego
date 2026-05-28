import { useState } from 'react';
import { Splash } from './components/Splash';
import { Game } from './components/Game';

type GameState = 'splash' | 'game';

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');

  return (
    <div className="app-root">
      {gameState === 'splash' ? (
        <Splash onStartGame={() => setGameState('game')} />
      ) : (
        <Game onBackToMenu={() => setGameState('splash')} />
      )}
    </div>
  );
}

export default App;
