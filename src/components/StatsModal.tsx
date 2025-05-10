/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import Modal from './common/Modal';
import { getStoredScores, getStoredStats, saveStats } from '../lib/storage';
import { getCurrentStreak } from '../lib/scoring';
import { Feedback, Headline, HeadlineHistory } from '../types';
import { fetchHistory } from '../lib/api';
import { plural } from '../lib/ui';
import TickerItem from './TickerItem';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  headline?: Headline;
  feedback: Feedback;
}

const StatsModal: React.FC<StatsModalProps> = ({ headline, isOpen, onClose, feedback }) => {
  const scores = useMemo(() => getStoredScores(), [feedback.correct]);
  const stats = useMemo(() => getStoredStats(), [feedback.correct]);
  const [history, setHistory] = useState<HeadlineHistory[]>();
  const [revealWords, setRevealWords] = useState(false);

  const totalCompleted = Object.keys(scores).length;

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(error => {
        console.error('Error fetching history:', error);
      });
  }, []);

  const currentStreak = useMemo(
    () => (headline ? getCurrentStreak(Object.values(scores), headline.id - 1) : undefined),
    [headline, scores, feedback.correct]
  );

  useEffect(() => {
    if (currentStreak && currentStreak > (stats.longestStreak ?? 0)) {
      saveStats({ longestStreak: currentStreak });
    }
  }, [currentStreak, stats.longestStreak]);

  const percentCompleted = (100 * totalCompleted) / (stats.totalPlays || totalCompleted);

  // Hide the first item if the user hasn't completed it yet
  const hideFirstItem = useMemo(() => !scores[`${history?.[0]?.id}`], [history, scores]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stats">
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        {Object.keys(scores).length === 0 ? (
          <>
            <p>Finish a game to see your stats here.</p>
            <div className="flex justify-center">
              <button className="text-blue-500 px-4 py-2 rounded-md" onClick={onClose}>
                Get on it
              </button>
            </div>
          </>
        ) : (
          <div>
            <p>
              You completed <span className="font-bold">{totalCompleted}</span>{' '}
              {plural(totalCompleted, 'headline')} ({percentCompleted.toFixed()}% success), made{' '}
              <span className="font-bold">{stats.totalIncorrectGuesses ?? 0}</span> incorrect{' '}
              {plural(stats.totalIncorrectGuesses ?? 0, 'guess', 'es')}, and solved{' '}
              <span className="font-bold">{stats.firstGuessCorrectCount}</span>{' '}
              {plural(stats.firstGuessCorrectCount ?? 0, 'game')} on the first try.
            </p>
            <p>Longest streak: {stats.longestStreak ?? 0}</p>
            <p>Current streak: {currentStreak !== undefined ? currentStreak : '...'}</p>
            <h3 className="text-lg font-bold mt-4 flex items-center">
              News Ticker{' '}
              <button className="mx-4" onClick={() => setRevealWords(!revealWords)}>
                {revealWords ? (
                  <EyeIcon className="w-5 h-5" />
                ) : (
                  <EyeSlashIcon className="w-5 h-5" />
                )}
              </button>
            </h3>
            <p className="text-sm text-gray-500 mb-2">Global playing statistics</p>

            {history?.map((h, i) => (
              <TickerItem
                key={h.id}
                headline={h}
                revealWord={revealWords && !(i === 0 && hideFirstItem)}
                isLatest={i === 0}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
