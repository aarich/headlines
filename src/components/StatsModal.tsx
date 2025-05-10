/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import Modal from './common/Modal';
import { getStoredScores, getStoredStats, saveStats } from '../lib/storage';
import { getCurrentStreak } from '../lib/scoring';
import { Feedback, Headline, HeadlineHistory } from '../types';
import { fetchHistory } from '../lib/api';
import { plural } from '../lib/ui';

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
              You've completed <span className="font-bold">{totalCompleted}</span>{' '}
              {plural(totalCompleted, 'headline')} (
              {((100 * totalCompleted) / (stats.totalPlays || totalCompleted)).toFixed()}% success),
              made <span className="font-bold">{stats.totalIncorrectGuesses ?? 0}</span> incorrect{' '}
              {plural(stats.totalIncorrectGuesses ?? 0, 'guess', 'es')} and solved{' '}
              <span className="font-bold">{stats.firstGuessCorrectCount}</span>{' '}
              {plural(stats.firstGuessCorrectCount ?? 0, 'game')} on the first try.
            </p>
            <p>Longest streak: {stats.longestStreak ?? 0}</p>
            <p>Current streak: {currentStreak !== undefined ? currentStreak : '...'}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
