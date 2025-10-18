import Modal from 'components/common/Modal';
import { useGameState, useMaybeHeadline } from 'contexts/HeadlineContext';
import { getCurrentStreak } from 'lib/scoring';
import { getStoredScores, getStoredStats, saveStats } from 'lib/storage';
import { plural } from 'lib/ui';
import { useEffect, useMemo } from 'react';
import HistoryList from './HistoryList';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const [{ completedAt }] = useGameState();
  const headline = useMaybeHeadline();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [scores, stats] = useMemo(() => [getStoredScores(), getStoredStats()], [completedAt]);

  const currentStreak = headline
    ? getCurrentStreak(Object.values(scores), headline.gameNum - 1)
    : undefined;

  const totalCompleted = Object.keys(scores).length;

  useEffect(() => {
    if (currentStreak && currentStreak > (stats.longestStreak ?? 0)) {
      saveStats({ longestStreak: currentStreak });
    }
  }, [currentStreak, stats.longestStreak]);

  const percentCompleted = (100 * totalCompleted) / (stats.totalPlays || totalCompleted);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stats" mdSize="3xl">
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        {Object.keys(scores).length === 0 ? (
          <>
            <p>Play a game and your stats will show up here!</p>
            <div className="flex justify-center">
              <button className="text-blue-500 px-4 py-2 rounded-md" onClick={onClose}>
                Get on it
              </button>
            </div>
          </>
        ) : (
          <div>
            <p>
              You've tackled <span className="font-bold">{totalCompleted}</span>{' '}
              {plural(totalCompleted, 'headline')} with a{' '}
              <span className="font-bold">{percentCompleted.toFixed()}%</span> success rate!
            </p>
            <p>
              You've made <span className="font-bold">{stats.totalIncorrectGuesses ?? 0}</span>{' '}
              incorrect {plural(stats.totalIncorrectGuesses ?? 0, 'guess', 'es')}, and aced{' '}
              <span className="font-bold">{stats.firstGuessCorrectCount || 0}</span>{' '}
              {plural(stats.firstGuessCorrectCount || 0, 'game')} on the first try.
            </p>
            <p>
              Longest streak: <span className="font-bold">{stats.longestStreak ?? 0}</span>
            </p>
            <p>
              Current streak:{' '}
              <span className="font-bold">
                {currentStreak !== undefined ? currentStreak : '...'}
              </span>
            </p>
            <HistoryList isOpen={isOpen} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
