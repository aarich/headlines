import React from 'react';
import { WrongGuess } from '../types';
import { shareScore } from '../lib/game';

interface ShareButtonsProps {
  wrongGuesses: WrongGuess[];
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ wrongGuesses }) => {
  const hasShareAPI = 'share' in (navigator || {});

  return (
    <div className="flex flex-row items-center justify-center gap-4">
      {hasShareAPI && (
        <button
          className="mt-4 px-4 py-2 border-2 border-green-500 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          onClick={() => shareScore(wrongGuesses)}
        >
          Share Score
        </button>
      )}
      <button
        className={`mt-4 px-4 py-2 rounded-md transition-colors ${
          hasShareAPI
            ? 'border-2 border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        onClick={() => shareScore(wrongGuesses, true)}
      >
        Copy Score
      </button>
    </div>
  );
};

export default ShareButtons;
