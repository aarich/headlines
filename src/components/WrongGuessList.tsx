import React from 'react';
import { WrongGuess } from '../types';

interface WrongGuessListProps {
  guesses: WrongGuess[];
}

const WrongGuessList: React.FC<WrongGuessListProps> = ({ guesses }) => {
  const reversed = guesses.slice().reverse();
  return (
    <>
      {guesses.length > 0 && (
        <div className="mt-4 w-full max-w-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Guesses: {guesses.length}
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
      )}
    </>
  );
};

export default WrongGuessList;
