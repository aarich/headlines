import React, { useMemo } from 'react';
import { getResultText, shareScore } from 'lib/ui';
import { useToast } from 'contexts/ToastContext';
import { getStoredScores } from 'lib/storage';
import { useGameState, useHeadline } from 'contexts/HeadlineContext';

interface ShareButtonsProps {
  isExpert: boolean;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ isExpert }) => {
  const [gameState] = useGameState();
  const headline = useHeadline();
  const hasShareAPI = 'share' in (navigator || {});

  const resultText = useMemo(
    () => getResultText(headline, gameState, isExpert, getStoredScores()[`${headline.id}`]),
    [gameState, headline, isExpert]
  );
  const toast = useToast();

  const hasWrongGuesses = gameState.actions?.filter(x => typeof x === 'string').length;

  return (
    <div>
      <div className="text-left whitespace-pre-wrap text-gray-700 dark:text-gray-200 mx-auto w-fit">
        {hasWrongGuesses ? '' : 'First try! '}
        {resultText}
      </div>
      <div className="flex flex-row items-center justify-center gap-4">
        {hasShareAPI && (
          <button
            className="mt-4 px-4 py-2 border-2 border-green-500 bg-green-500 rounded-md hover:bg-green-600 transition-colors"
            onClick={() => shareScore(resultText, headline, toast)}
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
          onClick={() => shareScore(resultText, headline, toast, true)}
        >
          Copy Results
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
