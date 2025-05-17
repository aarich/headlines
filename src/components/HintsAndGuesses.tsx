import React from 'react';
import { GameState, Headline } from 'types';
import { getHintsText } from 'lib/ui';

interface Props {
  gameState: GameState;
  headline: Headline;
  isExpert: boolean;
}

const HintsAndGuesses: React.FC<Props> = ({ gameState, headline, isExpert }) => {
  const { wrongGuesses } = gameState;
  const reversed = wrongGuesses.slice().reverse();
  const hintsText = getHintsText(headline, gameState, isExpert);
  const showDot = !!(wrongGuesses.length && hintsText);
  return (
    <>
      {gameState.hints?.clue && (
        <div className="mt-4 w-full max-w-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
            {headline.hint}
          </div>
        </div>
      )}
      <div className="mt-4 w-full max-w-md">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {wrongGuesses.length ? `Guesses: ${wrongGuesses.length}` : null}
          {showDot && <span className="mx-3">•</span>}
          {hintsText && (
            <>
              Hints: <span className="tracking-widest">{hintsText}</span>
            </>
          )}
        </div>
        <div className="space-y-2">
          {reversed.map(wrongGuess => (
            <div
              key={wrongGuess.timestamp}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded"
            >
              {wrongGuess.guess}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HintsAndGuesses;
