import { useState, useEffect, useCallback } from 'react';
import { Headline, GameState } from 'types';
import Header from 'components/Header';
import GameContainer from 'components/game/GameContainer';
import SettingsModal from 'components/SettingsModal';
import HelpModal from 'components/HelpModal';
import { recordGameStarted } from 'lib/api';
import AdminModal from 'components/admin/AdminModal';
import { SettingsProvider } from 'contexts/SettingsContext';
import StatsModal from 'components/StatsModal';
import AnimatedBackground from 'components/AnimatedBackground';
import {
  getStarted,
  getStoredGameState,
  getStoredScores,
  setStarted,
  getAdminKey,
  storeGameState,
} from 'lib/storage';
import { ToastProvider } from 'contexts/ToastContext';
import Loading from 'components/common/Loading';
import { fetchHeadlineBasedOnQueryParameters } from 'lib/ui';
import { HeadlineProvider } from 'contexts/HeadlineContext';

function App() {
  const [headline, setHeadline] = useState<Headline>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState>({});

  useEffect(() => {
    if (getStarted().size === 0) {
      // This is the first time the app is opened
      setIsHelpOpen(true);
    }

    setIsLoading(true);
    fetchHeadlineBasedOnQueryParameters()
      .then(setHeadline)
      .catch(err => {
        setError(err.message);
        console.error('Error fetching headline:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (headline) {
      const startedGames = getStarted();
      const score = getStoredScores()[`${headline.id}`];
      const gameState = getStoredGameState(headline.id);

      if (score) {
        // We already finished this game
        setGameState(gameState ?? { completedAt: new Date().getTime() });
      } else {
        if (!startedGames.has(headline.id)) {
          // only record started if we haven't already started this
          recordGameStarted(headline.id);
        }

        if (gameState) {
          setGameState(gameState);
        }
      }

      setStarted(headline.id);
    }
  }, [headline]);

  const setGameStateWrapper = useCallback(
    (arg: GameState | ((prevState: GameState) => GameState)) => {
      if (typeof arg === 'function') {
        setGameState(prev => {
          const newGameState = arg(prev);
          headline && storeGameState(headline.id, newGameState);
          return newGameState;
        });
      } else {
        setGameState(arg);
        headline && storeGameState(headline.id, arg);
      }
    },
    [headline]
  );

  const showAdminButton = !!(getAdminKey() || window.location.search.includes('admin=true'));

  return (
    <SettingsProvider>
      <ToastProvider>
        <HeadlineProvider state={{ headline, game: [gameState, setGameStateWrapper] }}>
          <div className="min-h-screen flex flex-col items-center justify-start pb-6 sm:pb-12 px-2 sm:px-4 relative">
            <AnimatedBackground />
            <div className="relative w-full z-10 flex flex-col flex-1">
              <Header
                onSettings={() => setIsSettingsOpen(true)}
                onHelp={() => setIsHelpOpen(true)}
                onStats={() => setIsStatsOpen(true)}
                onAdmin={() => setIsAdminOpen(true)}
                showAdminButton={showAdminButton}
              />
              <main className="w-full flex flex-col items-center flex-1">
                {isLoading ? (
                  <Loading />
                ) : error ? (
                  <div className="text-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-lg px-6 py-4 my-8">
                    {error}
                  </div>
                ) : headline ? (
                  <GameContainer />
                ) : null}
              </main>
              <footer className="mt-8 text-gray-500 dark:text-gray-400 text-center">
                <p>New headline every day!</p>
                <p>© 2025 Alex Rich</p>
              </footer>
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
            <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
          </div>
        </HeadlineProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
