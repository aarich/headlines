import AdminModal from 'components/admin/AdminModal';
import AnimatedBackground from 'components/AnimatedBackground';
import Loading from 'components/common/Loading';
import CreateUserHeadlineModal from 'components/CreateUserHeadlineModal';
import GameContainer from 'components/game/GameContainer';
import Header from 'components/Header';
import HelpModal from 'components/HelpModal';
import SettingsModal from 'components/SettingsModal';
import StatsModal from 'components/StatsModal';
import { HeadlineProvider } from 'contexts/HeadlineContext';
import { SettingsProvider } from 'contexts/SettingsContext';
import { ToastProvider } from 'contexts/ToastContext';
import { recordGameStarted } from 'lib/api';
import {
  getAdminKey,
  getStarted,
  getStoredGameState,
  getStoredScores,
  setStarted,
  storeGameState,
} from 'lib/storage';
import { fetchHeadlineBasedOnQueryParameters, MODAL_CLOSE_LISTENERS } from 'lib/ui';
import { isStandard } from 'lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { GameState, Headline, UserHeadline } from 'types';

function App() {
  const [headline, setHeadline] = useState<Headline | UserHeadline>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCreateUserHeadlineOpen, setIsCreateUserHeadlineOpen] = useState(false);
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
        if (isStandard(headline) && !startedGames.has(headline.id)) {
          // only record started if we haven't already started this
          recordGameStarted(headline.id);
        }

        if (gameState) {
          setGameState(gameState);
        }
      }

      isStandard(headline) && setStarted(headline.id);
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

  useEffect(() => {
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100vh';
  }, []);

  const showAdminButton = !!(getAdminKey() || window.location.search.includes('admin=true'));

  const closeModal = useCallback((closerFn: (open: boolean) => void) => {
    closerFn(false);
    MODAL_CLOSE_LISTENERS.forEach(listener => listener());
  }, []);

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
                onCreateUserHeadline={() => setIsCreateUserHeadlineOpen(true)}
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
                <p>© 2025 - {new Date().getFullYear()} Alex Rich</p>
              </footer>
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => closeModal(setIsSettingsOpen)} />
            <HelpModal isOpen={isHelpOpen} onClose={() => closeModal(setIsHelpOpen)} />
            <StatsModal isOpen={isStatsOpen} onClose={() => closeModal(setIsStatsOpen)} />
            <AdminModal isOpen={isAdminOpen} onClose={() => closeModal(setIsAdminOpen)} />
            <CreateUserHeadlineModal
              isOpen={isCreateUserHeadlineOpen}
              onClose={() => closeModal(setIsCreateUserHeadlineOpen)}
            />
          </div>
        </HeadlineProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
