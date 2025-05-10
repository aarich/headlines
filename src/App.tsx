import { useState, useEffect, useCallback } from 'react';
import { Headline, Feedback } from './types';
import Header from './components/Header';
import GameContainer from './components/GameContainer';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import { fetchHeadline, recordGameStarted } from './lib/api';
import { SettingsProvider } from './contexts/SettingsContext';
import StatsModal from './components/StatsModal';
import AnimatedBackground from './components/AnimatedBackground';
import {
  getLastStarted,
  getStoredFeedback,
  getStoredScores,
  setLastStarted,
  storeFeedback,
} from './lib/storage';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  const [headline, setHeadline] = useState<Headline>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ correct: false, wrongGuesses: [] });

  useEffect(() => {
    setIsLoading(true);
    // use the id from the url if it's specified in the query params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.has('id') ? urlParams.get('id')! : undefined;
    fetchHeadline(id)
      .then(setHeadline)
      .catch(err => {
        setError(err.message);
        console.error('Error fetching headline:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (headline) {
      const lastStarted = getLastStarted();
      const score = getStoredScores()[`${headline.id}`];
      const feedback = getStoredFeedback(headline.id);

      if (score) {
        setFeedback(feedback ?? { correct: true, wrongGuesses: [] });
      } else {
        if (lastStarted !== headline.id) {
          // only record started if we haven't already started this
          recordGameStarted(headline.id);
        }

        if (feedback) {
          setFeedback(feedback);
        }
      }

      setLastStarted(headline.id);
    }
  }, [headline]);

  const setFeedbackWrapper = useCallback(
    (arg: Feedback | ((prevState: Feedback) => Feedback)) => {
      if (typeof arg === 'function') {
        setFeedback(prev => {
          const newFeedback = arg(prev);
          headline && storeFeedback(headline.id, newFeedback);
          return newFeedback;
        });
      } else {
        setFeedback(arg);
        headline && storeFeedback(headline.id, arg);
      }
    },
    [headline]
  );

  return (
    <SettingsProvider>
      <ToastProvider>
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-start pb-6 sm:pb-12 px-2 sm:px-4 relative">
          <AnimatedBackground />
          <div className="relative w-full z-10 flex flex-col flex-1">
            <Header
              onSettings={() => setIsSettingsOpen(true)}
              onHelp={() => setIsHelpOpen(true)}
              onStats={() => setIsStatsOpen(true)}
            />
            <main className="w-full flex flex-col items-center flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto my-8 p-8 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
                  <svg
                    className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mb-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-lg text-gray-700 dark:text-gray-300">Loading</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-lg px-6 py-4 my-8">
                  {error}
                </div>
              ) : headline ? (
                <GameContainer
                  headline={headline}
                  feedback={feedback}
                  setFeedback={setFeedbackWrapper}
                />
              ) : null}
            </main>
            <footer className="mt-8 text-gray-500 dark:text-gray-400 text-center">
              <p>New headline every day!</p>
              <p>© 2025 Alex Rich</p>
            </footer>
          </div>
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
          <StatsModal
            isOpen={isStatsOpen}
            onClose={() => setIsStatsOpen(false)}
            headline={headline}
            feedback={feedback}
          />
        </div>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
