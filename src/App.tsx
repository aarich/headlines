import { useState, useEffect } from 'react';
import { Headline } from './types';
import Header from './components/Header';
import GameContainer from './components/GameContainer';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import { fetchHeadline } from './lib/api';
import { getStoredScore, getStoredStreak, saveScore, saveStreak } from './lib/storage';
import { calculateNewScore, calculateNewStreak } from './lib/game';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    // Load saved score and streak
    setScore(getStoredScore());
    setStreak(getStoredStreak());

    // Fetch initial headline
    fetchNewHeadline();
  }, []);

  const fetchNewHeadline = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newHeadline = await fetchHeadline();
      setHeadline(newHeadline);
    } catch (err) {
      setError('Failed to load game. Please try again.');
      console.error('Error fetching headline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorrectGuess = () => {
    // Update score and streak
    const newScore = calculateNewScore(score, true);
    const newStreak = calculateNewStreak(streak, true);

    setScore(newScore);
    setStreak(newStreak);

    // Save to localStorage
    saveScore(newScore);
    saveStreak(newStreak);
  };

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-start pb-12 relative">
        <div className="relative w-full">
          <Header
            score={score}
            streak={streak}
            onSettings={() => setIsSettingsOpen(true)}
            onHelp={() => setIsHelpOpen(true)}
          />
          <main className="w-full flex flex-col items-center flex-1">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-lg px-6 py-4 my-8">
                {error}
              </div>
            ) : headline ? (
              <GameContainer headline={headline} onCorrectGuess={handleCorrectGuess} />
            ) : null}
          </main>
          <footer className="mt-8 text-gray-500 dark:text-gray-400 text-center">
            <p>New headline every day!</p>
          </footer>
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    </SettingsProvider>
  );
}

export default App;
