/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo } from 'react';
import Modal from './common/Modal';
import { getStoredScores, getStoredStats, saveStats } from '../lib/storage';
import { getCurrentStreak } from '../lib/scoring';
import { Feedback, Headline } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  headline?: Headline;
  feedback: Feedback;
}

const StatsModal: React.FC<StatsModalProps> = ({ headline, isOpen, onClose, feedback }) => {
  const scores = useMemo(() => getStoredScores(), [feedback.correct]);
  const stats = useMemo(() => getStoredStats(), [feedback.correct]);

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
            <p>Total games played: {stats.totalPlays}</p>
            <p>Total incorrect guesses: {stats.totalIncorrectGuesses ?? 0}</p>
            <p>First guess correct count: {stats.firstGuessCorrectCount ?? 0}</p>
            <p>Longest streak: {stats.longestStreak ?? 0}</p>
            <p>Current streak: {currentStreak !== undefined ? currentStreak : '...'}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
