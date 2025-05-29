import React from 'react';
import { GameState, Headline } from 'types';
import { getResultText, shareScore } from 'lib/ui';
import { useToast } from 'contexts/ToastContext';

interface ShareButtonsProps {
  gameState: GameState;
  headline: Headline;
  isExpert: boolean;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ gameState, headline, isExpert }) => {
  const hasShareAPI = 'share' in (navigator || {});

  const resultText = getResultText(headline, gameState, isExpert, false);
  const toast = useToast();

  return (
    <div>
      <div className="text-left whitespace-pre-wrap text-gray-700 dark:text-gray-200 mx-auto w-fit">
        {gameState.wrongGuesses?.length ? 'Guesses: ' : 'First try! '}
        {resultText}
      </div>
      <div className="flex flex-row items-center justify-center gap-4">
        {hasShareAPI && (
          <button
            className="mt-4 px-4 py-2 border-2 border-green-500 bg-green-500 rounded-md hover:bg-green-600 transition-colors"
            onClick={() => shareScore(headline, gameState, isExpert, toast)}
          >
            Share Results
          </button>
        )}
        <button
          className={`mt-4 px-4 py-2 rounded-md transition-colors ${
            hasShareAPI
              ? 'border-2 border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
          onClick={() => shareScore(headline, gameState, isExpert, toast, true)}
        >
          Copy Results
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
