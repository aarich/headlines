import { getWrongGuesses } from 'lib/game';
import React from 'react';
import { Hint } from 'types';
import { useGameState, useHeadline } from '../../contexts/HeadlineContext';

const HintsAndGuesses: React.FC = () => {
  const [gameState] = useGameState();
  const headline = useHeadline();
  const wrongGuesses = getWrongGuesses(gameState);
  const reversed = wrongGuesses.slice().reverse();
  const showClue = gameState.actions?.find(a => a === Hint.CLUE) && !gameState.completedAt;
  return (
    <>
      {showClue && (
        <div className="mt-4 w-full max-w-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
            {headline.hint}
          </div>
        </div>
      )}
      <div className="mt-4 w-full max-w-md">
        {gameState.completedAt ? null : (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {wrongGuesses.length ? `Guesses: ${wrongGuesses.length}` : null}
          </div>
        )}
        <div className="space-y-2">
          {reversed.map(guess => (
            <div
              key={guess}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded"
            >
              {guess}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HintsAndGuesses;
